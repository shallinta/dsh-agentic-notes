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

test('delete writes tombstone and create clears it', async () => {
  const root = tempRoot()
  const out = await applyAgentOperations(root, [{ op: 'delete', path: 'Test/a.md' }], 'test', null, true)
  assert.equal(out.errors.length, 0)
  let manifest = JSON.parse(fs.readFileSync(path.join(root, '.dsh-notebooks.json'), 'utf8'))
  assert.ok(manifest.deletedNotes?.['Test/a.md'])
  const created = await applyAgentOperations(root, [{ op: 'create', notebook: 'Test', title: 'a', body: 'new' }], 'test', null, true)
  assert.equal(created.errors.length, 0)
  manifest = JSON.parse(fs.readFileSync(path.join(root, '.dsh-notebooks.json'), 'utf8'))
  assert.equal(manifest.deletedNotes?.['Test/a.md'], undefined)
  fs.rmSync(root, { recursive: true, force: true })
})

test('concurrent writes serialize and keep both results', async () => {
  const root = tempRoot()
  const [a, b] = await Promise.all([
    applyAgentOperations(root, [{ op: 'create', notebook: 'Test', title: 'one', body: '1' }], 'one', null, true),
    applyAgentOperations(root, [{ op: 'create', notebook: 'Test', title: 'two', body: '2' }], 'two', null, true),
  ])
  assert.equal(a.errors.length, 0)
  assert.equal(b.errors.length, 0)
  assert.equal(fs.existsSync(path.join(root, 'Test', 'one.md')), true)
  assert.equal(fs.existsSync(path.join(root, 'Test', 'two.md')), true)
  fs.rmSync(root, { recursive: true, force: true })
})

test('applied create can be undone by run id', async () => {
  const root = tempRoot()
  const out = await applyAgentOperations(root, [{ op: 'create', notebook: 'Test', title: 'undo-me', body: 'x' }], 'test', null, true)
  assert.equal(out.errors.length, 0)
  assert.equal(fs.existsSync(path.join(root, 'Test', 'undo-me.md')), true)
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.dsh-notebooks.json'), 'utf8'))
  const { undoAgentRun } = await import('../index.js')
  undoAgentRun(root, manifest, out.runId)
  assert.equal(fs.existsSync(path.join(root, 'Test', 'undo-me.md')), false)
  fs.rmSync(root, { recursive: true, force: true })
})

test('partial batch reports errors without hiding them', async () => {
  const root = tempRoot()
  const out = await applyAgentOperations(root, [
    { op: 'create', notebook: 'Test', title: 'ok', body: 'ok' },
    { op: 'delete', path: 'Test/missing.md' },
  ], 'test', null, true)
  assert.equal(out.errors.length, 1)
  assert.match(out.errors[0], /找不到/)
  assert.equal(fs.existsSync(path.join(root, 'Test', 'ok.md')), false)
  fs.rmSync(root, { recursive: true, force: true })
})

test('guard runs before any write', async () => {
  const root = tempRoot()
  await assert.rejects(() => applyAgentOperations(root, [{ op: 'create', notebook: 'Test', title: 'blocked', body: 'x' }], 'test', null, true, () => { throw new Error('cancelled') }), /cancelled/)
  assert.equal(fs.existsSync(path.join(root, 'Test', 'blocked.md')), false)
  fs.rmSync(root, { recursive: true, force: true })
})

test('failed batch restores privacy and config side effects', async () => {
  const root = tempRoot()
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.dsh-notebooks.json'), 'utf8'))
  manifest.ui = { privacyMode: false }
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify(manifest))
  const out = await applyAgentOperations(root, [
    { op: 'setPrivacyMode', enabled: true },
    { op: 'delete', path: 'Test/missing.md' },
  ], 'test', null, true)
  assert.equal(out.errors.length, 1)
  const after = JSON.parse(fs.readFileSync(path.join(root, '.dsh-notebooks.json'), 'utf8'))
  assert.equal(after.ui?.privacyMode, false)
  fs.rmSync(root, { recursive: true, force: true })
})
