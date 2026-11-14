// Task state is independent of Surface visibility and presentation.
export const TERMINAL_STATES = new Set(['succeeded', 'failed', 'cancelled'])
export const WAITING_STATES = new Set(['waiting_user', 'waiting_confirmation'])
export const EVENT_STATES = new Set(['queued', 'running', ...WAITING_STATES, ...TERMINAL_STATES])

export function terminal(state) { return TERMINAL_STATES.has(state) }
export function waiting(state) { return WAITING_STATES.has(state) }

export function createTaskEvent({ id, surfaceId, kind = 'notice', source = 'ui', state = 'running', target = {}, sessionId = '', at }) {
  if (!EVENT_STATES.has(state)) throw new Error(`无效的任务状态：${state}`)
  return { id, surfaceId, kind, source, state, target, sessionId, attempt: 1, createdAt: at, updatedAt: at }
}

export function transitionEvent(event, state, { attempt = event.attempt, at } = {}) {
  if (attempt !== event.attempt) throw new Error('旧执行尝试已结束，不能更新当前任务')
  if (!EVENT_STATES.has(state)) throw new Error(`无效的任务状态：${state}`)
  if (terminal(event.state) && state !== event.state) throw new Error('任务已经结束；请明确重试或继续处理')
  event.state = state
  event.updatedAt = at
  return event
}

export function restartEvent(event, at) {
  if (!terminal(event.state)) throw new Error('任务仍在处理，不能重复启动')
  event.attempt += 1
  event.state = 'running'
  event.updatedAt = at
  return event
}
