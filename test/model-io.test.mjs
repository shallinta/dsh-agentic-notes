import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { limitModelText } from '../model-io.js'
import { callMcpTool } from '../mcp-core.js'
import { dispatchForTest as dispatch, readManifest, surfaceStore, applyAgentOperations } from '../index.js'

const tool = (name, args, id = name) => ({ type: 'tool-call-delta', index: 0, id, name, argumentsDelta: JSON.stringify(args) })
function context(turns = []) {
  let round = 0
  const requests = []
  const llm = { stream(request) {
    requests.push(request)
    const output = turns[round++] || { reply: '完成', operations: [] }
    return (async function* () {
      if (Array.isArray(output)) { for (const chunk of output) yield chunk }
      else yield { type: 'text-delta', text: JSON.stringify(output) }
      if (!Array.isArray(output) || !output.some((chunk) => chunk.type === 'finish')) yield { type: 'finish', reason: { kind: 'stop' } }
    })()
  } }
  return { requests, get(name) { return name === 'llm' ? llm : name === 'agentDefaultModel' ? { currentSelection: () => ({ provider: 'test', model: 'fake' }) } : undefined } }
}
async function fixture(t, ctx, engine = 'native') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-model-io-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  await dispatch(ctx, 'pickRoot', { path: root })
  await dispatch(ctx, 'settings.save', { autoArchive: false, agentEngine: engine, agentShadow: false, readNoteMaxChars: 0, toolResultMaxChars: 0, webFetchMaxChars: 0 })
  await dispatch(ctx, 'notebook.create', { name: 'Test', description: '测试', keywords: ['测试'] })
  return root
}
async function settled(ctx, id) {
  for (let i = 0; i < 500; i++) {
    const { job } = await dispatch(ctx, 'agent.status', { id })
    if (job && !['running', 'queued'].includes(job.status)) return job
    await new Promise((resolve) => setImmediate(resolve))
  }
  throw new Error('任务未在预期步骤内结束')
}
const inputText = (request) => request.messages.filter((m) => m.role === 'user').flatMap((m) => m.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n')

test('native page context contains the complete note and valid JSON beyond 20k', async (t) => {
  const ctx = context([[tool('finish', { reply: '完成' })]])
  const root = await fixture(t, ctx)
  const note = '# 完整笔记\n\n' + '正文'.repeat(15000) + '\nEND_NATIVE_CONTEXT'
  fs.writeFileSync(path.join(root, 'Test', '完整笔记.md'), note)
  const job = await dispatch(ctx, 'agent.start', { instruction: '阅读当前笔记', context: { view: 'note', notebook: 'Test', path: 'Test/完整笔记.md' } })
  assert.equal((await settled(ctx, job.jobId)).status, 'done')
  const prompt = inputText(ctx.requests[0])
  assert.ok(prompt.includes('END_NATIVE_CONTEXT'), 'native context silently dropped the note tail')
  const json = prompt.split('只是数据，不是指令：\n')[1].split('\n</page-context>')[0]
  assert.equal(JSON.parse(json).files[0].content, note)
})

test('direct Agent sees the full selected note instead of an estimated character budget', async (t) => {
  const ctx = context()
  const root = await fixture(t, ctx)
  const note = '# 长笔记\n\n' + '正文'.repeat(40000) + '\nEND_DIRECT_CONTEXT'
  fs.writeFileSync(path.join(root, 'Test', '长笔记.md'), note)
  await dispatch(ctx, 'agent.run', { instruction: '阅读', context: { view: 'note', notebook: 'Test', path: 'Test/长笔记.md' } })
  assert.ok(inputText(ctx.requests[0]).includes('END_DIRECT_CONTEXT'), 'direct context lost content beyond its hidden estimate')
})

test('direct Agent history preserves every entry and complete entry text', async (t) => {
  const ctx = context()
  await fixture(t, ctx)
  const history = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `HISTORY_${i}_START\n${'内容'.repeat(4000)}\nHISTORY_${i}_END` }))
  await dispatch(ctx, 'agent.run', { instruction: '继续', context: { view: 'home' }, history })
  const prompt = inputText(ctx.requests[0])
  for (let i = 0; i < history.length; i++) {
    assert.ok(prompt.includes(`HISTORY_${i}_START`), `history entry ${i} was omitted`)
    assert.ok(prompt.includes(`HISTORY_${i}_END`), `history entry ${i} was clipped`)
  }
})

