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
  assert.equal(JSON.parse(lines[0]).result.serverInfo.name, 'suiji')
  assert.equal(JSON.parse(lines[1]).result.tools.length, 7)
})

test('search_notes finds content inside DSAN_ROOT', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-mcp-search-'))
  fs.mkdirSync(path.join(root, 'A'))
  fs.writeFileSync(path.join(root, 'A', 'one.md'), '# one\n\nUNIQUE_SEARCH_42\n')
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify({ notebooks: [{ name: 'A' }], stickies: [] }))
  const child = spawn(process.execPath, ['mcp-server.js'], { env: { ...process.env, DSAN_ROOT: root } })
  const lines = []
  child.stdout.on('data', (chunk) => lines.push(...String(chunk).split('\n').filter(Boolean)))
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_notes', arguments: { query: 'UNIQUE_SEARCH_42' } } }) + '\n')
  await new Promise((resolve) => setTimeout(resolve, 100))
  child.kill()
  fs.rmSync(root, { recursive: true, force: true })
  const result = JSON.parse(lines[0]).result
  assert.match(result.content[0].text, /A\/one\.md/)
})


test('MCP read_note rejects internal metadata', async () => {
  const { callMcpTool } = await import('../mcp-core.js')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-mcp-private-'))
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify({ notebooks: [{ name: 'A' }], stickies: [] }))
  assert.throws(() => callMcpTool(root, 'read_note', { path: '.dsh-notebooks.json' }), /内部元数据/)
  assert.throws(() => callMcpTool(root, 'read_note', { path: './.dsh-notebooks.json' }), /内部元数据/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('stale notification lock is recovered', async () => {
  const { callMcpTool } = await import('../mcp-core.js')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-lock-'))
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify({ notebooks: [{ name: 'A' }], stickies: [] }))
  fs.mkdirSync(path.join(root, '.dsh-notebooks'))
  fs.writeFileSync(path.join(root, '.dsh-notebooks', 'notifications.lock'), '999999')
  const out = callMcpTool(root, 'notify', { title: 'after-lock', body: 'ok' })
  assert.match(out.content[0].text, /ok/)
  fs.rmSync(root, { recursive: true, force: true })
})
