// Tool declarations for the future DSH-native agent loop.
// These are declarations only: the current JSON ReAct engine still owns execution.

const object = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false })
const string = (description) => ({ type: 'string', description })

export const nativeAgentToolSchemas = [
  { name: 'list_notebooks', description: '列出当前笔记库的笔记本。', parameters: object({}) },
  { name: 'list_notes', description: '列出某个笔记本里的笔记。', parameters: object({ notebook: string('笔记本名称') }, ['notebook']) },
  { name: 'read_note', description: '读取一篇笔记的 Markdown 内容。', parameters: object({ path: string('相对根目录的笔记路径') }, ['path']) },
  { name: 'read_todo', description: '读取待办列表。', parameters: object({}) },
  { name: 'read_stickies', description: '读取便笺。', parameters: object({}) },
  { name: 'read_settings', description: '读取随记设置。', parameters: object({}) },
  { name: 'web_fetch', description: '获取公开网页的正文文本。', parameters: object({ url: string('http 或 https URL') }, ['url']) },
  { name: 'create_note', description: '在指定笔记本新建笔记。', parameters: object({ notebook: string('笔记本名称'), title: string('笔记标题'), body: string('Markdown 正文') }, ['notebook', 'title', 'body']) },
  { name: 'write_note', description: '写入已有笔记的完整内容。', parameters: object({ path: string('笔记路径'), content: string('完整 Markdown') }, ['path', 'content']) },
  { name: 'rename_note', description: '重命名笔记。', parameters: object({ path: string('笔记路径'), title: string('新标题') }, ['path', 'title']) },
  { name: 'move_note', description: '移动笔记到另一个笔记本。', parameters: object({ path: string('笔记路径'), notebook: string('目标笔记本'), title: string('可选新标题') }, ['path', 'notebook']) },
  { name: 'delete_note', description: '删除单篇笔记，默认可直接执行；一次删除多篇需要确认。', parameters: object({ path: string('笔记路径') }, ['path']) },
  { name: 'update_frontmatter', description: '更新笔记的 tags、summary 等 frontmatter。', parameters: object({ path: string('笔记路径'), set: { type: 'object' }, unset: { type: 'array', items: { type: 'string' } } }, ['path']) },
  { name: 'todo_add', description: '新增待办。', parameters: object({ text: string('待办内容'), tags: { type: 'array', items: { type: 'string' } } }, ['text']) },
  { name: 'todo_update', description: '更新待办。', parameters: object({ id: string('待办 ID'), text: string('新内容'), tags: { type: 'array', items: { type: 'string' } }, done: { type: 'boolean' } }, ['id']) },
  { name: 'todo_delete', description: '删除待办。', parameters: object({ id: string('待办 ID') }, ['id']) },
  { name: 'memo_create', description: '新建便笺。', parameters: object({ items: { type: 'array', items: { type: 'string' } }, color: string('颜色') }, ['items']) },
  { name: 'memo_update', description: '更新便笺。', parameters: object({ id: string('便笺 ID'), items: { type: 'array', items: { type: 'string' } }, color: string('颜色') }, ['id']) },
  { name: 'memo_delete', description: '删除便笺。', parameters: object({ id: string('便笺 ID') }, ['id']) },
  { name: 'settings_update', description: '修改随记设置。', parameters: object({ set: { type: 'object' } }, ['set']) },
  { name: 'set_privacy', description: '开关首页隐私模式。', parameters: object({ enabled: { type: 'boolean' } }, ['enabled']) },
  {
    name: 'stage_operations',
    description: '暂存一组操作；仅长笔记、批量删除/移动需要用户确认。',
    parameters: object({
      operations: {
        type: 'array',
        items: object({
          op: { type: 'string', enum: ['write', 'create', 'rename', 'move', 'delete', 'frontmatter', 'todoAdd', 'todoUpdate', 'todoDelete', 'memoCreate', 'memoUpdate', 'memoDelete', 'settingsUpdate', 'setPrivacyMode'] },
          path: string('相对路径，适用于 write/rename/move/delete/frontmatter'),
          content: string('完整内容，适用于 write'),
          notebook: string('笔记本名称，适用于 create/move'),
          title: string('标题，适用于 create/rename/move'),
          body: string('正文，适用于 create'),
          id: string('待办或便笺 ID'),
          text: string('待办文本'),
          tags: { type: 'array', items: { type: 'string' } },
          done: { type: 'boolean' },
          items: { type: 'array', items: { type: 'string' } },
          color: string('便笺颜色'),
          set: { type: 'object' },
          unset: { type: 'array', items: { type: 'string' } },
        }, ['op']),
      },
    }, ['operations']),
  },
  { name: 'apply_operations', description: '提交一组操作；服务端会按统一规则决定是否直接执行或转待确认。', parameters: object({ operations: { type: 'array', items: { type: 'object' } } }, ['operations']) },
  { name: 'create_surface', description: '创建进度、问题或确认提示。', parameters: object({ type: { type: 'string', enum: ['toast', 'modal'] }, title: string('标题'), body: string('正文'), kind: string('progress/question/confirm'), options: { type: 'array', items: { type: 'object' } }, allowFreeText: { type: 'boolean' }, awaitResponse: { type: 'boolean' } }, ['type', 'title', 'body']) },
  { name: 'update_surface', description: '更新当前会话的提示内容。', parameters: object({ surfaceId: string('surface ID'), title: string('标题'), body: string('正文'), options: { type: 'array', items: { type: 'object' } }, kind: string('提示类型') }, ['surfaceId']) },
  { name: 'close_surface', description: '关闭当前会话的提示。', parameters: object({ surfaceId: string('surface ID') }, ['surfaceId']) },
  { name: 'finish', description: '结束当前轮次并给用户结果。', parameters: object({ reply: string('给用户看的结果') }, ['reply']) },
]

export const nativeAgentToolNames = nativeAgentToolSchemas.map((tool) => tool.name)

export function createNativeToolExecutor(service) {
  const call = (name, args) => service[name](args)
  return async ({ name, args }) => {
    const handlers = {
      list_notebooks: () => call('listNotebooks', args),
      list_notes: () => call('listNotes', args),
      read_note: () => call('readNote', args),
      read_todo: () => call('readTodo', args),
      read_stickies: () => call('readStickies', args),
      read_settings: () => call('readSettings', args),
      web_fetch: () => call('webFetch', args),
      create_note: () => call('createNote', args),
      write_note: () => call('writeNote', args),
      rename_note: () => call('renameNote', args),
      move_note: () => call('moveNote', args),
      delete_note: () => call('deleteNote', args),
      update_frontmatter: () => call('updateFrontmatter', args),
      todo_add: () => call('todoAdd', args),
      todo_update: () => call('todoUpdate', args),
      todo_delete: () => call('todoDelete', args),
      memo_create: () => call('memoCreate', args),
      memo_update: () => call('memoUpdate', args),
      memo_delete: () => call('memoDelete', args),
      settings_update: () => call('settingsUpdate', args),
      set_privacy: () => call('setPrivacy', args),
      stage_operations: () => call('stageOperations', args),
      apply_operations: () => call('applyOperations', args),
      create_surface: () => call('createSurface', args),
      update_surface: () => call('updateSurface', args),
      close_surface: () => call('closeSurface', args),
    }
    const handler = handlers[name]
    if (!handler) throw new Error(`未知工具：${name}`)
    const result = await handler()
    return result === undefined ? { ok: true } : result
  }
}
