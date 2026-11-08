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

test('long note changes require confirmation', async () => {
  const root = tempRoot()
  fs.writeFileSync(path.join(root, 'Test', 'long.md'), `# long\n\n${'字'.repeat(1000)}\n`)
  await assert.rejects(() => applyAgentOperations(root, [{ op: 'write', path: 'Test/long.md', content: '# short\n' }], 'test'), /需要用户确认/)
  assert.match(fs.readFileSync(path.join(root, 'Test', 'long.md'), 'utf8'), /字{1000}/)
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

test('failed batch restores moved note and images', async () => {
  const root = tempRoot()
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.dsh-notebooks.json'), 'utf8'))
  manifest.notebooks.push({ name: 'Target' })
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify(manifest))
  fs.writeFileSync(path.join(root, 'Test', 'a.png'), 'image')
  fs.writeFileSync(path.join(root, 'Test', 'a.md'), '# a\n\n![x](a.png)\n')
  const out = await applyAgentOperations(root, [
    { op: 'move', path: 'Test/a.md', notebook: 'Target' },
    { op: 'delete', path: 'Test/missing.md' },
  ], 'test', null, true)
  assert.equal(out.errors.length, 1)
  assert.equal(fs.existsSync(path.join(root, 'Test', 'a.md')), true)
  assert.equal(fs.existsSync(path.join(root, 'Test', 'a.png')), true)
  assert.equal(fs.existsSync(path.join(root, 'Target', 'a.md')), false)
  fs.rmSync(root, { recursive: true, force: true })
})

test('MCP concurrent writes with the same expected hash have one winner', async () => {
  const crypto = await import('node:crypto')
  const { callHttpMcpTool } = await import('../index.js')
  const root = tempRoot()
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'Test', 'a.md'))).digest('hex')
  const results = await Promise.allSettled([
    callHttpMcpTool(root, 'write_note', { path: 'Test/a.md', content: '# first\n', expectedHash: hash }),
    callHttpMcpTool(root, 'write_note', { path: 'Test/a.md', content: '# second\n', expectedHash: hash }),
  ])
  assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1)
  assert.equal(results.filter((item) => item.status === 'rejected').length, 1)
  fs.rmSync(root, { recursive: true, force: true })
})

