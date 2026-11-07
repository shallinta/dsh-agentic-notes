import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-test-home-'))
process.env.DSH_HOME = home
process.on('exit', () => { try { fs.rmSync(home, { recursive: true, force: true }) } catch { /* ignore */ } })
