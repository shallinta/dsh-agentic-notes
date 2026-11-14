import { randomUUID } from 'node:crypto'

// Adapters translate business task states into one persistent Surface. They do
// not own another queue, timers or presentation state.
const action = (id, label, type, values = {}) => ({ id, label, type, ...values })
export function createTaskSurfaces(storeFor) {
  const update = (root, owner, patch) => {
    if (!owner.surfaceId) return null
    const store = storeFor(root)
    const current = store.get(owner.surfaceId)
    if (current.visibility === 'removed') return null
    return store.update(owner.surfaceId, patch, { attempt: owner.surfaceAttempt ?? current.attempt })
  }
  const attach = (root, owner, input) => {
    const s = storeFor(root).create({ ...input, requestId: input.requestId ? `${input.requestId}:bind` : undefined })
    owner.surfaceRoot = root
    owner.surfaceId = s.id
    owner.surfaceAttempt = s.attempt
    return s
  }
  const review = (root, owner, pending) => {
    const current = storeFor(root).get(owner.surfaceId)
    pending.surfaceId = owner.surfaceId
    pending.surfaceAttempt = owner.surfaceAttempt
    return update(root, owner, {
      state: 'waiting_confirmation', title: pending.kind === 'capture' ? '请确认归档' : '请确认改动',
      body: pending.brief || '请查看方案，确认后执行。',
      actions: [action('confirm', '确认执行', 'confirm', { pendingId: pending.id }), action('cancel', '放弃任务', 'cancel-task')],
      interaction: { id: pending.id, kind: 'confirm', pendingId: pending.id }, allowFreeText: false,
      ...(current.interaction?.id !== pending.id ? { size: 'large' } : {}),
      target: { pendingId: pending.id },
    })
  }
  return {
    bindCapture(root, capture, input = {}) {
      return attach(root, capture, { ...input, eventKey: `capture:${capture.id}`, kind: 'capture', source: 'capture',
        state: 'running', title: '正在记录日记', body: '', target: { captureId: capture.id, diaryDoc: capture.diaryDoc, date: capture.date } })
    },
    capture(root, capture, pending = null) {
      if (!capture.surfaceId) return null
      const owner = { surfaceId: capture.surfaceId, surfaceAttempt: capture.surfaceAttempt }
      if (capture.cancelled || capture.status === 'cancelled') return update(root, owner, { state: 'cancelled', title: '归档已取消', body: '已保存的日记保留。', actions: [], interaction: null, allowFreeText: false })
      if (capture.status === 'needs_review' && pending) return review(root, owner, pending)
      if (capture.status === 'needs_input' && capture.question) {
        const q = capture.question
        const old = storeFor(root).get(owner.surfaceId)
        return update(root, owner, { state: 'waiting_user', title: '请选择归档方式', body: q.question,
          actions: (q.options || []).map((o) => action(o.id, o.label, 'capture-answer', { captureId: capture.id, questionId: q.id, description: o.description || '' })),
          interaction: { id: q.id, kind: 'capture-answer', captureId: capture.id, questionId: q.id }, allowFreeText: true,
          ...(old.interaction?.id !== q.id ? { size: 'large' } : {}) })
      }
      if (['archived', 'rewritten', 'diary-only'].includes(capture.status)) {
        const only = capture.status === 'diary-only'
        const actions = capture.noteFile ? [action('view', '查看', 'view-note', { path: capture.noteFile }), action('move', '调整归属', 'move-capture', { captureId: capture.id })]
          : [action('view', '查看日记', 'view-diary', { doc: capture.diaryDoc, date: capture.date })]
        if (capture.needsRewrite && capture.rewrite) actions.push(action('rewrite', '查看整理建议', 'show-rewrite', { captureId: capture.id }))
        return update(root, owner, { state: 'succeeded', title: only ? '日记已保存' : '归档完成',
          body: only ? '未开启自动归档，本条记录仅保存在日记中。' : `已归档到「${capture.notebook || ''}」。${capture.noteFile || ''}`,
          actions, interaction: null, allowFreeText: false })
      }
      if (capture.status === 'failed') return update(root, owner, { state: 'failed', title: '归档失败', body: `日记已保存。${capture.error || '请重试归档。'}`,
        actions: [action('retry', '重试归档', 'retry-capture', { captureId: capture.id })], interaction: null, allowFreeText: false })
      return update(root, owner, { state: capture.status === 'pending' ? 'queued' : 'running', title: capture.status === 'pending' ? '等待归档' : '正在归档',
        body: '日记已保存。' + (capture.job?.message && !/^归类第/.test(capture.job.message) ? capture.job.message : '正在选择笔记并整理内容……'),
        actions: [action('view', '查看日记', 'view-diary', { doc: capture.diaryDoc, date: capture.date }), action('cancel', '取消归档', 'cancel-task')], interaction: null, allowFreeText: false })
    },
    bindJob(root, job, input = {}) {
      return attach(root, job, { ...input, eventKey: `agent:${job.sessionId}`, kind: 'agent', source: 'agent', state: 'running',
        title: String(job.args?.instruction || '处理笔记').split('\n')[0], body: '正在启动……',
        target: { jobId: job.id }, sessionId: job.sessionId, actions: [action('cancel', '取消任务', 'cancel-task')] })
    },
    model(root, job, input) {
      const store = storeFor(root)
      const current = store.get(job.surfaceId)
      const awaitResponse = input.awaitResponse === true
      const options = input.options || []
      const signature = JSON.stringify([input.body || input.question || '', options, input.allowFreeText === true])
      const existing = current.interaction
      const interactionId = awaitResponse ? (existing?.signature === signature ? existing.id : cryptoId()) : null
      const s = update(root, job, { state: awaitResponse ? 'waiting_user' : 'running', title: input.title || current.title,
        body: input.body ?? input.question ?? current.body,
        actions: awaitResponse ? options.map((o) => action(o.id, o.label, 'agent-answer', { jobId: job.id, questionId: job.surfaceId, description: o.description || '' })) : [action('cancel', '取消任务', 'cancel-task')],
        interaction: awaitResponse ? { id: interactionId, signature, kind: 'agent-answer', jobId: job.id, questionId: job.surfaceId } : null,
        allowFreeText: awaitResponse && input.allowFreeText === true,
        ...(input.size ? { size: input.size } : awaitResponse && existing?.id !== interactionId ? { size: 'large' } : {}),
      })
      if (!s) throw new Error('提示已关闭或过期')
      // Legacy job transcripts retain the current question, not a second queue.
      const question = { id: s.id, jobId: job.id, sessionId: job.sessionId, type: 'card', kind: input.kind || 'question',
        title: s.title, body: s.body, options, allowFreeText: s.allowFreeText, awaitResponse, status: 'waiting', createdAt: s.createdAt, updatedAt: s.updatedAt }
      job.surfaces = [question]
      job.activeSurfaceId = s.id
      return question
    },
    job(root, job, pending = null) {
      if (!job.surfaceId) return null
      if (pending) return review(root, job, pending)
      if (job.status === 'waiting') return null // model() already owns the question
      if (job.status === 'running') return null // do not overwrite model-authored progress
      const result = job.result || {}
      const failed = job.status === 'error' || result.errors?.length > 0
      const cancelled = job.status === 'cancelled'
      const actions = []
      const first = (result.applied || []).find((o) => o.path?.endsWith('.md') && o.op !== 'delete')
      if (first) actions.push(action('view', '查看', 'view-note', { path: first.path }))
      if (result.runId) actions.push(action('undo', '撤销整批', 'undo-run', { runId: result.runId }))
      if (failed) actions.push(action('retry', '重试', 'retry-agent', { jobId: job.id }), action('log', '复制日志', 'copy-log', { jobId: job.id }))
      else if (!cancelled) actions.push(action('reply', '回复', 'reply', { jobId: job.id }))
      for (const o of result.options || []) actions.push(action(`option:${o.id}`, o.label, 'agent-followup', { jobId: job.id, text: o.label, description: o.description || '' }))
      return update(root, job, { state: cancelled ? 'cancelled' : failed ? 'failed' : 'succeeded',
        title: String(job.args?.instruction || '处理笔记').split('\n')[0],
        body: cancelled ? '任务已取消；已完成的修改保留。' : String(job.error || result.reply || (failed ? result.errors.join('；') : '处理完成。')),
        actions, interaction: null, allowFreeText: false })
    },
    review,
  }
}

function cryptoId() { return randomUUID() }
