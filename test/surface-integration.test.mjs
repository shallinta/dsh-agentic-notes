import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { dispatchForTest as dispatch, surfaceStore, readManifest, callHttpMcpTool } from '../index.js'

function context(turns = []) {
  let count = 0
  const llm = { stream(request) {
    const value = turns[count++]
    return (async function* () {
      if (typeof value === 'function') yield* value(request)
      else if (Array.isArray(value)) { for (const chunk of value) yield chunk }
      else { yield { type: 'text-delta', text: typeof value === 'string' ? value : JSON.stringify(value || { action: 'finish', reply: '完成' }) }; yield { type: 'finish', reason: { kind: 'stop' } } }
    })()
  } }
  return { get(name) { return name === 'llm' ? llm : name === 'agentDefaultModel' ? { currentSelection: () => ({ provider: 'test', model: 'fake' }) } : undefined } }
}
const tool = (name, args) => [{ type: 'tool-call-delta', index: 0, id: `${name}-call`, name, argumentsDelta: JSON.stringify(args) }, { type: 'finish', reason: { kind: 'tool-call' } }]
async function rootFor(t, ctx) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-surface-integration-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  await dispatch(ctx, 'pickRoot', { path: root })
  await dispatch(ctx, 'settings.save', { autoArchive: true, agentEngine: 'native', agentShadow: false })
  await dispatch(ctx, 'notebook.create', { name: 'Test', description: '测试笔记', keywords: ['测试'] })
  return root
}
async function until(fn) {
  for (let i = 0; i < 200; i++) { const value = await fn(); if (value) return value; await new Promise((resolve) => setImmediate(resolve)) }
  throw new Error('测试任务未在预期步骤内结束')
}

test('capture uses one supplied Surface from recording through archive; retries are idempotent', async (t) => {
  const ctx = context([{ action: 'assign_capture', notebook: 'Test', note: '记录', newNote: true, bullets: ['测试记录'], tags: ['测试'], summary: '测试' }])
  const root = await rootFor(t, ctx)
  const requestId = 'capture-request'
  const { surface } = await dispatch(ctx, 'surface.create', { requestId, kind: 'capture', state: 'running', title: '正在记录日记' })
  const first = await dispatch(ctx, 'capture', { requestId, surfaceId: surface.id, text: '测试记录' })
  await until(() => readManifest(root).captures.find((c) => c.id === first.capture.id)?.status === 'archived')
  const second = await dispatch(ctx, 'capture', { requestId, surfaceId: surface.id, text: '测试记录' })
  assert.equal(first.capture.id, second.capture.id)
  assert.equal(readManifest(root).captures.length, 1)
  const queue = surfaceStore(root).list().queue
  assert.equal(queue.length, 1)
  assert.equal(queue[0].id, surface.id)
  assert.equal(queue[0].status, 'succeeded')
  assert.equal(queue[0].target.captureId, first.capture.id)
  assert.equal(fs.existsSync(path.join(root, 'Test', '记录.md')), true)
})

test('native question, user reply and assistant followup retain session and Surface', async (t) => {
  const ctx = context([tool('create_surface', { title: '选择方式', body: '选哪一种？', options: [{ id: 'one', label: '方案一' }], awaitResponse: true, allowFreeText: true }), tool('finish', { reply: '已按方案一处理' })])
  const root = await rootFor(t, ctx)
  const { surface } = await dispatch(ctx, 'surface.create', { requestId: 'agent-request', kind: 'agent', state: 'running', title: '整理测试' })
  const started = await dispatch(ctx, 'agent.start', { requestId: 'agent-request', surfaceId: surface.id, instruction: '整理测试', context: { view: 'home' } })
  const waiting = await until(() => { const s = surfaceStore(root).get(surface.id); return s.status === 'waiting_user' && s })
  assert.equal(waiting.target.jobId, started.jobId)
  await dispatch(ctx, 'surface.action', { surfaceId: surface.id, actionId: 'one', interactionId: waiting.interaction.id, attempt: waiting.attempt, requestId: 'answer-once' })
  const done = await until(() => { const s = surfaceStore(root).get(surface.id); return s.status === 'succeeded' && s })
  assert.equal(done.sessionId, started.sessionId)
  assert.match(done.body, /方案一/)
  assert.equal(surfaceStore(root).list().queue.length, 1)
  const detail = await dispatch(ctx, 'agent.session', { id: started.sessionId })
  assert.equal(detail.session.turns.length, 2)
  assert.equal(detail.session.turns[0].answer.label, '方案一')
})

