#!/usr/bin/env node
// Read-only MCP stdio adapter. Start with DSAN_ROOT pointing at a managed
// notes root. Writes are intentionally not exposed in this phase.
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

const ROOT = process.env.DSAN_ROOT || ''
const META = '.dsh-notebooks.json'

function manifest() {
  if (!ROOT) throw new Error('DSAN_ROOT 未设置')
  return JSON.parse(fs.readFileSync(path.join(ROOT, META), 'utf8'))
}
function inside(rel) {
  const abs = path.resolve(ROOT, rel)
  if (!abs.startsWith(path.resolve(ROOT) + path.sep)) throw new Error('路径越界')
  return abs
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

const tools = [
  { name: 'list_notebooks', description: '列出笔记本', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'list_notes', description: '列出某个笔记本里的笔记', inputSchema: { type: 'object', properties: { notebook: { type: 'string' } }, required: ['notebook'], additionalProperties: false } },
  { name: 'read_note', description: '读取一篇笔记', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false } },
  { name: 'read_todo', description: '读取待办', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'read_stickies', description: '读取便笺', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
]

function callTool(name, args) {
  if (name === 'list_notebooks') return { content: [{ type: 'text', text: JSON.stringify(manifest().notebooks || []) }] }
  if (name === 'list_notes') return { content: [{ type: 'text', text: JSON.stringify(listNotes(String(args.notebook || ''))) }] }
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
