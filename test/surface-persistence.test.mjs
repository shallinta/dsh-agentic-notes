import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createFileSurfaceStore } from '../surface-persistence.js'

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-persistence-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  return root
}

test('concurrent Host and stdio writers retain all Surfaces', async (t) => {
  const root = fixture(t)
  const moduleUrl = new URL('../surface-persistence.js', import.meta.url).href
  const run = (worker) => new Promise((resolve, reject) => {
    const code = `import {createFileSurfaceStore} from ${JSON.stringify(moduleUrl)}; const store=createFileSurfaceStore({root:${JSON.stringify(root)}}); for(let i=0;i<20;i++)store.create({title:${JSON.stringify(worker)}+'-'+i,eventKey:${JSON.stringify(worker)}+':'+i});`
    const child = spawn(process.execPath, ['--input-type=module', '-e', code], { stdio: ['ignore', 'ignore', 'pipe'] })
    let error = ''
    child.stderr.on('data', (chunk) => { error += chunk })
    child.on('error', reject)
    child.on('close', (status) => status === 0 ? resolve() : reject(new Error(error)))
  })
  await Promise.all([run('host'), run('stdio')])
  const queue = createFileSurfaceStore({ root }).list().queue
  assert.equal(queue.length, 40)
  assert.equal(new Set(queue.map((s) => s.id)).size, 40)
  assert.equal(new Set(queue.map((s) => s.sequence)).size, 40)
})

test('a dead writer lock is recovered without losing queue contents', (t) => {
  const root = fixture(t), store = createFileSurfaceStore({ root })
  const first = store.create({ title: 'before crash' })
  fs.writeFileSync(path.join(root, '.dsh-notebooks', 'surface-queue.lock'), '2147483647')
  store.create({ title: 'after crash' })
  assert.equal(store.list().queue.length, 2)
  assert.equal(store.get(first.id).title, 'before crash')
})

test('corrupt data is reported rather than overwritten', (t) => {
  const root = fixture(t), directory = path.join(root, '.dsh-notebooks')
  fs.mkdirSync(directory)
  const file = path.join(directory, 'surface-queue.json')
  fs.writeFileSync(file, '{unfinished')
  assert.throws(() => createFileSurfaceStore({ root }).list())
  assert.equal(fs.readFileSync(file, 'utf8'), '{unfinished')
})
