import test from 'node:test'
import assert from 'node:assert/strict'
import { nativeAgentToolSchemas, nativeAgentToolNames } from '../native-agent-tools.js'

test('tool schemas are unique and object-shaped', () => {
  assert.equal(new Set(nativeAgentToolNames).size, nativeAgentToolNames.length)
  for (const tool of nativeAgentToolSchemas) {
    assert.equal(typeof tool.name, 'string')
    assert.equal(typeof tool.description, 'string')
    assert.equal(tool.parameters.type, 'object')
    assert.equal(tool.parameters.additionalProperties, false)
  }
})

test('destructive tools require path or id', () => {
  const byName = Object.fromEntries(nativeAgentToolSchemas.map((tool) => [tool.name, tool]))
  assert.deepEqual(byName.delete_note.parameters.required, ['path'])
  assert.deepEqual(byName.todo_delete.parameters.required, ['id'])
  assert.deepEqual(byName.rename_note.parameters.required, ['path', 'title'])
})

test('executor maps native names to service methods', async () => {
  const { createNativeToolExecutor } = await import('../native-agent-tools.js')
  const executor = createNativeToolExecutor({
    listNotebooks: async () => ({ notebooks: ['A'] }),
  })
  assert.deepEqual(await executor({ name: 'list_notebooks', args: {} }), { notebooks: ['A'] })
})
