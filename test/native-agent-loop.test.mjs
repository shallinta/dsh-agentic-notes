import test from 'node:test'
import assert from 'node:assert/strict'
import { runNativeToolLoop } from '../native-agent-loop.js'

function fakeLlm(turns) {
  let index = 0
  return {
    stream() {
      const chunks = turns[index++] || []
      return (async function* () { for (const chunk of chunks) yield chunk })()
    },
  }
}

const base = {
  provider: 'test', model: 'fake', tools: [{ name: 'read_note', description: 'read', parameters: {} }],
}

test('text only', async () => {
  const llm = fakeLlm([[{ type: 'text-delta', text: 'hello' }, { type: 'finish', reason: { kind: 'stop' } }]])
  const out = await runNativeToolLoop({ ...base, llm, messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }] })
  assert.equal(out.text, 'hello')
  assert.equal(out.toolCalls, 0)
})

test('split tool arguments and paired result', async () => {
  const calls = []
  const llm = fakeLlm([
    [
      { type: 'tool-call-delta', index: 0, id: 'c1', name: 'read_note', argumentsDelta: '{"path":"A/' },
      { type: 'tool-call-delta', index: 0, argumentsDelta: 'x.md"}' },
      { type: 'finish', reason: { kind: 'tool-call' } },
    ],
    [{ type: 'text-delta', text: 'done' }, { type: 'finish', reason: { kind: 'stop' } }],
  ])
  const out = await runNativeToolLoop({
    ...base, llm, messages: [{ role: 'user', content: [{ type: 'text', text: 'read' }] }],
    executeTool: async (call) => { calls.push(call.args); return 'content' },
  })
  assert.deepEqual(calls, [{ path: 'A/x.md' }])
  assert.equal(out.text, 'done')
  assert.equal(out.messages.filter((message) => message.role === 'tool').length, 1)
  assert.equal(out.messages.find((message) => message.role === 'assistant').source.provider, 'test')
})

test('invalid JSON is a tool error, not execution', async () => {
  let executed = 0
  const llm = fakeLlm([
    [
      { type: 'tool-call-delta', index: 0, id: 'c1', name: 'read_note', argumentsDelta: '{bad' },
      { type: 'finish', reason: { kind: 'tool-call' } },
    ],
    [{ type: 'text-delta', text: 'retry' }, { type: 'finish', reason: { kind: 'stop' } }],
  ])
  const out = await runNativeToolLoop({
    ...base, llm, messages: [{ role: 'user', content: [{ type: 'text', text: 'read' }] }],
    executeTool: async () => { executed += 1; return 'ok' },
  })
  assert.equal(executed, 0)
  assert.equal(out.messages.find((message) => message.role === 'tool').isError, true)
})

test('aborted signal stops before the model call', async () => {
  const controller = new AbortController()
  controller.abort()
  const llm = fakeLlm([[{ type: 'text-delta', text: 'never' }]])
  await assert.rejects(
    runNativeToolLoop({ ...base, llm, signal: controller.signal, messages: [{ role: 'user', content: [] }] }),
    /已取消/,
  )
})

test('schema validation blocks missing required args', async () => {
  let executed = 0
  const tools = [{ name: 'read_note', description: 'read', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false } }]
  const llm = fakeLlm([
    [{ type: 'tool-call-delta', index: 0, id: 'c1', name: 'read_note', argumentsDelta: '{}' }, { type: 'finish', reason: { kind: 'tool-call' } }],
    [{ type: 'text-delta', text: 'retry' }, { type: 'finish', reason: { kind: 'stop' } }],
  ])
  const out = await runNativeToolLoop({
    ...base, tools, llm, messages: [{ role: 'user', content: [] }],
    executeTool: async () => { executed += 1; return 'ok' },
  })
  assert.equal(executed, 0)
  assert.match(out.messages.find((message) => message.role === 'tool').content[0].text, /缺少必填参数/)
})

test('finish tool ends loop without executing other tools', async () => {
  let executed = 0
  const tools = [{ name: 'finish', description: 'finish', parameters: { type: 'object', properties: { reply: { type: 'string' } }, required: ['reply'], additionalProperties: false } }]
  const llm = fakeLlm([[{ type: 'tool-call-delta', index: 0, id: 'c1', name: 'finish', argumentsDelta: '{"reply":"done"}' }, { type: 'finish', reason: { kind: 'tool-call' } }]])
  const out = await runNativeToolLoop({
    ...base, tools, llm, messages: [{ role: 'user', content: [] }],
    executeTool: async () => { executed += 1; return 'bad' },
  })
  assert.equal(out.text, 'done')
  assert.equal(executed, 0)
})

test('awaitable surface stops turn with surface id', async () => {
  const tools = [{ name: 'create_surface', description: 'surface', parameters: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'], additionalProperties: false } }]
  const llm = fakeLlm([[{ type: 'tool-call-delta', index: 0, id: 's1', name: 'create_surface', argumentsDelta: '{"title":"ask"}' }, { type: 'finish', reason: { kind: 'tool-call' } }]])
  const out = await runNativeToolLoop({
    ...base, tools, llm, messages: [{ role: 'user', content: [] }],
    executeTool: async () => ({ surfaceId: 'surface-1', stopTurn: true, awaiting: true }),
  })
  assert.equal(out.waiting, true)
  assert.equal(out.surfaceId, 'surface-1')
})
