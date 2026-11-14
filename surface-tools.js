import { randomUUID } from 'node:crypto'

const string = (description) => ({ type: 'string', description })
const schema = (name, description, properties, required = []) => ({ name, description, inputSchema: { type: 'object', properties, required, additionalProperties: false } })
const presentation = {
  title: string('简短任务标题，不添加 Agent 正在执行等固定前缀'), body: string('进展、结果或问题正文'),
  state: { type: 'string', enum: ['queued', 'running', 'waiting_user', 'succeeded', 'failed', 'cancelled'], description: '任务状态；多步任务结束时明确设为 succeeded 或 failed' },
  size: { type: 'string', enum: ['small', 'large'], description: '卡片尺寸；同一时间只显示一张大尺寸卡片' },
  options: { type: 'array', items: { type: 'object', properties: { id: string('选项 ID'), label: string('按钮文字') }, required: ['id', 'label'], additionalProperties: false } },
  allowFreeText: { type: 'boolean', description: '等待用户时是否允许自由回复；用户点击回复后放大卡片' },
}
export const surfaceTools = [
  schema('create_surface', '创建任务提示，或复用有效 Surface。返回 surfaceId、eventId 和 attempt，同一任务后续持续携带这些标识。', { ...presentation, surfaceId: string('可选的已有提示 ID；已过期或移除则创建新实例'), requestId: string('用于重复请求去重的唯一标识') }, ['title', 'body']),
  schema('update_surface', '更新同一任务的进展、问题或结果；有效内容更新会重新显示已隐藏的卡片。旧执行不能复活已结束提示。', { ...presentation, surfaceId: string('create_surface 返回的提示 ID'), attempt: { type: 'number', description: '返回的执行尝试编号，防止旧执行覆盖重试' } }, ['surfaceId', 'attempt']),
  schema('get_surface', '读取提示当前状态及用户真实回答；等待不等于同意，工具不能替用户批准写入。', { surfaceId: string('提示 ID') }, ['surfaceId']),
  schema('list_surfaces', '读取活动提示队列，按最后有效更新时间排序。', {}),
  schema('close_surface', '执行中暂时隐藏提示；等待回答时放弃任务；终态提示从队列移除。', { surfaceId: string('提示 ID') }, ['surfaceId']),
]
export function surfaceToolPatch(args, current = {}) {
  const patch = {}
  for (const field of ['title', 'body', 'state', 'size', 'allowFreeText']) if (args[field] !== undefined) patch[field] = args[field]
  if (!['title', 'body', 'state', 'options', 'allowFreeText'].some((key) => Object.hasOwn(args, key))) return patch
  if (args.state && ['succeeded', 'failed', 'cancelled'].includes(args.state)) {
    patch.actions = []; patch.interaction = null; patch.allowFreeText = false
  } else if (['running', 'queued'].includes(args.state)) {
    patch.actions = [{ id: 'cancel', label: '取消任务', type: 'cancel-task' }]
    patch.interaction = null; patch.allowFreeText = false
  } else if (args.state === 'waiting_user' || args.options !== undefined || args.allowFreeText === true || (current.status === 'waiting_user' && !args.state)) {
    const options = Array.isArray(args.options) ? args.options : (current.actions || []).filter((a) => a.type === 'external-answer')
    const freeText = args.allowFreeText !== undefined ? args.allowFreeText === true : current.allowFreeText === true
    const signature = JSON.stringify([args.title ?? current.title, args.body ?? current.body, options.map((o) => ({ id: o.id, label: o.label })), freeText])
    patch.state = 'waiting_user'
    patch.interaction = { id: current.interaction?.signature === signature ? current.interaction.id : randomUUID(), kind: 'external-answer', signature }
    patch.actions = options.map((o) => ({ id: String(o.id), label: String(o.label), type: 'external-answer' }))
    patch.allowFreeText = freeText
  }
  return patch
}
export function callSurfaceTool(store, name, args) {
  if (name === 'list_surfaces') return store.list()
  if (name === 'get_surface') return store.get(args.surfaceId)
  if (name === 'close_surface') return store.close(args.surfaceId)
  if (name === 'create_surface') {
    let restart = false
    let current = {}
    if (args.surfaceId) {
      try { const old = store.get(args.surfaceId); current = old; restart = old.visibility !== 'removed' && ['succeeded', 'failed', 'cancelled'].includes(old.status) } catch { /* new id */ }
    }
    const state = args.state || (args.options !== undefined || args.allowFreeText === true ? 'waiting_user' : restart ? 'running' : current.status || 'running')
    return store.create({ ...surfaceToolPatch({ ...args, state }, current), surfaceId: args.surfaceId, requestId: args.requestId, restart, source: 'mcp', kind: 'mcp' })
  }
  if (name === 'update_surface') return store.update(args.surfaceId, surfaceToolPatch(args, store.get(args.surfaceId)), { attempt: args.attempt })
  throw new Error(`未知提示工具：${name}`)
}
export function surfaceToolResult(value, extra = {}) {
  const surface = value.surface || value
  const metadata = surface.surfaceId ? { surfaceId: surface.surfaceId, eventId: surface.eventId, attempt: surface.attempt, status: surface.status } : {}
  return { content: [{ type: 'text', text: JSON.stringify({ ...value, ...extra }) }], structuredContent: { ...metadata, ...extra } }
}
