import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createFileSurfaceStore } from '../surface-persistence.js'
import { createTaskSurfaces } from '../task-surfaces.js'
import { recoverTaskSurfaces } from '../surface-recovery.js'

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-recovery-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const meta = path.join(root, '.dsh-notebooks')
  fs.mkdirSync(path.join(meta, 'agent-pending'), { recursive: true })
  fs.mkdirSync(path.join(meta, 'agent-sessions'), { recursive: true })
  const store = createFileSurfaceStore({ root })
  const tasks = createTaskSurfaces(() => store)
  return { root, meta, store, tasks }
}
const save = (file, data) => fs.writeFileSync(file, JSON.stringify(data))

test('legacy capture review is imported once without replaying completed captures', (t) => {
  const { root, meta, store, tasks } = fixture(t)
  save(path.join(root, '.dsh-notebooks.json'), { notebooks: [], captures: [
    { id: 'review', status: 'needs_review', pendingId: 'pending', text: '审核' },
    { id: 'old', status: 'archived', text: '旧完成结果' },
  ] })
  save(path.join(meta, 'agent-pending', 'pending.json'), { id: 'pending', kind: 'capture', brief: '确认后写入' })
  recoverTaskSurfaces(root, { store, tasks })
  const first = store.list().queue
  assert.equal(first.length, 1)
  assert.equal(first[0].status, 'waiting_confirmation')
  recoverTaskSurfaces(root, { store, tasks })
  assert.equal(store.list().queue.length, 1)
  assert.equal(store.list().queue[0].id, first[0].id)
})

test('lost capture waiter is interrupted, never treated as consent', (t) => {
  const { root, store, tasks } = fixture(t)
  save(path.join(root, '.dsh-notebooks.json'), { notebooks: [], captures: [{ id: 'lost', status: 'needs_input', text: '原记录', question: { id: 'lost-question', question: '选哪本？' } }] })
  recoverTaskSurfaces(root, { store, tasks })
  const card = store.list().queue[0]
  assert.equal(card.status, 'failed')
  assert.match(card.body, /中断/)
  assert.equal(card.actions[0].type, 'retry-capture')
})

test('legacy Agent questions preserve the session and are recoverable with a new Surface identity', (t) => {
  const { root, meta, store, tasks } = fixture(t)
  save(path.join(root, '.dsh-notebooks.json'), { notebooks: [], captures: [] })
  save(path.join(meta, 'agent-sessions', 'session.json'), { id: 'session', jobId: 'job', status: 'waiting', args: { instruction: '整理' },
    surfaces: [{ id: 'legacy-surface', title: '提问', body: '如何处理？', status: 'waiting', awaitResponse: true, options: [{ id: 'a', label: '方案一' }] }] })
  const recovered = []
  recoverTaskSurfaces(root, { store, tasks, onJob: (job) => recovered.push(job) })
  const card = store.list().queue[0]
  assert.equal(card.sessionId, 'session')
  assert.equal(card.status, 'waiting_user')
  assert.notEqual(card.id, 'legacy-surface')
  assert.equal(recovered[0].question.surfaceId, card.id)
})

test('removed surfaces do not resurrect from stale legacy task status', (t) => {
  const { root, store, tasks } = fixture(t)
  const card = store.create({ state: 'failed' })
  store.close(card.id)
  save(path.join(root, '.dsh-notebooks.json'), { notebooks: [], captures: [{ id: 'stale', status: 'running', surfaceId: card.id }] })
  recoverTaskSurfaces(root, { store, tasks })
  assert.equal(store.list().queue.length, 0)
  const data = JSON.parse(fs.readFileSync(path.join(root, '.dsh-notebooks.json'), 'utf8'))
  assert.equal(data.captures[0].status, 'cancelled')
})