test('closing native waiting card cancels task instead of submitting an answer', async (t) => {
  const ctx = context([tool('create_surface', { title: '需要回答', body: '继续？', options: [{ id: 'go', label: '继续' }], awaitResponse: true })])
  const root = await rootFor(t, ctx)
  const started = await dispatch(ctx, 'agent.start', { instruction: '测试关闭', context: { view: 'home' } })
  const waiting = await until(() => surfaceStore(root).list().queue.find((s) => s.status === 'waiting_user'))
  await dispatch(ctx, 'surface.close', { surfaceId: waiting.id })
  assert.equal(surfaceStore(root).get(waiting.id).status, 'cancelled')
  const status = await dispatch(ctx, 'agent.status', { id: started.jobId })
  assert.equal(status.job.status, 'cancelled')
})

test('MCP propagates Surface identity; explicit tasks span multiple business calls', async (t) => {
  const ctx = context()
  const root = await rootFor(t, ctx)
  const created = await callHttpMcpTool(root, 'create_surface', { title: 'MCP 多步任务', body: '开始' }, ctx)
  const card = JSON.parse(created.content[0].text)
  const wrote = await callHttpMcpTool(root, 'create_note', { surfaceId: card.id, notebook: 'Test', title: 'MCP', body: '内容' }, ctx)
  assert.equal(wrote.structuredContent.surfaceId, card.id)
  assert.equal(surfaceStore(root).get(card.id).status, 'running')
  await callHttpMcpTool(root, 'update_surface', { surfaceId: card.id, attempt: card.attempt, state: 'succeeded', title: '完成', body: '已写入' }, ctx)
  surfaceStore(root).close(card.id)
  const next = await callHttpMcpTool(root, 'create_note', { surfaceId: card.id, notebook: 'Test', title: '第二篇', body: '内容' }, ctx)
  assert.notEqual(next.structuredContent.surfaceId, card.id)
  assert.equal(surfaceStore(root).get(card.id).visibility, 'removed')
})


test('native round limit asks on the same card and continues in the same session', async (t) => {
  const ctx = context([tool('list_notebooks', {}), tool('finish', { reply: '继续后完成' })])
  const root = await rootFor(t, ctx)
  await dispatch(ctx, 'settings.save', { reactMaxRounds: 1 })
  const job = await dispatch(ctx, 'agent.start', { instruction: '处理笔记本', context: { view: 'home' } })
  const waiting = await until(() => surfaceStore(root).list().queue.find((s) => s.status === 'waiting_user'))
  assert.match(waiting.title, /继续/)
  await dispatch(ctx, 'surface.action', { surfaceId: waiting.id, actionId: 'continue', interactionId: waiting.interaction.id, attempt: waiting.attempt })
  const result = await until(() => surfaceStore(root).list().queue.find((s) => s.status === 'succeeded'))
  assert.equal(result.id, waiting.id)
  assert.equal(result.sessionId, job.sessionId)
  await dispatch(ctx, 'settings.save', { reactMaxRounds: 20 })
})

