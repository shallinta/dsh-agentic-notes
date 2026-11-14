import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import readline from 'node:readline'
import { once } from 'node:events'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

async function exchange(root, requests) {
  const child = spawn(process.execPath, ['mcp-server.js'], { env: { ...process.env, DSAN_ROOT: root } })
  const reader = readline.createInterface({ input: child.stdout })
  const lines = []
  let timer, errors = ''
  child.stderr.on('data', (chunk) => { errors += chunk })
  try {
    const result = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`MCP response timeout: ${errors}`)), 5000)
      child.once('error', reject)
      child.once('exit', () => { if (lines.length < requests.length) reject(new Error(`MCP exited early: ${errors}`)) })
      reader.on('line', (line) => {
        try { lines.push(JSON.parse(line)); if (lines.length === requests.length) resolve(lines) } catch (err) { reject(err) }
      })
    })
    for (const request of requests) child.stdin.write(JSON.stringify(request) + '\n')
    return await result
  } finally {
    clearTimeout(timer)
    reader.close()
    if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill(); await exited }
  }
}

test('read-only MCP initialize and tools/list', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-mcp-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify({ notebooks: [{ name: 'A' }], stickies: [] }))
  const lines = await exchange(root, [
    { jsonrpc: '2.0', id: 1, method: 'initialize' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
  ])
  assert.equal(lines[0].result.serverInfo.name, 'suiji')
  const names = lines[1].result.tools.map((tool) => tool.name)
  for (const name of ['list_notebooks', 'read_note', 'notify', 'create_surface', 'update_surface', 'get_surface', 'list_surfaces', 'close_surface']) assert.ok(names.includes(name), name)
  assert.equal(new Set(names).size, names.length)
})

test('search_notes finds content inside DSAN_ROOT', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-mcp-search-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.mkdirSync(path.join(root, 'A'))
  fs.writeFileSync(path.join(root, 'A', 'one.md'), '# one\n\nUNIQUE_SEARCH_42\n')
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify({ notebooks: [{ name: 'A' }], stickies: [] }))
  const [line] = await exchange(root, [{ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_notes', arguments: { query: 'UNIQUE_SEARCH_42' } } }])
  assert.match(line.result.content[0].text, /A\/one\.md/)
  assert.ok(line.result.structuredContent.surfaceId)
})

test('MCP read_note rejects internal metadata', async () => {
  const { callMcpTool } = await import('../mcp-core.js')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-mcp-private-'))
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify({ notebooks: [{ name: 'A' }], stickies: [] }))
  assert.throws(() => callMcpTool(root, 'read_note', { path: '.dsh-notebooks.json' }), /内部元数据/)
  assert.throws(() => callMcpTool(root, 'read_note', { path: './.dsh-notebooks.json' }), /内部元数据/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('legacy notification lock does not block the unified Surface queue', async () => {
  const { callMcpTool } = await import('../mcp-core.js')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-lock-'))
  fs.writeFileSync(path.join(root, '.dsh-notebooks.json'), JSON.stringify({ notebooks: [{ name: 'A' }], stickies: [] }))
  fs.mkdirSync(path.join(root, '.dsh-notebooks'))
  fs.writeFileSync(path.join(root, '.dsh-notebooks', 'notifications.lock'), '999999')
  const out = callMcpTool(root, 'notify', { title: 'after-lock', body: 'ok' })
  assert.match(out.content[0].text, /ok/)
  fs.rmSync(root, { recursive: true, force: true })
})
