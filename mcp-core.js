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
function pendingFile(root, id) { return inside(root, path.join(PENDING_DIR, `${pendingIdOf(id)}.json`)) }
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
    if (op.op === 'write') {
      if (!op.path) throw new Error('write 必须提供 path')
      if (typeof op.content !== 'string') throw new Error('write 必须提供 content（可为空字符串）')
    }
    if (op.op === 'delete' && !op.path) throw new Error('delete 必须提供 path')
    if (op.op === 'create' && (!op.notebook || !op.title)) throw new Error('create 必须提供 notebook 和 title')
  }
  return operations
}
export function proposalSignature(root) {
  const files = fs.readdirSync(root, { recursive: true }).filter((name) => String(name).endsWith('.md')).sort()
  const hash = crypto.createHash('sha256')
  for (const rel of files) {
    const abs = path.join(root, String(rel))
    const stat = fs.statSync(abs)
    hash.update(`${rel}:${stat.size}:${stat.mtimeMs}
`)
  }
  hash.update(fs.readFileSync(path.join(root, META), 'utf8'))
  return hash.digest('hex')
}

export const mcpTools = [
  { name: 'list_notebooks', description: '列出笔记本', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'list_notes', description: '列出某个笔记本里的笔记', inputSchema: { type: 'object', properties: { notebook: { type: 'string' } }, required: ['notebook'], additionalProperties: false } },
  { name: 'search_notes', description: '按关键词搜索笔记标题和正文', inputSchema: { type: 'object', properties: { query: { type: 'string' }, notebook: { type: 'string' } }, required: ['query'], additionalProperties: false } },
  { name: 'read_note', description: '读取一篇笔记', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false } },
  { name: 'read_todo', description: '读取待办', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'read_stickies', description: '读取便笺', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
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
  if (name === 'read_todo') {
    const primary = inside(root, path.join('便笺', 'todo.json'))
    const fallback = inside(root, 'todo.json')
    return { content: [{ type: 'text', text: fs.readFileSync(fs.existsSync(primary) ? primary : fallback, 'utf8') }] }
  }
  if (name === 'read_stickies') {
    const stickies = (manifest(root).stickies || []).map((sticky) => {
      let items = []
      try { items = fs.readFileSync(inside(root, sticky.file), 'utf8').split('\n').map((line) => line.replace(/^[-*+]\s*/, '').trim()).filter(Boolean) } catch { /* ignore */ }
      return { ...sticky, items }
    })
    return { content: [{ type: 'text', text: JSON.stringify(stickies) }] }
  }
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
  if (name === 'read_todo') {
    const primary = inside(root, path.join('便笺', 'todo.json'))
    const fallback = inside(root, 'todo.json')
    return { content: [{ type: 'text', text: fs.readFileSync(fs.existsSync(primary) ? primary : fallback, 'utf8') }] }
  }
  if (name === 'read_stickies') {
    const stickies = (manifest(root).stickies || []).map((sticky) => {
      let items = []
      try { items = fs.readFileSync(inside(root, sticky.file), 'utf8').split('\n').map((line) => line.replace(/^[-*+]\s*/, '').trim()).filter(Boolean) } catch { /* ignore */ }
      return { ...sticky, items }
    })
    return { content: [{ type: 'text', text: JSON.stringify(stickies) }] }
  }
  throw new Error(`未知工具：${name}`)
}