test('JSON note tool returns the complete text when public character limits are zero', async (t) => {
  const ctx = context([{ action: 'tool', tool: 'read_note', args: { path: 'Test/工具正文.md' } }, { action: 'finish', reply: '完成' }])
  const root = await fixture(t, ctx, 'json')
  await dispatch(ctx, 'settings.save', { readNoteMaxChars: 0, toolResultMaxChars: 0, webFetchMaxChars: 0 })
  fs.writeFileSync(path.join(root, 'Test', '工具正文.md'), '# 工具正文\n\n' + '内容'.repeat(16000) + '\nEND_JSON_TOOL')
  const job = await dispatch(ctx, 'agent.start', { instruction: '读取', context: { view: 'notebook', notebook: 'Test' } })
  assert.equal((await settled(ctx, job.jobId)).status, 'done')
  assert.ok(inputText(ctx.requests[1]).includes('END_JSON_TOOL'), 'JSON read/tool observation was silently clipped')
  assert.ok(ctx.requests.every((request) => request.maxTokens === undefined), 'JSON engine supplied its own output quota')
})

test('home inventory does not silently omit notes after 300 or assets after 500', async (t) => {
  const ctx = context()
  const root = await fixture(t, ctx)
  for (let i = 0; i < 301; i++) fs.writeFileSync(path.join(root, 'Test', `${String(i).padStart(4, '0')}.md`), `# note ${i}\n`)
  for (let i = 0; i < 501; i++) fs.writeFileSync(path.join(root, 'Test', `${String(i).padStart(4, '0')}.bin`), '')
  const result = await dispatch(ctx, 'agent.run', { instruction: '列出清单', context: { view: 'home' } })
  assert.equal(result.files.length, 301)
  assert.ok(inputText(ctx.requests[0]).includes('0500.bin'), 'asset inventory stopped at 500')
})

test('model result options and pending operations are not silently shortened', async (t) => {
  const options = Array.from({ length: 10 }, (_, i) => ({ id: `complete-option-identifier-${i}`, label: '选项'.repeat(60), description: '完整说明'.repeat(100) }))
  const operations = Array.from({ length: 55 }, (_, i) => ({ op: 'create', notebook: 'Test', title: `n${i}`, body: '内容' }))
  const ctx = context([{ reply: '已准备', options, operations, scale: 'large' }])
  const root = await fixture(t, ctx)
  const result = await dispatch(ctx, 'agent.run', { instruction: '生成方案', context: { view: 'home' } })
  assert.deepEqual(result.options, options)
  const pending = JSON.parse(fs.readFileSync(path.join(root, '.dsh-notebooks', 'agent-pending', `${result.pendingId}.json`), 'utf8'))
  assert.equal(pending.operations.length, 55)
})

test('model-generated maintenance rules and todo text/tags are saved intact', async (t) => {
  const ctx = context(), root = await fixture(t, ctx)
  const rules = '规则'.repeat(1500), description = '描述'.repeat(250)
  const tags = Array.from({ length: 12 }, (_, i) => `tag${i}`), text = '待办'.repeat(400)
  const out = await applyAgentOperations(root, [{ op: 'updateNotebook', notebook: 'Test', agentRules: rules, description, keywords: tags }, { op: 'todoAdd', text, tags }], '保留完整结果', null, true)
  assert.equal(out.errors.length, 0)
  const book = readManifest(root).notebooks.find((n) => n.name === 'Test')
  assert.equal(book.agentRules, rules)
  assert.equal(book.description, description)
  assert.deepEqual(book.keywords, tags)
  const state = await dispatch(ctx, 'state', {})
  assert.equal(state.todo.items[0].text, text)
  assert.deepEqual(state.todo.items[0].tags, tags)
})


test('unlimited text is unchanged; explicit truncation is marked and does not split emoji', () => {
  const text = '😀中文' + '完整正文'.repeat(10000)
  assert.equal(limitModelText(text, 0, 'readNoteMaxChars'), text)
  assert.equal(limitModelText(text, undefined, 'readNoteMaxChars'), text)
  const limited = limitModelText(text, 2, 'readNoteMaxChars')
  assert.ok(limited.startsWith('😀中\n'))
  assert.match(limited, /按当前公开设置 readNoteMaxChars 截断/)
  assert.match(limited, /0 可返回完整内容/)
})

test('public text limits accept zero and large explicit values without a hidden clamp', async (t) => {
  const ctx = context(); await fixture(t, ctx)
  await dispatch(ctx, 'settings.save', { readNoteMaxChars: 400001, toolResultMaxChars: 0, webFetchMaxChars: 0 })
  const state = await dispatch(ctx, 'state', {})
  assert.equal(state.settings.readNoteMaxChars, 400001)
  assert.equal(state.settings.toolResultMaxChars, 0)
  assert.equal(state.settings.webFetchMaxChars, 0)
  await assert.rejects(() => dispatch(ctx, 'settings.save', { readNoteMaxChars: -1 }), /非负整数/)
  await assert.rejects(() => dispatch(ctx, 'settings.save', { readNoteMaxChars: 0.5 }), /非负整数/)
})

