import fs from 'node:fs'
import path from 'node:path'

const read = (file, fallback = null) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return fallback } }
const write = (file, data) => {
  const temp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), { mode: 0o600 })
  fs.renameSync(temp, file)
}

// Import only unfinished legacy work, never replay old completed notifications.
// Caller owns the short notebook lock; no model or network operation runs here.
export function recoverTaskSurfaces(root, { store, tasks, captureAlive = () => false, questionAlive = () => false, jobAlive = () => false, onJob = () => {} }) {
  const meta = path.join(root, '.dsh-notebooks')
  const pendingOf = (id) => id && read(path.join(meta, 'agent-pending', `${id}.json`))
  const usable = (id) => { try { return id && store.get(id).visibility !== 'removed' } catch { return false } }
  const removed = (id) => { try { return id && store.get(id).visibility === 'removed' } catch { return false } }
  const manifestFile = path.join(root, '.dsh-notebooks.json')
  const manifest = read(manifestFile)
  let captureCount = 0, sessionCount = 0
  if (manifest) {
    for (const capture of manifest.captures || []) {
      if (!['pending', 'running', 'needs_input', 'needs_review'].includes(capture.status)) continue
      if (removed(capture.surfaceId)) { capture.status = 'cancelled'; capture.cancelled = true; captureCount += 1; continue }
      const pending = capture.status === 'needs_review' ? pendingOf(capture.pendingId) : null
      if (pending?.status === 'cancelled') { capture.status = 'cancelled'; capture.cancelled = true }
      if (!usable(capture.surfaceId)) tasks.bindCapture(root, capture)
      capture.surfaceRoot = root
      if ((capture.status === 'needs_input' && !questionAlive(capture))
        || (['pending', 'running'].includes(capture.status) && !captureAlive(capture))
        || (capture.status === 'needs_review' && !pending)) {
        capture.status = 'failed'
        capture.question = null
        capture.error = '上次归档已中断；日记保留，请检查后重试归档。'
      }
      tasks.capture(root, capture, pending)
      if (pending) write(path.join(meta, 'agent-pending', `${pending.id}.json`), pending)
      captureCount += 1
    }
    if (captureCount) write(manifestFile, manifest)
  }
  const directory = path.join(meta, 'agent-sessions')
  if (fs.existsSync(directory)) for (const filename of fs.readdirSync(directory)) {
    if (!filename.endsWith('.json')) continue
    const file = path.join(directory, filename), data = read(file)
    if (!data?.jobId || !data.id) continue
    if (removed(data.surfaceId)) continue
    const pending = pendingOf(data.result?.pendingId)
    const pendingWaiting = pending && (!pending.status || pending.status === 'waiting')
    if (!['waiting', 'running'].includes(data.status) && !pendingWaiting) continue
    if (jobAlive(data)) continue
    const job = { ...data, id: data.jobId, sessionId: data.id }
    if (!usable(job.surfaceId)) tasks.bindJob(root, job)
    if (pendingWaiting) tasks.job(root, job, pending)
    else if (job.status === 'waiting') {
      const question = (data.surfaces || []).find((s) => s.status === 'waiting' && s.awaitResponse)
      if (question) {
        const restored = tasks.model(root, job, { ...question, awaitResponse: true })
        job.question = { id: restored.id, surfaceId: restored.id, question: restored.body, title: restored.title, options: restored.options, allowFreeText: restored.allowFreeText }
        job.awaitingSurfaceId = restored.id
      } else {
        job.status = 'error'; job.error = '等待的问题已失效，请检查后重试。'; tasks.job(root, job)
      }
    } else {
      job.status = 'error'; job.error = '上次任务已中断，请检查结果后重试。'; tasks.job(root, job)
    }
    if (pendingWaiting) write(path.join(meta, 'agent-pending', `${pending.id}.json`), pending)
    write(file, { ...data, surfaceId: job.surfaceId, surfaceAttempt: job.surfaceAttempt, status: job.status, error: job.error || '', surfaces: job.surfaces || [], question: job.question || null })
    onJob(job)
    sessionCount += 1
  }
  return { captureCount, sessionCount }
}
