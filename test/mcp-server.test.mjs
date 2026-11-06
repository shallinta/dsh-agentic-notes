import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

test('read-only MCP initialize and tools/list', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-mcp-'))
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify({ notebooks: [{ name: 'A' }], stickies: [] }))
  const child = spawn(process.execPath, ['mcp-server.js'], { env: { ...process.env, DSAN_ROOT: root } })
  const lines = []
  child.stdout.on('data', (chunk) => lines.push(...String(chunk).split('\n').filter(Boolean)))
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }) + '\n')
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n')
  await new Promise((resolve) => setTimeout(resolve, 100))
  child.kill()
  fs.rmSync(root, { recursive: true, force: true })
  assert.equal(JSON.parse(lines[0]).result.serverInfo.name, 'suiji-readonly')
  assert.equal(JSON.parse(lines[1]).result.tools.length, 6)
})
