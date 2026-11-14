import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createSurfaceStore, emptySurfaceState } from '../surface-store.js'
import { createFileSurfaceStore } from '../surface-persistence.js'

function setup() {
  let data = emptySurfaceState(), clock = 1000, serial = 0
  const options = { now: () => clock, id: () => `id-${++serial}`, retention: () => 60,
    transact: (task) => { const draft = structuredClone(data); const result = task(draft); data = draft; return result } }
  return { store: createSurfaceStore(options), advance: (ms) => { clock += ms }, state: () => data }
}

test('same event and repeated request produce one Surface', () => {
  const { store } = setup()
  const a = store.create({ eventKey: 'capture:one', requestId: 'request', title: '正在记录日记' })
  assert.equal(store.create({ requestId: 'request', title: 'different' }).id, a.id)
  assert.equal(store.create({ eventKey: 'capture:one', title: '正在归档' }).id, a.id)
  assert.equal(store.list().queue.length, 1)
})

test('latest three are ordered by real content updates and older cards emerge', () => {
  const { store, advance } = setup()
  const cards = []
  for (let i = 0; i < 4; i++) { cards.push(store.create({ title: String(i), state: 'succeeded' })); advance(10) }
  assert.deepEqual(store.list().visible, [cards[3].id, cards[2].id, cards[1].id])
  store.update(cards[0].id, { body: 'new' })
  assert.deepEqual(store.list().visible, [cards[0].id, cards[3].id, cards[2].id])
  const at = store.get(cards[0].id).updatedAt
  advance(10); store.update(cards[0].id, { body: 'new' })
  assert.equal(store.get(cards[0].id).updatedAt, at)
  store.close(cards[0].id)
  assert.deepEqual(store.list().visible, [cards[3].id, cards[2].id, cards[1].id])
})

test('closing a running card hides without cancelling; next changed content reappears', () => {
  const { store, advance } = setup()
  const a = store.create({ title: '分类' })
  assert.equal(store.close(a.id).effect, null)
  assert.equal(store.get(a.id).status, 'running')
  assert.equal(store.list().queue.length, 0)
  store.update(a.id, { title: '分类' })
  assert.equal(store.list().queue.length, 0)
  advance(10); store.update(a.id, { body: '开始写入' })
  assert.equal(store.list().queue[0].id, a.id)
})

test('closing a waiting interaction cancels task but leaves a terminal result', () => {
  const { store, advance } = setup()
  const a = store.create({ state: 'waiting_confirmation', size: 'large', target: { pendingId: 'p' } })
  const out = store.close(a.id)
  assert.equal(out.effect.type, 'cancel')
  assert.equal(out.surface.status, 'cancelled')
  assert.equal(out.surface.size, 'small')
  assert.equal(store.list().queue.length, 1)
  advance(60001); assert.equal(store.list().queue.length, 0)
  assert.throws(() => store.update(a.id, { state: 'running' }), /关闭或过期/)
})

test('terminal cards expire at 60 seconds; process and waiting cards never expire', () => {
  const { store, advance } = setup()
  const a = store.create({ state: 'succeeded' })
  const b = store.create({ state: 'waiting_user' })
  const c = store.create({ state: 'running' })
  advance(59000); assert.equal(store.list().queue.length, 3)
  advance(1001); assert.deepEqual(new Set(store.list().queue.map((s) => s.id)), new Set([b.id, c.id]))
  advance(86400000); assert.equal(store.list().queue.length, 2)
  assert.equal(store.get(a.id).visibility, 'removed')
})

test('only one large card; expand pauses expiry, collapse resumes remaining time', () => {
  const { store, advance } = setup()
  const a = store.create({ state: 'succeeded' }), b = store.create({ state: 'succeeded' })
  advance(20000); store.present(a.id, { size: 'large' })
  advance(100000); assert.equal(store.get(a.id).visibility, 'queued')
  const remaining = store.get(a.id).remainingMs
  assert.equal(remaining, 40000)
  const c = store.create({ title: 'another' })
  store.present(c.id, { size: 'large' })
  assert.equal(store.get(a.id).size, 'small')
  assert.equal(store.list().largeSurfaceId, c.id)
  advance(39999); assert.equal(store.get(a.id).visibility, 'queued')
  advance(2); assert.equal(store.get(a.id).visibility, 'removed')
  assert.equal(store.get(b.id).visibility, 'removed')
})

test('draft and live hover pause terminal expiry; stale hover leases release', () => {
  const { store, advance } = setup()
  const a = store.create({ state: 'succeeded' })
  advance(10000); store.present(a.id, { hover: true, clientId: 'one' })
  assert.equal(store.get(a.id).remainingMs, 50000)
  advance(10000); store.present(a.id, { hover: true, clientId: 'one' })
  store.present(a.id, { draft: 'draft' })
  advance(100000); assert.equal(store.get(a.id).visibility, 'queued')
  store.present(a.id, { draft: '' })
  advance(50001); assert.equal(store.get(a.id).visibility, 'removed')
})

test('presentation changes do not reorder queue', () => {
  const { store, advance } = setup()
  const a = store.create({ title: 'old' }); advance(10)
  const b = store.create({ title: 'new' })
  advance(10); store.present(a.id, { size: 'large', draft: 'abc' })
  assert.deepEqual(store.list().visible, [b.id, a.id])
})

