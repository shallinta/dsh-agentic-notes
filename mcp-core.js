import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createFileSurfaceStore } from './surface-persistence.js'
import { surfaceTools, callSurfaceTool, surfaceToolResult } from './surface-tools.js'

const META = '.dsh-notebooks.json'

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
function listNotes(root, notebook) {
  if (notebook === META || String(notebook).startsWith('.dsh-notebooks')) throw new Error('不能读取内部元数据')
  const dir = inside(root, notebook)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((name) => name.endsWith('.md')).map((name) => ({ path: path.join(notebook, name), title: name.replace(/\.md$/i, '') }))
}
function readNote(root, rel) {
  const clean = path.posix.normalize(String(rel).replace(/^\.\/+/, ''))
  if (clean === META || clean.startsWith('.dsh-notebooks/')) throw new Error('不能读取内部元数据')
  return { path: clean, content: fs.readFileSync(inside(root, clean), 'utf8') }
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
  ...surfaceTools,
  { name: 'list_notebooks', description: '列出笔记本', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'list_notes', description: '列出某个笔记本里的笔记', inputSchema: { type: 'object', properties: { notebook: { type: 'string' } }, required: ['notebook'], additionalProperties: false } },
  { name: 'search_notes', description: '按关键词搜索笔记标题和正文，返回完整命中文本，不截取摘要', inputSchema: { type: 'object', properties: { query: { type: 'string' }, notebook: { type: 'string' } }, required: ['query'], additionalProperties: false } },
  { name: 'notify', description: '创建通知或复用同一事件的有效 Surface，返回 surfaceId', inputSchema: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' }, surfaceId: { type: 'string' }, requestId: { type: 'string' } }, required: ['title'], additionalProperties: false } },
  { name: 'read_note', description: '读取一篇笔记', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false } },
  { name: 'read_todo', description: '读取待办', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'read_stickies', description: '读取便笺', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
]

for (const tool of mcpTools) {
  if (surfaceTools.some((entry) => entry.name === tool.name)) continue
  tool.inputSchema.properties.surfaceId = { type: 'string', description: '同一事件此前返回的 Surface ID；未提供或已移除时创建新的提示并返回 ID' }
  tool.inputSchema.properties.requestId = { type: 'string', description: '请求唯一标识，用于重复请求去重' }
  tool.inputSchema.properties.attempt = { type: 'number', description: '与 Surface ID 一起携带返回的执行尝试编号' }
}

export function callMcpTool(root, name, args = {}, options = {}) {
  if (surfaceTools.some((tool) => tool.name === name)) return surfaceToolResult(callSurfaceTool(options.store || createFileSurfaceStore({ root }), name, args))
  if (name === 'list_notebooks') return { content: [{ type: 'text', text: JSON.stringify(manifest(root).notebooks || []) }] }
  if (name === 'list_notes') return { content: [{ type: 'text', text: JSON.stringify(listNotes(root, String(args.notebook || ''))) }] }
  if (name === 'search_notes') {
    const query = String(args.query || '').toLowerCase()
    const notebooks = args.notebook ? [String(args.notebook)] : (manifest(root).notebooks || []).map((item) => item.name)
    const hits = []
    for (const notebook of notebooks) for (const note of listNotes(root, notebook)) {
      const text = readNote(root, note.path).content
      if (text.toLowerCase().includes(query) || String(note.title).toLowerCase().includes(query)) hits.push({ ...note, excerpt: text })
    }
    return { content: [{ type: 'text', text: JSON.stringify(hits) }] }
  }
  if (name === 'notify') {
    const store = options.store || createFileSurfaceStore({ root })
    let state = 'succeeded'
    if (args.surfaceId) {
      const old = store.get(args.surfaceId)
      if (old.visibility !== 'removed') state = old.status
    }
    const item = store.create({ ...args, state, source: 'mcp', kind: 'notice' })
    return surfaceToolResult(item, { ok: true, id: item.id })
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