test('pending write review is the original card and confirmation commits once', async (t) => {
  const ctx = context([tool('create_note', { notebook: 'Test', title: '长文', body: '字'.repeat(600) }), tool('finish', { reply: '已准备方案' })])
  const root = await rootFor(t, ctx)
  const job = await dispatch(ctx, 'agent.start', { instruction: '创建长文', context: { view: 'home' } })
  const waiting = await until(() => surfaceStore(root).list().queue.find((s) => s.status === 'waiting_confirmation'))
  assert.equal(waiting.target.jobId, job.jobId)
  assert.equal(fs.existsSync(path.join(root, 'Test', '长文.md')), false)
  const approved = await dispatch(ctx, 'surface.action', { surfaceId: waiting.id, actionId: 'confirm', interactionId: waiting.interaction.id, attempt: waiting.attempt })
  assert.equal(fs.existsSync(path.join(root, 'Test', '长文.md')), true)
  assert.equal(surfaceStore(root).get(waiting.id).status, 'succeeded')
  assert.equal(surfaceStore(root).list().queue.length, 1)
  const writtenAt = fs.statSync(path.join(root, 'Test', '长文.md')).mtimeMs
  const replayed = await dispatch(ctx, 'surface.action', { surfaceId: waiting.id, actionId: 'confirm', interactionId: waiting.interaction.id, attempt: waiting.attempt })
  assert.equal(replayed.outcome.runId, approved.outcome.runId)
  assert.equal(fs.statSync(path.join(root, 'Test', '长文.md')).mtimeMs, writtenAt)
})

test('MCP repeat request returns recorded result without executing the write twice', async (t) => {
  const ctx = context(), root = await rootFor(t, ctx)
  const args = { requestId: 'write-once', notebook: 'Test', title: '一次', body: '内容' }
  const first = await callHttpMcpTool(root, 'create_note', args, ctx)
  const second = await callHttpMcpTool(root, 'create_note', args, ctx)
  assert.deepEqual(second, first)
  await assert.rejects(() => callHttpMcpTool(root, 'create_note', { ...args, body: '另一份内容' }, ctx), /不同操作/)
  const files = fs.readdirSync(path.join(root, 'Test')).filter((name) => name.endsWith('.md'))
  assert.deepEqual(files, ['一次.md'])
})

test('MCP notify keeps a running task active and rejects unknown-root Surface ids', async (t) => {
  const ctx = context(), root = await rootFor(t, ctx)
  const created = await callHttpMcpTool(root, 'create_surface', { title: '外部任务', body: '开始' }, ctx)
  const id = created.structuredContent.surfaceId
  const notified = await callHttpMcpTool(root, 'notify', { surfaceId: id, title: '外部任务', body: '下一阶段' }, ctx)
  assert.equal(notified.structuredContent.surfaceId, id)
  assert.equal(surfaceStore(root).get(id).status, 'running')
  await assert.rejects(() => callHttpMcpTool(root, 'create_note', { surfaceId: 'other-root-id', notebook: 'Test', title: '不应创建', body: 'x' }, ctx), /不属于/)
  assert.equal(fs.existsSync(path.join(root, 'Test', '不应创建.md')), false)
})

test('historical capture and adjustment cancellation preserve archived data', async (t) => {
  const ctx = context([{ action: 'assign_capture', notebook: 'Test', note: '历史', newNote: true, bullets: ['记录'], tags: [], summary: '摘要' }])
  const root = await rootFor(t, ctx)
  const created = await dispatch(ctx, 'capture', { text: '记录' })
  await until(() => readManifest(root).captures.find((s) => s.id === created.capture.id)?.status === 'archived')
  const history = await dispatch(ctx, 'surface.capture', { captureId: created.capture.id })
  await dispatch(ctx, 'surface.action', { surfaceId: history.surface.id, actionId: 'move', attempt: history.surface.attempt })
  const adjusting = surfaceStore(root).get(history.surface.id)
  assert.equal(adjusting.status, 'waiting_user')
  await dispatch(ctx, 'surface.close', { surfaceId: history.surface.id })
  assert.equal(readManifest(root).captures.find((s) => s.id === created.capture.id).status, 'archived')
  assert.equal(fs.existsSync(path.join(root, 'Test', '历史.md')), true)
})


