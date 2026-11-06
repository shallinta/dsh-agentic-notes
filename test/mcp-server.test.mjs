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
  assert.equal(JSON.parse(lines[1]).result.tools.length, 9)
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

test('propose_operations creates a pending proposal', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-mcp-propose-'))
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify({ notebooks: [{ name: 'A' }], stickies: [] }))
  const child = spawn(process.execPath, ['mcp-server.js'], { env: { ...process.env, DSAN_ROOT: root } })
  const lines = []
  child.stdout.on('data', (chunk) => lines.push(...String(chunk).split('\n').filter(Boolean)))
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'propose_operations', arguments: { operations: [{ op: 'create', notebook: 'A', title: 'x', body: 'y' }] } } }) + '\n')
  await new Promise((resolve) => setTimeout(resolve, 100))
  child.kill()
  const result = JSON.parse(JSON.parse(lines[0]).result.content[0].text)
  assert.equal(result.status, 'waiting')
  assert.equal(fs.existsSync(path.join(root, '.dsh-notebooks', 'agent-pending', `${result.pendingId}.json`)), true)
  fs.rmSync(root, { recursive: true, force: true })
})

test('MCP proposal rejects path escape', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-mcp-escape-'))
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify({ notebooks: [{ name: 'A' }], stickies: [] }))
  const child = spawn(process.execPath, ['mcp-server.js'], { env: { ...process.env, DSAN_ROOT: root } })
  const lines = []
  child.stdout.on('data', (chunk) => lines.push(...String(chunk).split('\n').filter(Boolean)))
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'propose_operations', arguments: { operations: [{ op: 'write', path: '../x.md' }] } } }) + '\n')
  await new Promise((resolve) => setTimeout(resolve, 100))
  child.kill()
  assert.match(JSON.parse(lines[0]).error.message, /路径越界/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('cancel_pending marks a waiting proposal cancelled', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-mcp-cancel-'))
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify({ notebooks: [{ name: 'A' }], stickies: [] }))
  const child = spawn(process.execPath, ['mcp-server.js'], { env: { ...process.env, DSAN_ROOT: root } })
  const lines = []
  child.stdout.on('data', (chunk) => lines.push(...String(chunk).split('\n').filter(Boolean)))
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'propose_operations', arguments: { operations: [{ op: 'create', notebook: 'A', title: 'x', body: 'y' }] } } }) + '\n')
  await new Promise((resolve) => setTimeout(resolve, 50))
  const id = JSON.parse(JSON.parse(lines[0]).result.content[0].text).pendingId
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'cancel_pending', arguments: { pendingId: id } } }) + '\n')
  await new Promise((resolve) => setTimeout(resolve, 50))
  child.kill()
  assert.equal(JSON.parse(JSON.parse(lines[1]).result.content[0].text).status, 'cancelled')
  fs.rmSync(root, { recursive: true, force: true })
})