test('explicit retry retains id but guards against stale attempts', () => {
  const { store } = setup()
  const a = store.create({ state: 'failed' })
  const resumed = store.create({ surfaceId: a.id, restart: true, state: 'running', title: '重试' })
  assert.equal(resumed.id, a.id)
  assert.equal(resumed.attempt, 2)
  assert.throws(() => store.update(a.id, { body: 'old' }, { attempt: 1 }), /旧执行/)
  assert.equal(store.update(a.id, { body: 'current' }, { attempt: 2 }).body, 'current')
})

test('removed id creates a new Surface for new requests but not for late updates', () => {
  const { store } = setup()
  const a = store.create({ state: 'failed' }); store.close(a.id)
  assert.throws(() => store.update(a.id, { body: 'late' }), /关闭或过期/)
  const b = store.create({ surfaceId: a.id, title: 'new request' })
  assert.notEqual(b.id, a.id)
  assert.equal(store.list().queue.length, 1)
})

test('answers are tied to current interaction; double click is claimed once', () => {
  const { store } = setup()
  const a = store.create({ state: 'waiting_confirmation', interaction: { id: 'question-1' }, actions: [{ id: 'yes', type: 'confirm' }, { id: 'no', type: 'cancel' }] })
  assert.throws(() => store.claim(a.id, { actionId: 'yes', interactionId: 'old' }), /已更新/)
  assert.equal(store.claim(a.id, { actionId: 'yes', interactionId: 'question-1' }).duplicate, false)
  assert.equal(store.claim(a.id, { actionId: 'no', interactionId: 'question-1' }).duplicate, true)
})

test('recovery marks interrupted tasks, preserves questions and MCP events', () => {
  const { store } = setup()
  const a = store.create({ source: 'agent' })
  const b = store.create({ source: 'agent', state: 'waiting_user' })
  const c = store.create({ source: 'mcp' })
  store.recover()
  assert.equal(store.get(a.id).status, 'failed')
  assert.equal(store.get(b.id).status, 'waiting_user')
  assert.equal(store.get(c.id).status, 'running')
})

test('daily checks are shared and idempotent', () => {
  const { store } = setup()
  let checks = 0
  assert.equal(store.once('skill:2026-11-13', () => ++checks).first, true)
  assert.equal(store.once('skill:2026-11-13', () => ++checks).first, false)
  assert.equal(checks, 1)
})

test('queue survives a new store instance, preserving ids, drafts, size and removal', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-surface-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  let clock = 1000
  const make = () => createFileSurfaceStore({ root, now: () => clock })
  const a = make().create({ state: 'succeeded', requestId: 'one' })
  make().present(a.id, { size: 'large', draft: 'hello' })
  clock += 100000
  assert.equal(make().get(a.id).size, 'large')
  assert.equal(make().get(a.id).draft, 'hello')
  make().close(a.id)
  assert.equal(make().list().queue.length, 0)
  assert.equal(make().create({ requestId: 'one' }).visibility, 'removed')
})


test('disconnected hover resumes from lease end rather than next page open', () => {
  const { store, advance } = setup()
  const a = store.create({ state: 'succeeded' })
  advance(10000); store.present(a.id, { hover: true })
  advance(200000)
  assert.equal(store.get(a.id).visibility, 'removed')
})

test('unknown Surface IDs cannot join a different root event', () => {
  const { store } = setup()
  assert.throws(() => store.create({ surfaceId: 'unknown', title: 'no' }), /不属于/)
  assert.equal(store.list().queue.length, 0)
})

test('request ledger rejects changed payloads and preserves completed responses', () => {
  const { store } = setup()
  assert.equal(store.beginRequest('mcp:one', 'payload').fresh, true)
  assert.equal(store.beginRequest('mcp:one', 'payload').fresh, false)
  assert.throws(() => store.beginRequest('mcp:one', 'other'), /不同操作/)
  store.finishRequest('mcp:one', { ok: true })
  assert.deepEqual(store.beginRequest('mcp:one', 'payload').result, { ok: true })
})


test('stale close frame cannot cancel a newly displayed question', () => {
  const { store } = setup()
  const a = store.create({ title: '执行中' })
  store.update(a.id, { state: 'waiting_user', body: '现在需要回答', interaction: { id: 'question' } })
  assert.throws(() => store.close(a.id, { revision: a.revision, attempt: a.attempt }), /已更新/)
  assert.equal(store.get(a.id).status, 'waiting_user')
})

test('draft updates from a previous attempt cannot overwrite a followup draft', () => {
  const { store } = setup()
  const a = store.create({ state: 'failed' })
  store.create({ surfaceId: a.id, restart: true, state: 'running' })
  assert.throws(() => store.present(a.id, { attempt: 1, draft: 'old' }), /旧执行/)
  assert.equal(store.get(a.id).draft, '')
})


test('real UI response is recorded, and a different question cannot reuse it', () => {
  const { store } = setup()
  const a = store.create({ state: 'waiting_user', interaction: { id: 'q1' }, allowFreeText: true })
  assert.equal(store.get(a.id).response, undefined)
  store.claim(a.id, { actionId: 'reply', interactionId: 'q1', text: '真实回复' })
  assert.equal(store.get(a.id).response.text, '真实回复')
  store.update(a.id, { interaction: { id: 'q2' }, body: '另一个问题' })
  assert.equal(store.get(a.id).response, null)
})