test('JSON Agent uses the same question/reply lifecycle as the native engine', async (t) => {
  const ctx = context([{ action: 'ask_user', title: '选择处理方式', question: '请选择', options: [{ id: 'a', label: '方案A' }] }, { action: 'finish', reply: 'JSON已完成' }])
  const root = await rootFor(t, ctx)
  await dispatch(ctx, 'settings.save', { agentEngine: 'json' })
  const job = await dispatch(ctx, 'agent.start', { instruction: '测试JSON', context: { view: 'home' } })
  const q = await until(() => surfaceStore(root).list().queue.find((s) => s.status === 'waiting_user'))
  await dispatch(ctx, 'surface.action', { surfaceId: q.id, actionId: 'a', interactionId: q.interaction.id, attempt: q.attempt })
  const result = await until(() => surfaceStore(root).list().queue.find((s) => s.status === 'succeeded'))
  assert.equal(result.id, q.id)
  assert.equal(result.sessionId, job.sessionId)
  assert.match(result.body, /JSON已完成/)
})

test('closing a running task hides it; its result reappears without cancellation', async (t) => {
  let release
  const gate = new Promise((resolve) => { release = resolve })
  const ctx = context([async function* () { await gate; yield* tool('finish', { reply: '完成后重新显示' }) }])
  const root = await rootFor(t, ctx)
  await dispatch(ctx, 'agent.start', { instruction: '运行中隐藏', context: { view: 'home' } })
  const first = surfaceStore(root).list().queue[0]
  await dispatch(ctx, 'surface.close', { surfaceId: first.id, attempt: first.attempt, revision: first.revision })
  assert.equal(surfaceStore(root).list().queue.length, 0)
  release()
  const done = await until(() => surfaceStore(root).list().queue.find((s) => s.status === 'succeeded'))
  assert.equal(done.id, first.id)
})

test('explicit cancellation blocks a late model write', async (t) => {
  let release
  const gate = new Promise((resolve) => { release = resolve })
  const ctx = context([async function* () { await gate; yield* tool('create_note', { notebook: 'Test', title: '不可写入', body: 'late' }) }])
  const root = await rootFor(t, ctx)
  const job = await dispatch(ctx, 'agent.start', { instruction: '执行中取消', context: { view: 'home' } })
  const first = surfaceStore(root).list().queue[0]
  await dispatch(ctx, 'surface.cancel', { surfaceId: first.id })
  release()
  await until(async () => (await dispatch(ctx, 'agent.status', { id: job.jobId })).job.status === 'cancelled')
  assert.equal(fs.existsSync(path.join(root, 'Test', '不可写入.md')), false)
  assert.equal(surfaceStore(root).get(first.id).status, 'cancelled')
})


test('MCP repeated question is a no-op and terminal updates clear question controls', async (t) => {
  const ctx = context(), root = await rootFor(t, ctx)
  const input = { title: '提问', body: '怎么做？', state: 'waiting_user', options: [{ id: 'a', label: 'A' }] }
  const created = await callHttpMcpTool(root, 'create_surface', input, ctx)
  const a = JSON.parse(created.content[0].text)
  const updated = await callHttpMcpTool(root, 'update_surface', { ...input, surfaceId: a.id, attempt: a.attempt }, ctx)
  const b = JSON.parse(updated.content[0].text)
  assert.equal(a.interaction.id, b.interaction.id)
  assert.equal(a.sequence, b.sequence)
  await callHttpMcpTool(root, 'update_surface', { surfaceId: a.id, attempt: a.attempt, state: 'succeeded', options: [], body: '完成' }, ctx)
  assert.equal(surfaceStore(root).get(a.id).status, 'succeeded')
  assert.deepEqual(surfaceStore(root).get(a.id).actions, [])
})

