import test from 'node:test'
import assert from 'node:assert/strict'
import { createAgentService, agentServiceMethods } from '../agent-service.js'

test('service requires every adapter', () => {
  assert.throws(() => createAgentService({}), /缺少方法/)
})

test('service delegates arguments', async () => {
  const adapters = Object.fromEntries(agentServiceMethods.map((name) => [name, async (args) => ({ name, args })]))
  const service = createAgentService(adapters)
  const out = await service.writeNote({ path: 'A.md' })
  assert.deepEqual(out, { name: 'writeNote', args: { path: 'A.md' } })
})

test('service exposes the executor contract', () => {
  assert.equal(agentServiceMethods.length, 27)
})