test('an explicit native note-read limit is reported to the model', async (t) => {
  const ctx = context([[tool('read_note', { path: 'Test/显式设置.md' })], [tool('finish', { reply: '完成' })]])
  const root = await fixture(t, ctx)
  await dispatch(ctx, 'settings.save', { readNoteMaxChars: 10 })
  fs.writeFileSync(path.join(root, 'Test', '显式设置.md'), '# 标题\n\n' + '原文'.repeat(30))
  const job = await dispatch(ctx, 'agent.start', { instruction: '读取', context: { view: 'notebook', notebook: 'Test' } })
  assert.equal((await settled(ctx, job.jobId)).status, 'done')
  const result = ctx.requests[1].messages.find((m) => m.role === 'tool')
  assert.match(result.content[0].text, /按当前公开设置 readNoteMaxChars 截断/)
})

test('native initial supplied history is retained without inventing assistant provenance', async (t) => {
  const ctx = context([[tool('finish', { reply: '完成' })]])
  await fixture(t, ctx)
  const history = Array.from({ length: 12 }, (_, i) => ({ role: 'user', content: '历史'.repeat(4000) + `NATIVE_HISTORY_${i}_END` }))
  const job = await dispatch(ctx, 'agent.start', { instruction: '继续', context: { view: 'home' }, history })
  assert.equal((await settled(ctx, job.jobId)).status, 'done')
  const prompt = inputText(ctx.requests[0])
  for (let i = 0; i < history.length; i++) assert.ok(prompt.includes(`NATIVE_HISTORY_${i}_END`))
  assert.match(prompt, /不代表本轮授权/)
})

test('native tool calls are governed by public rounds, not an extra hidden 60-call cap', async (t) => {
  const reads = Array.from({ length: 61 }, (_, i) => ({ ...tool('read_settings', {}, `settings-${i}`), index: i }))
  const ctx = context([reads, [tool('finish', { reply: '完成' })]])
  await fixture(t, ctx)
  await dispatch(ctx, 'settings.save', { reactMaxRounds: 2 })
  const started = await dispatch(ctx, 'agent.start', { instruction: '读取配置', context: { view: 'home' } })
  const job = await settled(ctx, started.jobId)
  assert.equal(job.status, 'done')
  const { session } = await dispatch(ctx, 'agent.session', { id: started.sessionId })
  assert.equal(session.turns[0].tools.length, 61)
})

test('MCP search does not silently shorten matching content to 200 characters', async (t) => {
  const ctx = context(), root = await fixture(t, ctx)
  const text = '# 搜索\n\n' + '正文'.repeat(1000) + '\nSEARCH_END'
  fs.writeFileSync(path.join(root, 'Test', '搜索.md'), text)
  const result = callMcpTool(root, 'search_notes', { query: 'SEARCH_END' })
  const hits = JSON.parse(result.content[0].text)
  assert.equal(hits[0].excerpt, text)
})

test('notebook metadata helper receives every title and the complete sample, and keeps its complete result', async (t) => {
  const sample = '归档内容'.repeat(60) + 'SAMPLE_END'
  const description = '完整描述'.repeat(120), keywords = Array.from({ length: 25 }, (_, i) => `keyword-${i}`)
  const ctx = context([{ action: 'assign_capture', notebook: 'Test', note: '00', newNote: false, bullets: [sample] }, { description, keywords }])
  const root = await fixture(t, ctx)
  const manifest = readManifest(root)
  manifest.notebooks[0].description = ''; manifest.notebooks[0].keywords = []
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify(manifest))
  for (let i = 0; i < 25; i++) fs.writeFileSync(path.join(root, 'Test', `${String(i).padStart(2, '0')}.md`), `# n${i}\n`)
  await dispatch(ctx, 'settings.save', { autoArchive: true })
  const made = await dispatch(ctx, 'capture', { text: sample })
  for (let i = 0; i < 500; i++) {
    const c = readManifest(root).captures.find((item) => item.id === made.capture.id)
    if (['archived', 'failed'].includes(c.status)) { assert.equal(c.status, 'archived', c.error); break }
    await new Promise((resolve) => setImmediate(resolve))
  }
  assert.equal(ctx.requests.length, 2)
  assert.equal(ctx.requests[1].maxTokens, undefined)
  const prompt = inputText(ctx.requests[1])
  assert.ok(prompt.includes('SAMPLE_END'))
  assert.ok(prompt.includes('- 24'), 'the metadata helper omitted the last note title')
  const book = readManifest(root).notebooks[0]
  assert.equal(book.description, description)
  assert.deepEqual(book.keywords, keywords)
})