test('MCP business request with stale attempt does not write into a retried task', async (t) => {
  const ctx = context(), root = await rootFor(t, ctx)
  const first = surfaceStore(root).create({ state: 'failed', source: 'mcp' })
  const retry = surfaceStore(root).create({ surfaceId: first.id, restart: true, state: 'running' })
  assert.equal(retry.attempt, 2)
  await assert.rejects(() => callHttpMcpTool(root, 'create_note', { surfaceId: first.id, attempt: first.attempt, notebook: 'Test', title: '旧任务', body: 'no' }, ctx), /旧执行/)
  assert.equal(fs.existsSync(path.join(root, 'Test', '旧任务.md')), false)
})


test('external running task has explicit cancellation without treating hide as cancellation', async (t) => {
  const ctx = context(), root = await rootFor(t, ctx)
  const made = await callHttpMcpTool(root, 'create_surface', { title: '外部处理', body: '进展' }, ctx)
  const card = JSON.parse(made.content[0].text)
  assert.equal(card.status, 'running')
  assert.ok(card.actions.some((a) => a.type === 'cancel-task'))
  await dispatch(ctx, 'surface.close', { surfaceId: card.id })
  assert.equal(surfaceStore(root).get(card.id).visibility, 'hidden')
  assert.equal(surfaceStore(root).get(card.id).status, 'running')
})


test('MCP size-only update preserves an internal confirmation interaction', async (t) => {
  const ctx = context(), root = await rootFor(t, ctx)
  const a = surfaceStore(root).create({ state: 'waiting_confirmation', interaction: { id: 'native-confirm', kind: 'confirm' }, actions: [{ id: 'confirm', type: 'confirm', label: '确认执行', pendingId: 'p' }] })
  await callHttpMcpTool(root, 'update_surface', { surfaceId: a.id, attempt: a.attempt, size: 'large' }, ctx)
  const b = surfaceStore(root).get(a.id)
  assert.equal(b.interaction.id, a.interaction.id)
  assert.equal(b.actions[0].type, 'confirm')
  assert.equal(b.sequence, a.sequence)
  assert.equal(b.size, 'large')
})


test('MCP free-text reply does not require an internal Agent session', async (t) => {
  const ctx = context(), root = await rootFor(t, ctx)
  const made = await callHttpMcpTool(root, 'create_surface', { title: 'MCP自由回复', body: '请回复', state: 'waiting_user', allowFreeText: true, options: [] }, ctx)
  const card = JSON.parse(made.content[0].text)
  assert.equal(card.sessionId, '')
  const out = await dispatch(ctx, 'surface.action', { surfaceId: card.id, actionId: 'reply', interactionId: card.interaction.id, attempt: card.attempt, text: '测试通过' })
  assert.equal(out.ok, true)
  const observed = await callHttpMcpTool(root, 'get_surface', { surfaceId: card.id }, ctx)
  const answered = JSON.parse(observed.content[0].text)
  assert.equal(answered.status, 'running')
  assert.equal(answered.response.text, '测试通过')
  assert.equal(answered.sessionId, '')
  assert.equal(surfaceStore(root).list().queue.length, 1)
})


test('Agent result-card free-text followup still resumes its original session', async (t) => {
  const ctx = context([tool('finish', { reply: '第一轮结果' }), tool('finish', { reply: '追问结果' })])
  const root = await rootFor(t, ctx)
  const started = await dispatch(ctx, 'agent.start', { instruction: '第一轮', context: { view: 'home' } })
  const first = await until(() => surfaceStore(root).list().queue.find((s) => s.status === 'succeeded'))
  assert.equal(first.interaction, null)
  await dispatch(ctx, 'surface.action', { surfaceId: first.id, actionId: 'reply', attempt: first.attempt, text: '继续解释' })
  const second = await until(() => { const s = surfaceStore(root).get(first.id); return s.status === 'succeeded' && s.attempt === 2 && s })
  assert.equal(second.sessionId, started.sessionId)
  assert.match(second.body, /追问结果/)
  assert.equal(surfaceStore(root).list().queue.length, 1)
})

