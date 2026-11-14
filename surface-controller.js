// UI-only actions cross this seam. Agent/MCP tools may request a question, but
// cannot call this controller to approve their own writes.
export function createSurfaceController({ store, runAction, cancelEvent }) {
  const close = async (id, explicitCancel = false, snapshot = {}) => {
    const out = explicitCancel ? store.cancel(id) : store.close(id, snapshot)
    if (out.effect) await cancelEvent(out.effect)
    return { surface: out.surface }
  }
  return async (op, args = {}) => {
    const id = args.surfaceId || args.id
    if (op === 'surface.list' || op === 'surface.open') return store.list()
    if (op === 'surface.create') return { surface: store.create(args) }
    if (op === 'surface.get') return { surface: store.get(id) }
    if (op === 'surface.update') return { surface: store.update(id, args.patch || {}, { attempt: args.attempt }) }
    if (op === 'surface.present') return { surface: store.present(id, args) }
    if (op === 'surface.close') return close(id, false, args)
    if (op === 'surface.cancel') return close(id, true)
    if (op !== 'surface.action') throw new Error(`未知提示操作：${op}`)
    const current = store.get(id)
    const claim = store.claim(id, args)
    if (claim.duplicate) {
      if (claim.status !== 'done') return { processing: true }
      return claim.result || { ok: true }
    }
    try {
      const out = claim.action.type === 'cancel-task' ? await close(id, true)
        : await runAction(claim.action, current, { ...args, text: String(args.text || ''), requestId: claim.id })
      store.completeAction(id, args.actionId, out, { key: claim.key })
      return out || { ok: true }
    } catch (err) {
      store.completeAction(id, args.actionId, {}, { key: claim.key, failed: true })
      throw err
    }
  }
}
