import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const META = '.dsh-notebooks.json'
const PENDING_DIR = '.dsh-notebooks/agent-pending'
const OPS = new Set(['write', 'create', 'rename', 'move', 'delete', 'frontmatter', 'todoAdd', 'todoUpdate', 'todoDelete', 'memoCreate', 'memoUpdate', 'memoDelete', 'settingsUpdate', 'setPrivacyMode'])

function manifest(root) {
  return JSON.parse(fs.readFileSync(path.join(root, META), 'utf8'))
}
function inside(root, rel) {
  const text = String(rel || '')
  if (!text || path.isAbsolute(text) || text.split(/[\\/]/).includes('..')) throw new Error('路径越界')
  const abs = path.resolve(root, text)
  const rootReal = fs.realpathSync(root)
  let real = ''
  try { real = fs.realpathSync(abs) } catch {
    let parent = path.dirname(abs)
    while (parent !== path.dirname(parent) && !fs.existsSync(parent)) parent = path.dirname(parent)
    real = path.join(fs.realpathSync(parent), path.relative(parent, abs))
  }
  if (real !== rootReal && !real.startsWith(rootReal + path.sep)) throw new Error('路径越界')
  return abs
}
export function pendingIdOf(value) {
  const id = String(value || '')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('提案 ID 不合法')
  return id
}
function pendingFile(root, id) { return path.join(root, PENDING_DIR, `${pendingIdOf(id)}.json`) }
function proposal(root, id) {
  const file = pendingFile(root, id)
  if (!fs.existsSync(file)) throw new Error('找不到提案')
  return { file, data: JSON.parse(fs.readFileSync(file, 'utf8')) }
}
function listNotes(root, notebook) {
  const dir = inside(root, notebook)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((name) => name.endsWith('.md')).map((name) => ({ path: path.join(notebook, name), title: name.replace(/\.md$/i, '') }))
}
function readNote(root, rel) {
  return { path: rel, content: fs.readFileSync(inside(root, rel), 'utf8') }
}
function validateOperations(root, operations) {
  if (!Array.isArray(operations) || !operations.length) throw new Error('operations 不能为空')
  for (const op of operations) {
    if (!op || !OPS.has(op.op)) throw new Error(`不支持的操作：${op?.op || ''}`)
    if (op.path) inside(root, op.path)
  }
  return operations
}

export const mcpTools = [
  { name: 'list_notebooks', description: '列出笔记本', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'list_notes', description: '列出某个笔记本里的笔记', inputSchema: { type: 'object', properties: { notebook: { type: 'string' } }, required: ['notebook'], additionalProperties: false } },
  { name: 'search_notes', description: '按关键词搜索笔记标题和正文', inputSchema: { type: 'object', properties: { query: { type: 'string' }, notebook: { type: 'string' } }, required: ['query'], additionalProperties: false } },
  { name: 'read_note', description: '读取一篇笔记', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false } },
  { name: 'read_todo', description: '读取待办', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'read_stickies', description: '读取便笺', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'propose_operations', description: '提出一组待确认变更，不直接写盘', inputSchema: { type: 'object', properties: { operations: { type: 'array', items: { type: 'object' } }, instruction: { type: 'string' } }, required: ['operations'], additionalProperties: false } },
  { name: 'pending_status', description: '查询提案状态', inputSchema: { type: 'object', properties: { pendingId: { type: 'string' } }, required: ['pendingId'], additionalProperties: false } },
  { name: 'cancel_pending', description: '取消未确认的提案', inputSchema: { type: 'object', properties: { pendingId: { type: 'string' } }, required: ['pendingId'], additionalProperties: false } },
]

export function callMcpTool(root, name, args = {}) {
  if (name === 'list_notebooks') return { content: [{ type: 'text', text: JSON.stringify(manifest(root).notebooks || []) }] }
  if (name === 'list_notes') return { content: [{ type: 'text', text: JSON.stringify(listNotes(root, String(args.notebook || ''))) }] }
  if (name === 'search_notes') {
    const query = String(args.query || '').toLowerCase()
    const notebooks = args.notebook ? [String(args.notebook)] : (manifest(root).notebooks || []).map((item) => item.name)
    const hits = []
    for (const notebook of notebooks) for (const note of listNotes(root, notebook)) {
      const text = readNote(root, note.path).content
      if (text.toLowerCase().includes(query)) hits.push({ ...note, excerpt: text.slice(0, 200) })
    }
    return { content: [{ type: 'text', text: JSON.stringify(hits) }] }
  }
  if (name === 'read_note') return { content: [{ type: 'text', text: readNote(root, String(args.path || '')).content }] }
  if (name === 'read_todo') return { content: [{ type: 'text', text: fs.readFileSync(path.join(root, 'todo.json'), 'utf8') }] }
  if (name === 'read_stickies') return { content: [{ type: 'text', text: JSON.stringify(manifest(root).stickies || []) }] }
  if (name === 'propose_operations') {
    const operations = validateOperations(root, args.operations)
    const id = crypto.randomUUID()
    fs.mkdirSync(path.join(root, PENDING_DIR), { recursive: true })
    const data = { id, source: 'mcp', kind: 'agent', status: 'waiting', at: new Date().toISOString(), instruction: String(args.instruction || ''), brief: `外部 MCP 提案：${operations.length} 项改动`, summary: operations.map((op) => `${op.op}: ${op.path || op.title || op.id || ''}`), signature: '', operations }
    fs.writeFileSync(pendingFile(root, id), JSON.stringify(data, null, 2))
    return { content: [{ type: 'text', text: JSON.stringify({ pendingId: id, status: 'waiting', summary: data.summary }) }] }
  }
  if (name === 'pending_status') {
    const { data } = proposal(root, String(args.pendingId || ''))
    return { content: [{ type: 'text', text: JSON.stringify({ pendingId: data.id, status: data.status, summary: data.summary }) }] }
  }
  if (name === 'cancel_pending') {
    const { file, data } = proposal(root, String(args.pendingId || ''))
    if (data.status !== 'waiting') throw new Error('提案已经处理')
    data.status = 'cancelled'; data.cancelledAt = new Date().toISOString()
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
    return { content: [{ type: 'text', text: JSON.stringify({ pendingId: data.id, status: 'cancelled' }) }] }
  }
  throw new Error(`未知工具：${name}`)
}