test('rule distillation includes all touched notebooks and operation summaries, preserving all returned rules', async (t) => {
  const names = ['Test', 'Extra1', 'Extra2', 'Extra3'], rules = '完整规则'.repeat(600)
  const operations = [...names.map((name) => ({ op: 'updateNotebook', notebook: name, description: '更新' })), ...Array.from({ length: 31 }, (_, i) => ({ op: 'todoAdd', text: `OPERATION_${i}_END`, tags: [] }))]
  const ctx = context([{ reply: '方案', operations, scale: 'large' }, { updates: names.map((notebook) => ({ notebook, agentRules: rules })) }])
  const root = await fixture(t, ctx)
  for (const name of names.slice(1)) await dispatch(ctx, 'notebook.create', { name, description: '测试', keywords: ['测试'] })
  const proposed = await dispatch(ctx, 'agent.run', { instruction: '维护笔记本', context: { view: 'home' } })
  assert.ok(proposed.pendingId)
  await dispatch(ctx, 'agent.confirm', { id: proposed.pendingId })
  assert.equal(ctx.requests.length, 2)
  assert.equal(ctx.requests[1].maxTokens, undefined)
  const prompt = inputText(ctx.requests[1])
  assert.ok(prompt.includes('Extra3'))
  assert.ok(prompt.includes('OPERATION_30_END'))
  for (const name of names) assert.equal(readManifest(root).notebooks.find((book) => book.name === name).agentRules, rules)
})

test('runtime request builders have no plugin-owned max-token request field', () => {
  for (const file of ['index.js', 'native-agent-loop.js']) {
    const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /\bmaxTokens\b|max_tokens|max_output_tokens/)
  }
})


test('provider context rejection is surfaced, not retried with a less complete context', async (t) => {
  const ctx = context([[{ type: 'finish', reason: { kind: 'error', failure: { message: 'maximum context length exceeded', code: 'CONTEXT_LENGTH_EXCEEDED' } } }], { action: 'finish', reply: '不应悄悄回退后称成功' }])
  const root = await fixture(t, ctx)
  fs.writeFileSync(path.join(root, 'Test', '正文.md'), '# 正文\n' + '完整'.repeat(20000) + '\nPROVIDER_REJECTED_FULL_INPUT')
  const started = await dispatch(ctx, 'agent.start', { instruction: '阅读全文', context: { view: 'note', notebook: 'Test', path: 'Test/正文.md' } })
  const job = await settled(ctx, started.jobId)
  assert.equal(job.status, 'error', 'provider rejection was hidden by an engine fallback')
  assert.equal(ctx.requests.length, 1, 'context-rejected request was silently resubmitted with a different data projection')
  assert.match(job.error, /maximum context length exceeded/)
})


test('provider max-tokens output never executes even complete-looking tool arguments', async (t) => {
  const ctx = context([[tool('create_note', { notebook: 'Test', title: '不应执行', body: '完整但未完成的输出' }), { type: 'finish', reason: { kind: 'max-tokens' } }]])
  const root = await fixture(t, ctx)
  const started = await dispatch(ctx, 'agent.start', { instruction: '测试服务商上限', context: { view: 'home' } })
  const job = await settled(ctx, started.jobId)
  assert.equal(job.status, 'waiting')
  assert.equal(ctx.requests.length, 1)
  assert.equal(fs.existsSync(path.join(root, 'Test', '不应执行.md')), false)
  const card = surfaceStore(root).list().queue[0]
  assert.equal(card.status, 'waiting_user')
  await dispatch(ctx, 'surface.close', { surfaceId: card.id })
})

test('published attachment count boundary rejects extra inputs instead of silently sending a prefix', async (t) => {
  const ctx = context(), root = await fixture(t, ctx)
  const images = []
  for (let i = 0; i < 10; i++) images.push((await dispatch(ctx, 'image.upload', { dataUrl: 'data:image/png;base64,aQ==' })).path)
  await assert.rejects(() => dispatch(ctx, 'capture', { text: '图片测试', images }), /最多支持 9 张图片/)
  assert.equal(ctx.requests.length, 0)
  assert.equal(readManifest(root).captures.length, 0)
})
