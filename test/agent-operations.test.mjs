import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { applyAgentOperations } from '../index.js'

function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-ops-'))
  fs.mkdirSync(path.join(root, 'Test'))
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify({ version: 1, notebooks: [{ name: 'Test' }], captures: [], stickies: [], ui: {}, noteOrder: {} }))
  fs.writeFileSync(path.join(root, 'Test', 'a.md'), '# a\n')
  return root
}

test('destructive operation requires confirmation', async () => {
  const root = tempRoot()
  await assert.rejects(() => applyAgentOperations(root, [{ op: 'delete', path: 'Test/a.md' }], 'test'), /必须先确认/)
  assert.equal(fs.existsSync(path.join(root, 'Test/a.md')), true)
  fs.rmSync(root, { recursive: true, force: true })
})

test('create collision is rejected without overwriting', async () => {
  const root = tempRoot()
  fs.writeFileSync(path.join(root, 'Test', 'same.md'), '# same\n')
  const out = await applyAgentOperations(root, [{ op: 'create', notebook: 'Test', title: 'same', body: 'x' }], 'test', null, true)
  assert.equal(out.errors.length, 1)
  assert.match(out.errors[0], /同名笔记已存在/)
  assert.equal(fs.readFileSync(path.join(root, 'Test', 'same.md'), 'utf8'), '# same\n')
  fs.rmSync(root, { recursive: true, force: true })
})
