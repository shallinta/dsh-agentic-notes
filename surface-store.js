import { randomUUID } from 'node:crypto'
import { createTaskEvent, restartEvent, terminal, transitionEvent, waiting } from './event-model.js'

const clone = (value) => JSON.parse(JSON.stringify(value))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
export const surfaceRetentionSeconds = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(3, Math.min(600, Math.round(n))) : 60
}
export function emptySurfaceState() {
  return { version: 1, sequence: 0, events: {}, surfaces: {}, requests: {}, checks: {}, largeSurfaceId: null }
}

// One Interface owns task state, queue membership, expiry, presentation and action
// claims. Persistence, clock and ids are dependencies so callers and tests cross
// exactly the same seam. A transaction must be synchronous and exclusive.
export function createSurfaceStore({ transact, now = Date.now, id = randomUUID, retention = () => 60 }) {
  const envelope = (db, s) => {
    const event = db.events[s.eventId]
    return { ...clone(s), surfaceId: s.id, status: event.state, attempt: event.attempt, source: event.source,
      sessionId: event.sessionId, target: clone(event.target), event: clone(event), size: db.largeSurfaceId === s.id ? 'large' : 'small' }
  }
  const requireSurface = (db, surfaceId) => {
    const s = db.surfaces[String(surfaceId || '')]
    if (!s) throw new Error('找不到提示卡片')
    return s
  }
  const active = (db, surfaceId, attempt) => {
    const s = requireSurface(db, surfaceId)
    if (s.visibility === 'removed') throw new Error('提示已关闭或过期')
    const event = db.events[s.eventId]
    if (attempt !== undefined && Number(attempt) !== event.attempt) throw new Error('旧执行尝试已结束')
    return s
  }
  const remove = (db, s, reason) => {
    s.visibility = 'removed'
    s.removedAt = now()
    s.removeReason = reason
    s.expiresAt = null
    s.hover = {}
    s.draft = ''
    s.body = ''
    s.actions = []
    s.interaction = null
    s.response = null
    if (db.largeSurfaceId === s.id) db.largeSurfaceId = null
  }
  const paused = (db, s, at) => db.largeSurfaceId === s.id || Boolean(s.draft) || Object.values(s.hover || {}).some((until) => until > at)
  const timer = (db, s) => {
    if (s.visibility === 'removed' || !terminal(db.events[s.eventId].state)) { s.expiresAt = null; return }
    const at = now()
    if (paused(db, s, at)) {
      if (s.expiresAt !== null) s.remainingMs = Math.max(0, s.expiresAt - at)
      s.expiresAt = null
    } else if (s.expiresAt === null) s.expiresAt = at + s.remainingMs
  }
  const tick = (db) => {
    const at = now()
    for (const s of Object.values(db.surfaces)) {
      if (s.visibility === 'removed') continue
      // Expired hover leases do not survive disconnected windows indefinitely.
      const hoverUntil = Math.max(0, ...Object.values(s.hover || {}))
      for (const [client, until] of Object.entries(s.hover || {})) if (until <= at) delete s.hover[client]
      if (s.expiresAt === null && hoverUntil > 0 && !paused(db, s, at) && terminal(db.events[s.eventId].state)) s.expiresAt = hoverUntil + s.remainingMs
      if (s.expiresAt !== null && s.expiresAt <= at && terminal(db.events[s.eventId].state)) remove(db, s, 'expired')
      else timer(db, s)
    }
  }
  const stamp = (db, s) => {
    s.updatedAt = now()
    s.sequence = ++db.sequence
    s.revision += 1
  }
  const setSize = (db, s, size) => {
    if (!['small', 'large'].includes(size)) throw new Error('卡片尺寸只能是 small 或 large')
    const old = db.surfaces[db.largeSurfaceId]
    if (size === 'large') db.largeSurfaceId = s.id
    else if (db.largeSurfaceId === s.id) db.largeSurfaceId = null
    if (old && old.id !== s.id) timer(db, old)
    timer(db, s)
  }
  const patchContent = (db, s, patch, attempt) => {
    active(db, s.id, attempt)
    const event = db.events[s.eventId]
    const before = { title: s.title, body: s.body, actions: s.actions, allowFreeText: s.allowFreeText, interaction: s.interaction, state: event.state, phase: s.phase }
    const wasTerminal = terminal(event.state)
    if (patch.state !== undefined) transitionEvent(event, patch.state, { attempt: attempt ?? event.attempt, at: now() })
    for (const field of ['title', 'body', 'phase']) if (patch[field] !== undefined) s[field] = String(patch[field])
    if (patch.actions !== undefined) {
      if (!Array.isArray(patch.actions)) throw new Error('actions 必须是数组')
      s.actions = clone(patch.actions)
    }
    if (patch.allowFreeText !== undefined) s.allowFreeText = patch.allowFreeText === true
    if (patch.interaction !== undefined) {
      if (patch.interaction?.id && patch.interaction.id !== s.interaction?.id) s.response = null
      s.interaction = patch.interaction ? clone(patch.interaction) : null
    }
    if (patch.target !== undefined) event.target = { ...event.target, ...clone(patch.target) }
    if (patch.sessionId !== undefined) event.sessionId = String(patch.sessionId || '')
    const after = { title: s.title, body: s.body, actions: s.actions, allowFreeText: s.allowFreeText, interaction: s.interaction, state: event.state, phase: s.phase }
    if (!same(before, after)) {
      s.visibility = 'queued'
      stamp(db, s)
    }
    if (!wasTerminal && terminal(event.state)) {
      s.remainingMs = surfaceRetentionSeconds(retention()) * 1000
      s.expiresAt = null
    }
    if (patch.size !== undefined) setSize(db, s, patch.size)
    timer(db, s)
    return envelope(db, s)
  }
  const run = (fn) => transact((db) => { tick(db); return clone(fn(db)) })

  return {
    create(input = {}) {
      return run((db) => {
        if (input.requestId && Object.hasOwn(db.requests, input.requestId)) return envelope(db, db.surfaces[db.requests[input.requestId]])
        if (input.surfaceId && !Object.hasOwn(db.surfaces, input.surfaceId)) throw new Error('提示 ID 不属于当前笔记库')
        let s = input.surfaceId ? db.surfaces[input.surfaceId] : null
        if (!s && input.eventKey) s = Object.values(db.surfaces).find((entry) => entry.eventKey === input.eventKey && entry.visibility !== 'removed')
        if (s?.visibility === 'removed') s = null
        if (s) {
          if (input.attempt !== undefined && Number(input.attempt) !== db.events[s.eventId].attempt) throw new Error('旧执行尝试已结束')
          if (input.restart === true) {
            const event = db.events[s.eventId]
            restartEvent(event, now())
            event.target = {}
            if (input.source) event.source = input.source
            if (input.kind) event.kind = input.kind
            s.actions = []; s.interaction = null; s.response = null; s.draft = ''; s.expiresAt = null; s.remainingMs = 0
            s.visibility = 'queued'
            stamp(db, s)
          }
          const out = patchContent(db, s, input, db.events[s.eventId].attempt)
          if (input.requestId) db.requests[input.requestId] = s.id
          return { ...out, reused: true }
        }
        const at = now()
        const surfaceId = id()
        const event = createTaskEvent({ id: id(), surfaceId, kind: input.kind, source: input.source, state: input.state || 'running', target: clone(input.target || {}), sessionId: input.sessionId || '', at })
        s = { id: surfaceId, eventId: event.id, eventKey: input.eventKey || '', title: String(input.title || '处理中'), body: String(input.body || ''), phase: String(input.phase || ''),
          actions: clone(input.actions || []), interaction: input.interaction ? clone(input.interaction) : null, allowFreeText: input.allowFreeText === true,
          visibility: 'queued', createdAt: at, updatedAt: at, sequence: ++db.sequence, revision: 1, draft: '', hover: {},
          remainingMs: terminal(event.state) ? surfaceRetentionSeconds(retention()) * 1000 : 0, expiresAt: null, claims: {} }
        db.events[event.id] = event
        db.surfaces[s.id] = s
        if (input.requestId) db.requests[input.requestId] = s.id
        if (input.size) setSize(db, s, input.size)
        timer(db, s)
        return { ...envelope(db, s), reused: false }
      })
    },
    update(surfaceId, patch, { attempt } = {}) {
      return run((db) => patchContent(db, active(db, surfaceId, attempt), patch, attempt))
    },
    get(surfaceId) { return run((db) => envelope(db, requireSurface(db, surfaceId))) },
    list() {
      return run((db) => {
        const queue = Object.values(db.surfaces).filter((s) => s.visibility === 'queued').sort((a, b) => b.updatedAt - a.updatedAt || b.sequence - a.sequence)
        return { queue: queue.map((s) => envelope(db, s)), visible: queue.slice(0, 3).map((s) => s.id), largeSurfaceId: db.largeSurfaceId, sequence: db.sequence }
      })
    },
    present(surfaceId, { size, draft, hover, clientId = 'default', attempt } = {}) {
      return run((db) => {
        const s = active(db, surfaceId, attempt)
        if (draft !== undefined) s.draft = String(draft)
        if (hover !== undefined) {
          s.hover ||= {}
          if (hover) s.hover[clientId] = now() + 15000
          else delete s.hover[clientId]
        }
        if (size) setSize(db, s, size)
        timer(db, s)
        return envelope(db, s)
      })
    },
    close(surfaceId, { attempt, revision } = {}) {
      return run((db) => {
        const s = requireSurface(db, surfaceId)
        if (s.visibility === 'removed') return { surface: envelope(db, s), effect: null }
        active(db, surfaceId, attempt)
        if (revision !== undefined && s.revision !== revision) throw new Error('提示已更新，请按当前卡片操作')
        const event = db.events[s.eventId]
        let effect = null
        if (terminal(event.state)) remove(db, s, 'closed')
        else if (waiting(event.state)) {
          effect = { type: 'cancel', eventId: event.id, target: clone(event.target) }
          patchContent(db, s, { state: 'cancelled', title: '任务已取消', body: '已放弃本次任务。', actions: [], interaction: null, allowFreeText: false }, event.attempt)
          s.draft = ''
          setSize(db, s, 'small')
        } else {
          s.visibility = 'hidden'
          if (db.largeSurfaceId === s.id) db.largeSurfaceId = null
        }
        return { surface: envelope(db, s), effect }
      })
    },
    cancel(surfaceId) {
      return run((db) => {
        const s = active(db, surfaceId)
        const event = db.events[s.eventId]
        if (terminal(event.state)) return { surface: envelope(db, s), effect: null }
        const effect = { type: 'cancel', eventId: event.id, target: clone(event.target) }
        patchContent(db, s, { state: 'cancelled', title: '任务已取消', body: '已取消后续处理；已完成的修改保留。', actions: [], interaction: null, allowFreeText: false }, event.attempt)
        s.draft = ''
        setSize(db, s, 'small')
        return { surface: envelope(db, s), effect }
      })
    },
    respond(surfaceId, { interactionId, optionId = '', text = '', label = '' } = {}) {
      return run((db) => {
        const s = active(db, surfaceId)
        if (!s.interaction || s.interaction.id !== interactionId) throw new Error('问题已更新，请按当前问题回答')
        s.response = { interactionId, optionId, text: String(text), label: String(label), at: now() }
        return patchContent(db, s, { state: 'running', body: '已收到回答，等待继续处理……', actions: [{ id: 'cancel', label: '取消任务', type: 'cancel-task' }], interaction: null, allowFreeText: false }, db.events[s.eventId].attempt)
      })
    },
    assertRunning(surfaceId, attempt) {
      return run((db) => {
        const s = active(db, surfaceId, attempt)
        if (terminal(db.events[s.eventId].state)) throw new Error('任务已结束，不能继续写入')
        return envelope(db, s)
      })
    },
    claim(surfaceId, { actionId, interactionId, requestId, attempt, text = '' } = {}) {
      return run((db) => {
        const s = active(db, surfaceId, attempt)
        const key = interactionId || s.interaction?.id || `${db.events[s.eventId].attempt}:${String(actionId || '')}`
        const prior = s.claims[key]
        if (prior) return { duplicate: true, ...clone(prior) }
        if (s.interaction && interactionId !== s.interaction.id) throw new Error('问题或方案已更新，请按当前卡片操作')
        const action = s.actions.find((entry) => entry.id === actionId)
        if (!action && !(s.allowFreeText && actionId === 'reply')) throw new Error('该操作已失效')
        if (s.interaction) s.response = { interactionId: s.interaction.id, optionId: actionId, label: action?.label || String(text), text: String(text), at: now() }
        const claim = { id: requestId || id(), key, action: action ? clone(action) : { id: 'reply', type: 'reply' }, attempt: db.events[s.eventId].attempt, status: 'claimed' }
        s.claims[key] = claim
        return { duplicate: false, ...clone(claim) }
      })
    },
    completeAction(surfaceId, actionId, result, { failed = false, key: claimKey } = {}) {
      return run((db) => {
        const s = requireSurface(db, surfaceId)
        const key = claimKey || s.interaction?.id || `${db.events[s.eventId].attempt}:${String(actionId || '')}`
        if (!s.claims[key]) throw new Error('没有对应的操作记录')
        if (failed) delete s.claims[key]
        else s.claims[key] = { ...s.claims[key], status: 'done', result: clone(result ?? {}) }
        return envelope(db, s)
      })
    },
    recover(isAlive = () => false) {
      return run((db) => {
        for (const s of Object.values(db.surfaces)) {
          const event = db.events[s.eventId]
          if (s.visibility === 'removed' || terminal(event.state) || waiting(event.state) || event.source === 'mcp') continue
          if (!isAlive(event)) patchContent(db, s, { state: 'failed', title: '任务已中断', body: '上次执行已停止，请检查结果后重试。' }, event.attempt)
        }
        return true
      })
    },
    beginRequest(key, signature) {
      return run((db) => {
        db.operations ||= {}
        const prior = db.operations[key]
        if (prior) {
          if (prior.signature !== signature) throw new Error('同一请求标识不能用于不同操作')
          return { fresh: false, ...clone(prior) }
        }
        const entry = { signature, status: 'processing', startedAt: now() }
        db.operations[key] = entry
        return { fresh: true, ...clone(entry) }
      })
    },
    finishRequest(key, result, error = '') {
      return run((db) => {
        if (!db.operations?.[key]) throw new Error('请求记录不存在')
        db.operations[key] = { ...db.operations[key], status: error ? 'failed' : 'done', result: clone(result ?? {}), error, endedAt: now() }
        return true
      })
    },
    once(key, task) {
      return run((db) => {
        if (Object.hasOwn(db.checks, key)) return { first: false, value: db.checks[key] }
        const value = task()
        db.checks[key] = value ?? true
        return { first: true, value: db.checks[key] }
      })
    },
  }
}
