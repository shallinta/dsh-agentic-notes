import fs from 'node:fs'
import path from 'node:path'
import { createSurfaceStore, emptySurfaceState } from './surface-store.js'

// Surface writes use their own short lock; a model call never owns this lock or
// the notebook write lock. Reload on every transaction also supports stdio MCP.
export function createFileSurfaceStore({ root, ...options }) {
  const directory = path.join(path.resolve(root), '.dsh-notebooks')
  const file = path.join(directory, 'surface-queue.json')
  const lock = path.join(directory, 'surface-queue.lock')
  const transact = (task) => {
    fs.mkdirSync(directory, { recursive: true })
    const start = Date.now()
    let fd
    while (fd === undefined) {
      try { fd = fs.openSync(lock, 'wx', 0o600); fs.writeFileSync(fd, String(process.pid)) } catch (err) {
        if (err.code !== 'EEXIST') throw err
        let stale = false
        try {
          const pid = Number(fs.readFileSync(lock, 'utf8'))
          if (pid > 0) { try { process.kill(pid, 0) } catch (e) { stale = e.code === 'ESRCH' } }
          else stale = Date.now() - fs.statSync(lock).mtimeMs > 30000
        } catch { /* retry */ }
        if (stale) {
          // Serialize recovery itself, then recheck the owner: two recoverers
          // must never unlink a fresh lock acquired by another process.
          const recovery = `${lock}.recover`
          let recoveryFd
          try {
            recoveryFd = fs.openSync(recovery, 'wx', 0o600)
            const current = Number(fs.readFileSync(lock, 'utf8'))
            let dead = false
            if (current > 0) { try { process.kill(current, 0) } catch (e) { dead = e.code === 'ESRCH' } }
            else dead = Date.now() - fs.statSync(lock).mtimeMs > 30000
            if (dead) fs.unlinkSync(lock)
          } catch (e) {
            if (!['EEXIST', 'ENOENT'].includes(e.code)) throw e
          } finally {
            if (recoveryFd !== undefined) { fs.closeSync(recoveryFd); fs.unlinkSync(recovery) }
          }
        }
        if (Date.now() - start > 5000) throw new Error('提示队列写入繁忙，请重试')
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10)
      }
    }
    try {
      const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
      const db = before ? JSON.parse(before) : emptySurfaceState()
      if (db.version !== 1 || !db.events || !db.surfaces || !db.requests || !db.checks) throw new Error('提示队列格式不支持，未覆盖原数据')
      const result = task(db)
      if (result?.then) throw new Error('提示队列事务不能等待异步任务')
      const after = JSON.stringify(db)
      if (before !== after) {
        const temporary = `${file}.${process.pid}.tmp`
        try {
          fs.writeFileSync(temporary, after, { mode: 0o600 })
          fs.renameSync(temporary, file)
        } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary) }
      }
      return result
    } finally { fs.closeSync(fd); fs.unlinkSync(lock) }
  }
  return createSurfaceStore({ ...options, transact })
}