test('500 code points triggers confirmation while 499 does not', async () => {
  const root = tempRoot()
  const note = (n) => `# t\n\n${'字'.repeat(n)}\n`
  fs.writeFileSync(path.join(root, 'Test', 'n490.md'), note(490))
  fs.writeFileSync(path.join(root, 'Test', 'n500.md'), note(500))
  const ok = await applyAgentOperations(root, [{ op: 'write', path: 'Test/n490.md', content: note(10) }], 'test')
  assert.equal(ok.errors.length, 0)
  await assert.rejects(() => applyAgentOperations(root, [{ op: 'write', path: 'Test/n500.md', content: note(10) }], 'test'), /需要用户确认/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('two single-note notebook deletes require confirmation together', async () => {
  const root = tempRoot()
  fs.mkdirSync(path.join(root, 'Two'))
  fs.writeFileSync(path.join(root, 'Test', 'b.md'), '# b\n')
  fs.writeFileSync(path.join(root, 'Two', 'c.md'), '# c\n')
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.dsh-notebooks.json'), 'utf8'))
  manifest.notebooks.push({ name: 'Two' })
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify(manifest))
  await assert.rejects(() => applyAgentOperations(root, [
    { op: 'deleteNotebook', notebook: 'Test' },
    { op: 'deleteNotebook', notebook: 'Two' },
  ], 'test'), /需要用户确认/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('duplicate operations are deduped regardless of key order', async () => {
  const root = tempRoot()
  await applyAgentOperations(root, [
    { op: 'todoAdd', text: 'same', tags: ['x'] },
    { tags: ['x'], text: 'same', op: 'todoAdd' },
  ], 'test', null, true)
  const todo = JSON.parse(fs.readFileSync(path.join(root, '便笺', 'todo.json'), 'utf8'))
  assert.equal(todo.items.filter((item) => item.text === 'same').length, 1)
  fs.rmSync(root, { recursive: true, force: true })
})

test('repeated writes to the same path preserve order', async () => {
  const root = tempRoot()
  const out = await applyAgentOperations(root, [
    { op: 'write', path: 'Test/a.md', content: '# A\n' },
    { op: 'write', path: 'Test/a.md', content: '# B\n' },
    { op: 'write', path: 'Test/a.md', content: '# A\n' },
  ], 'test', null, true)
  assert.equal(out.errors.length, 0)
  assert.equal(fs.readFileSync(path.join(root, 'Test/a.md'), 'utf8'), '# A\n')
  fs.rmSync(root, { recursive: true, force: true })
})

test('rename notebook then delete it requires confirmation', async () => {
  const root = tempRoot()
  fs.writeFileSync(path.join(root, 'Test', 'b.md'), '# b\n')
  await assert.rejects(() => applyAgentOperations(root, [
    { op: 'renameNotebook', notebook: 'Test', title: 'Renamed' },
    { op: 'deleteNotebook', notebook: 'Renamed' },
  ], 'test'), /需要用户确认/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('move into a notebook then delete it requires confirmation', async () => {
  const root = tempRoot()
  fs.mkdirSync(path.join(root, 'Target'))
  fs.writeFileSync(path.join(root, 'Target', 'b.md'), '# b\n')
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.dsh-notebooks.json'), 'utf8'))
  manifest.notebooks.push({ name: 'Target' })
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify(manifest))
  await assert.rejects(() => applyAgentOperations(root, [
    { op: 'move', path: 'Test/a.md', notebook: 'Target' },
    { op: 'deleteNotebook', notebook: 'Target' },
  ], 'test'), /需要用户确认/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('separator-wrapped long body still requires confirmation', async () => {
  const root = tempRoot()
  const body = `---\n${'长'.repeat(600)}\n---`
  await assert.rejects(() => applyAgentOperations(root, [{ op: 'create', notebook: 'Test', title: 'long', body }], 'test'), /需要用户确认/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('existing long body wrapped in separators still requires confirmation', async () => {
  const root = tempRoot()
  fs.writeFileSync(path.join(root, 'Test', 'long.md'), `---\n${'长'.repeat(600)}\n---\n`)
  await assert.rejects(() => applyAgentOperations(root, [{ op: 'write', path: 'Test/long.md', content: '# short\n' }], 'test'), /需要用户确认/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('rename then overwrite long note requires confirmation', async () => {
  const root = tempRoot()
  fs.writeFileSync(path.join(root, 'Test', 'long.md'), `# long\n\n${'长'.repeat(600)}\n`)
  await assert.rejects(() => applyAgentOperations(root, [
    { op: 'rename', path: 'Test/long.md', title: 'renamed' },
    { op: 'write', path: 'Test/renamed.md', content: '# short\n' },
  ], 'test'), /需要用户确认/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('collision on move then delete notebook requires confirmation', async () => {
  const root = tempRoot()
  fs.mkdirSync(path.join(root, 'Target'))
  fs.writeFileSync(path.join(root, 'Target', 'a.md'), '# t\n')
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.dsh-notebooks.json'), 'utf8'))
  manifest.notebooks.push({ name: 'Target' })
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify(manifest))
  await assert.rejects(() => applyAgentOperations(root, [
    { op: 'move', path: 'Test/a.md', notebook: 'Target' },
    { op: 'deleteNotebook', notebook: 'Target' },
  ], 'test'), /需要用户确认/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('consecutive renames cannot hide a long note', async () => {
  const root = tempRoot()
  fs.writeFileSync(path.join(root, 'Test', 'long.md'), `# long\n\n${'长'.repeat(600)}\n`)
  await assert.rejects(() => applyAgentOperations(root, [
    { op: 'rename', path: 'Test/long.md', title: 'one' },
    { op: 'rename', path: 'Test/one.md', title: 'two' },
    { op: 'write', path: 'Test/two.md', content: '# short\n' },
  ], 'test'), /需要用户确认/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('collision rename cannot hide a long note', async () => {
  const root = tempRoot()
  fs.mkdirSync(path.join(root, 'Target'))
  fs.writeFileSync(path.join(root, 'Target', 'a.md'), '# target\n')
  fs.writeFileSync(path.join(root, 'Test', 'a.md'), `# long\n\n${'长'.repeat(600)}\n`)
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.dsh-notebooks.json'), 'utf8'))
  manifest.notebooks.push({ name: 'Target' })
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify(manifest))
  await assert.rejects(() => applyAgentOperations(root, [
    { op: 'move', path: 'Test/a.md', notebook: 'Target' },
    { op: 'write', path: 'Target/a-2.md', content: '# short\n' },
  ], 'test'), /需要用户确认/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('notebook rename cannot hide a long note', async () => {
  const root = tempRoot()
  fs.writeFileSync(path.join(root, 'Test', 'long.md'), `# long\n\n${'长'.repeat(600)}\n`)
  await assert.rejects(() => applyAgentOperations(root, [
    { op: 'renameNotebook', notebook: 'Test', title: 'Renamed' },
    { op: 'write', path: 'Renamed/long.md', content: '# short\n' },
  ], 'test'), /需要用户确认/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('write a new note then delete the notebook requires confirmation', async () => {
  const root = tempRoot()
  await assert.rejects(() => applyAgentOperations(root, [
    { op: 'write', path: 'Test/new.md', content: '# new\n' },
    { op: 'deleteNotebook', notebook: 'Test' },
  ], 'test'), /需要用户确认/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('moving two attachments does not require note confirmation', async () => {
  const root = tempRoot()
  fs.mkdirSync(path.join(root, 'Other'))
  fs.writeFileSync(path.join(root, 'Test', 'a.png'), 'a')
  fs.writeFileSync(path.join(root, 'Test', 'b.png'), 'b')
  const out = await applyAgentOperations(root, [
    { op: 'fileMove', from: 'Test/a.png', to: 'Other/a.png' },
    { op: 'fileMove', from: 'Test/b.png', to: 'Other/b.png' },
  ], 'test', null, false)
  assert.equal(out.errors.length, 0)
  assert.equal(fs.existsSync(path.join(root, 'Other', 'a.png')), true)
  fs.rmSync(root, { recursive: true, force: true })
})

test('consecutive notebook renames cannot hide a long note', async () => {
  const root = tempRoot()
  fs.writeFileSync(path.join(root, 'Test', 'long.md'), `# long\n\n${'长'.repeat(600)}\n`)
  await assert.rejects(() => applyAgentOperations(root, [
    { op: 'renameNotebook', notebook: 'Test', title: 'One' },
    { op: 'renameNotebook', notebook: 'One', title: 'Two' },
    { op: 'write', path: 'Two/long.md', content: '# short\n' },
  ], 'test'), /需要用户确认/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('create then collision rename cannot hide a long note', async () => {
  const root = tempRoot()
  fs.writeFileSync(path.join(root, 'Test', 'long.md'), `# long\n\n${'长'.repeat(600)}\n`)
  await assert.rejects(() => applyAgentOperations(root, [
    { op: 'create', notebook: 'Test', title: 'new', body: 'short' },
    { op: 'rename', path: 'Test/long.md', title: 'new' },
    { op: 'write', path: 'Test/new-2.md', content: '# short\n' },
  ], 'test'), /需要用户确认/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('delete then collision rename cannot hide a long note', async () => {
  const root = tempRoot()
  fs.writeFileSync(path.join(root, 'Test', 'long.md'), `# long\n\n${'长'.repeat(600)}\n`)
  await assert.rejects(() => applyAgentOperations(root, [
    { op: 'delete', path: 'Test/a.md' },
    { op: 'rename', path: 'Test/long.md', title: 'a' },
    { op: 'write', path: 'Test/a.md', content: '# short\n' },
  ], 'test'), /需要用户确认/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('single short note overwrite then notebook delete needs no confirmation', async () => {
  const root = tempRoot()
  const out = await applyAgentOperations(root, [
    { op: 'write', path: 'Test/a.md', content: '# short\n' },
    { op: 'deleteNotebook', notebook: 'Test' },
  ], 'test', null, false)
  assert.equal(out.errors.length, 0)
  fs.rmSync(root, { recursive: true, force: true })
})

test('moving an image into a one-note notebook then deleting it needs no confirmation', async () => {
  const root = tempRoot()
  fs.mkdirSync(path.join(root, 'Other'))
  fs.writeFileSync(path.join(root, 'Test', 'x.png'), 'img')
  const out = await applyAgentOperations(root, [
    { op: 'fileMove', from: 'Test/x.png', to: 'Other/x.png' },
    { op: 'deleteNotebook', notebook: 'Test' },
  ], 'test', null, false)
  assert.equal(out.errors.length, 0)
  fs.rmSync(root, { recursive: true, force: true })
})

test('case-insensitive collision cannot hide a long note', async () => {
  const root = tempRoot()
  fs.writeFileSync(path.join(root, 'Test', 'case.md'), `# long\n\n${'长'.repeat(600)}\n`)
  await assert.rejects(() => applyAgentOperations(root, [
    { op: 'rename', path: 'Test/case.md', title: 'CASE' },
    { op: 'write', path: 'Test/case-2.md', content: '# short\n' },
  ], 'test'), /需要用户确认/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('delete cannot remove a notebook directory', async () => {
  const root = tempRoot()
  const out = await applyAgentOperations(root, [{ op: 'delete', path: 'Test' }], 'test', null, true)
  assert.equal(out.errors.length, 1)
  assert.match(out.errors[0], /deleteNotebook/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('moving the same note twice counts as one note move', async () => {
  const root = tempRoot()
  fs.mkdirSync(path.join(root, 'A')); fs.mkdirSync(path.join(root, 'B'))
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.dsh-notebooks.json'), 'utf8'))
  manifest.notebooks.push({ name: 'A' }, { name: 'B' })
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify(manifest))
  const out = await applyAgentOperations(root, [
    { op: 'move', path: 'Test/a.md', notebook: 'A' },
    { op: 'move', path: 'A/a.md', notebook: 'B' },
  ], 'test', null, false)
  assert.equal(out.errors.length, 0)
  fs.rmSync(root, { recursive: true, force: true })
})

test('after renaming a long note, writing the old empty path needs no confirmation', async () => {
  const root = tempRoot()
  fs.writeFileSync(path.join(root, 'Test', 'long.md'), `# long\n\n${'长'.repeat(600)}\n`)
  const out = await applyAgentOperations(root, [
    { op: 'rename', path: 'Test/long.md', title: 'moved' },
    { op: 'write', path: 'Test/long.md', content: '# new short\n' },
  ], 'test', null, false)
  assert.equal(out.errors.length, 0)
  fs.rmSync(root, { recursive: true, force: true })
})

test('automatic short write cannot silently remove image references', async () => {
  const root = tempRoot()
  fs.writeFileSync(path.join(root, 'Test', 'a.png'), 'img')
  fs.writeFileSync(path.join(root, 'Test', 'img.md'), '# img\n\n![x](a.png)\n')
  const out = await applyAgentOperations(root, [{ op: 'write', path: 'Test/img.md', content: '# img\n\nno image\n' }], 'test')
  assert.equal(out.errors.length, 1)
  assert.match(out.errors[0], /移除图片引用/)
  fs.rmSync(root, { recursive: true, force: true })
})