test('external option reply uses the same delivery path without creating an Agent session', async (t) => {
  const ctx = context(), root = await rootFor(t, ctx)
  const made = await callHttpMcpTool(root, 'create_surface', { title: '外部选项', body: '请选择', state: 'waiting_user', options: [{ id: 'yes', label: '切换正常' }] }, ctx)
  const card = JSON.parse(made.content[0].text)
  await dispatch(ctx, 'surface.action', { surfaceId: card.id, actionId: 'yes', interactionId: card.interaction.id, attempt: card.attempt })
  const result = surfaceStore(root).get(card.id)
  assert.equal(result.status, 'running')
  assert.equal(result.response.label, '切换正常')
  assert.equal(result.sessionId, '')
})


test('capture classification respects the provider output budget instead of a small caller cap', async (t) => {
  const requests = []
  const plan = { action: 'assign_capture', notebook: 'Test', note: '预算测试', newNote: true, bullets: ['测试记录'], tags: [], summary: '测试' }
  const respond = async function* (request) {
    requests.push(request)
    // Models count reasoning in their output budget too. The provider has a
    // sufficient default; a small caller override truncates before final JSON.
    if (Number.isFinite(request.maxTokens) && request.maxTokens < 16000) {
      yield { type: 'finish', reason: { kind: 'max-tokens' } }
      return
    }
    yield { type: 'text-delta', text: JSON.stringify(plan) }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
  const ctx = context([respond, respond])
  const root = await rootFor(t, ctx)
  const made = await dispatch(ctx, 'capture', { text: '测试记录' })
  const capture = await until(() => { const c = readManifest(root).captures.find((c) => c.id === made.capture.id); return ['archived', 'failed'].includes(c.status) && c })
  assert.equal(capture.status, 'archived', capture.error)
  assert.ok(requests.length)
  assert.ok(requests.every((r) => r.maxTokens === undefined))
  assert.equal(fs.existsSync(path.join(root, 'Test', '预算测试.md')), true)
})


test('capture integration uses the provider budget for its initial request', async (t) => {
  const requests = []
  const respond = async function* (request) {
    requests.push(request)
    if (Number.isFinite(request.maxTokens) && request.maxTokens < 16000) {
      yield { type: 'finish', reason: { kind: 'max-tokens' } }; return
    }
    yield { type: 'text-delta', text: JSON.stringify({ bullet: '完整记录', tags: [], summary: '', needsRewrite: false }) }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
  const ctx = context([{ action: 'finish', notebook: 'Test', note: '整合初次', newNote: true }, respond, respond])
  const root = await rootFor(t, ctx)
  const made = await dispatch(ctx, 'capture', { text: '完整记录' })
  const capture = await until(() => { const c = readManifest(root).captures.find((c) => c.id === made.capture.id); return ['archived', 'failed'].includes(c.status) && c })
  assert.equal(capture.status, 'archived', capture.error)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].maxTokens, undefined)
})

