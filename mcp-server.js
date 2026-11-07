#!/usr/bin/env node
// Read-only MCP stdio adapter. Start with DSAN_ROOT pointing at a managed
// notes root. Writes are intentionally not exposed in this phase.
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import crypto from 'node:crypto'

const ROOT = process.env.DSAN_ROOT || ''
const META = '.dsh-notebooks.json'
const PENDING_DIR = '.dsh-notebooks/agent-pending'
const OPS = new Set(['write', 'create', 'rename', 'move', 'delete', 'frontmatter', 'todoAdd', 'todoUpdate', 'todoDelete', 'memoCreate', 'memoUpdate', 'memoDelete', 'settingsUpdate', 'setPrivacyMode'])

function manifest() {
  if (!ROOT) throw new Error('DSAN_ROOT 未设置')
  return JSON.parse(fs.readFileSync(path.join(ROOT, META), 'utf8'))
}
function inside(rel) {
  const text = String(rel || '')
  if (!text || path.isAbsolute(text) || text.split(/[\\/]/).includes('..')) throw new Error('路径越界')
  const abs = path.resolve(ROOT, text)
  const rootReal = fs.realpathSync(ROOT)
  let real = ''
  try { real = fs.realpathSync(abs) } catch {
    let parent = path.dirname(abs)
    while (parent !== path.dirname(parent) && !fs.existsSync(parent)) parent = path.dirname(parent)
    real = path.join(fs.realpathSync(parent), path.relative(parent, abs))
  }
  if (real !== rootReal && !real.startsWith(rootReal + path.sep)) throw new Error('路径越界')
  return abs
}
function pendingIdOf(value) {
  const id = String(value || '')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('提案 ID 不合法')
  return id
}
function listNotes(notebook) {
  const dir = inside(notebook)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((name) => name.endsWith('.md')).map((name) => {
    const rel = path.join(notebook, name)
    return { path: rel, title: name.replace(/\.md$/i, '') }
  })
}
function readNote(rel) {
  const text = fs.readFileSync(inside(rel), 'utf8')
  return { path: rel, content: text }
}

function pendingFile(id) { return path.join(ROOT, PENDING_DIR, `${pendingIdOf(id)}.json`) }
function proposal(id) {
  const file = pendingFile(id)
  if (!fs.existsSync(file)) throw new Error('找不到提案')
  return { file, data: JSON.parse(fs.readFileSync(file, 'utf8')) }
}
function validateOperations(operations) {
  if (!Array.isArray(operations) || !operations.length) throw new Error('operations 不能为空')
  for (const op of operations) {
    if (!op || !OPS.has(op.op)) throw new Error(`不支持的操作：${op?.op || ''}`)
    if (op.path) {
      if (path.isAbsolute(op.path) || String(op.path).split(/[\\/]/).includes('..')) throw new Error('路径越界')
      inside(op.path)
    }
  }
  return operations
}

const tools = [
  { name: 'list_notebooks', description: '列出笔记本', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'list_notes', description: '列出某个笔记本里的笔记', inputSchema: { type: 'object', properties: { notebook: { type: 'string' } }, required: ['notebook'], additionalProperties: false } },
  { name: 'search_notes', description: '按关键词搜索笔记标题和正文', inputSchema: { type: 'object', properties: { query: { type: 'string' }, notebook: { type: 'string' } }, required: ['query'], additionalProperties: false } },
  { name: 'read_note', description: '读取一篇笔记', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false } },
  { name: 'propose_operations', description: '提出一组待确认变更，不直接写盘', inputSchema: { type: 'object', properties: { operations: { type: 'array', items: { type: 'object' } }, instruction: { type: 'string' } }, required: ['operations'], additionalProperties: false } },
  { name: 'pending_status', description: '查询提案状态', inputSchema: { type: 'object', properties: { pendingId: { type: 'string' } }, required: ['pendingId'], additionalProperties: false } },
  { name: 'cancel_pending', description: '取消未确认的提案', inputSchema: { type: 'object', properties: { pendingId: { type: 'string' } }, required: ['pendingId'], additionalProperties: false } },
  { name: 'read_todo', description: '读取待办', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'read_stickies', description: '读取便笺', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
]

function callTool(name, args) {
  if (name === 'propose_operations') {
    const operations = validateOperations(args.operations)
    const id = crypto.randomUUID()
    fs.mkdirSync(path.join(ROOT, PENDING_DIR), { recursive: true })
    const data = {
      id, source: 'mcp', kind: 'agent', status: 'waiting', at: new Date().toISOString(),
      instruction: String(args.instruction || ''), brief: `外部 MCP 提案：${operations.length} 项改动`,
      summary: operations.map((op) => `${op.op}: ${op.path || op.title || op.id || ''}`),
      signature: '', operations,
    }
    fs.writeFileSync(pendingFile(id), JSON.stringify(data, null, 2))
    return { content: [{ type: 'text', text: JSON.stringify({ pendingId: id, status: 'waiting', summary: data.summary }) }] }
  }
  if (name === 'pending_status') {
    const { data } = proposal(String(args.pendingId || ''))
    return { content: [{ type: 'text', text: JSON.stringify({ pendingId: data.id, status: data.status, summary: data.summary }) }] }
  }
  if (name === 'cancel_pending') {
    const { file, data } = proposal(String(args.pendingId || ''))
    if (data.status !== 'waiting') throw new Error('提案已经处理')
    data.status = 'cancelled'; data.cancelledAt = new Date().toISOString()
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
    return { content: [{ type: 'text', text: JSON.stringify({ pendingId: data.id, status: 'cancelled' }) }] }
  }
  if (name === 'list_notebooks') return { content: [{ type: 'text', text: JSON.stringify(manifest().notebooks || []) }] }
  if (name === 'list_notes') return { content: [{ type: 'text', text: JSON.stringify(listNotes(String(args.notebook || ''))) }] }
  if (name === 'search_notes') {
    const query = String(args.query || '').toLowerCase()
    const notebooks = args.notebook ? [String(args.notebook)] : (manifest().notebooks || []).map((item) => item.name)
    const hits = []
    for (const notebook of notebooks) {
      for (const note of listNotes(notebook)) {
        const text = readNote(note.path).content
        if (text.toLowerCase().includes(query)) hits.push({ ...note, excerpt: text.slice(0, 200) })
      }
    }
    return { content: [{ type: 'text', text: JSON.stringify(hits) }] }
  }
  if (name === 'read_note') return { content: [{ type: 'text', text: readNote(String(args.path || '')).content }] }
  if (name === 'read_todo') return { content: [{ type: 'text', text: JSON.stringify(JSON.parse(fs.readFileSync(path.join(ROOT, 'todo.json'), 'utf8'))) }] }
  if (name === 'read_stickies') return { content: [{ type: 'text', text: JSON.stringify(manifest().stickies || []) }] }
  throw new Error(`未知工具：${name}`)
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
rl.on('line', (line) => {
  if (!line.trim()) return
  let request
  try { request = JSON.parse(line) } catch { return }
  if (!request.id) return
  const reply = (result) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: request.id, result })}\n`)
  const fail = (message) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32603, message } })}\n`)
  try {
    if (request.method === 'initialize') return reply({ protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'suiji-readonly', version: '0.1.0' } })
    if (request.method === 'tools/list') return reply({ tools })
    if (request.method === 'tools/call') return reply(callTool(request.params?.name, request.params?.arguments || {}))
    return fail(`未知方法：${request.method}`)
  } catch (err) { fail(String(err?.message ?? err)) }
})