test('capture integration fallback changes the task but does not shrink the output budget', async (t) => {
  const requests = []
  const truncated = async function* (request) { requests.push(request); yield { type: 'finish', reason: { kind: 'max-tokens' } } }
  const compact = async function* (request) {
    requests.push(request)
    if (Number.isFinite(request.maxTokens) && request.maxTokens < 16000) {
      yield { type: 'finish', reason: { kind: 'max-tokens' } }; return
    }
    yield { type: 'text-delta', text: JSON.stringify({ bullet: '完整记录', tags: [], summary: '', needsRewrite: false }) }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
  const ctx = context([{ action: 'finish', notebook: 'Test', note: '整合备用', newNote: true }, truncated, compact])
  const root = await rootFor(t, ctx)
  const made = await dispatch(ctx, 'capture', { text: '完整记录' })
  const capture = await until(() => { const c = readManifest(root).captures.find((c) => c.id === made.capture.id); return ['archived', 'failed'].includes(c.status) && c })
  assert.equal(capture.status, 'archived', capture.error)
  assert.equal(requests.length, 2)
  assert.ok(requests.every((r) => r.maxTokens === undefined))
  assert.match(requests[1].system, /不要返回改写后的全文/)
})

test('provider truncation never writes partial JSON or duplicates the saved diary', async (t) => {
  const truncated = [{ type: 'text-delta', text: '{"action":"assign_capture","notebook":"Test","note":"不可写入","bullets":["partial' }, { type: 'finish', reason: { kind: 'max-tokens' } }]
  const ctx = context([truncated, truncated])
  const root = await rootFor(t, ctx)
  const made = await dispatch(ctx, 'capture', { text: '必须保留的原记录' })
  const capture = await until(() => { const c = readManifest(root).captures.find((c) => c.id === made.capture.id); return c.status === 'failed' && c })
  assert.match(capture.error, /长度上限/)
  assert.equal(fs.existsSync(path.join(root, 'Test', '不可写入.md')), false)
  const diary = fs.readFileSync(path.join(root, capture.diaryDoc), 'utf8')
  assert.equal((diary.match(/必须保留的原记录/g) || []).length, 1)
  assert.equal(surfaceStore(root).get(capture.surfaceId).status, 'failed')
})


test('capture classification fallback also leaves output budgeting to the provider', async (t) => {
  let fallbackRequest
  const respond = async function* (request) {
    fallbackRequest = request
    if (Number.isFinite(request.maxTokens)) { yield { type: 'finish', reason: { kind: 'max-tokens' } }; return }
    yield { type: 'text-delta', text: JSON.stringify({ notebook: 'Test', note: '备用归类', newNote: true, bullets: ['完整记录'], tags: [], summary: '' }) }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
  const ctx = context([[{ type: 'finish', reason: { kind: 'error', failure: { message: '第一种分类未完成' } } }], respond])
  const root = await rootFor(t, ctx)
  const made = await dispatch(ctx, 'capture', { text: '完整记录' })
  const capture = await until(() => { const c = readManifest(root).captures.find((c) => c.id === made.capture.id); return ['archived', 'failed'].includes(c.status) && c })
  assert.equal(capture.status, 'archived', capture.error)
  assert.equal(fallbackRequest.maxTokens, undefined)
})

test('retry after provider truncation reuses the saved capture and Surface without a second diary entry', async (t) => {
  const truncated = [{ type: 'finish', reason: { kind: 'max-tokens' } }]
  const ctx = context([truncated, truncated, { action: 'assign_capture', notebook: 'Test', note: '重试归档', newNote: true, bullets: ['保留一次的记录'], tags: [], summary: '' }])
  const root = await rootFor(t, ctx)
  const made = await dispatch(ctx, 'capture', { text: '保留一次的记录' })
  const failed = await until(() => { const c = readManifest(root).captures.find((c) => c.id === made.capture.id); return c.status === 'failed' && c })
  const card = surfaceStore(root).get(failed.surfaceId)
  await dispatch(ctx, 'surface.action', { surfaceId: card.id, actionId: 'retry', attempt: card.attempt })
  const done = await until(() => { const c = readManifest(root).captures.find((c) => c.id === made.capture.id); return c.status === 'archived' && c })
  assert.equal(done.surfaceId, card.id)
  assert.equal(surfaceStore(root).get(card.id).attempt, 2)
  assert.equal(readManifest(root).captures.length, 1)
  const diary = fs.readFileSync(path.join(root, done.diaryDoc), 'utf8')
  assert.equal((diary.match(/保留一次的记录/g) || []).length, 1)
  assert.equal(fs.existsSync(path.join(root, 'Test', '重试归档.md')), true)
})
