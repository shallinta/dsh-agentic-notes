#!/usr/bin/env node
// stdio MCP adapter. Prefer the in-plugin HTTP endpoint when available.
import readline from 'node:readline'
import { mcpTools } from './mcp-core.js'
import { callHttpMcpTool } from './index.js'
import { execFileSync } from 'node:child_process'
function pluginCommit() { try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim() } catch { return 'unknown' } }

const ROOT = process.env.DSAN_ROOT || ''
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
rl.on('line', async (line) => {
  if (!line.trim()) return
  let request
  try { request = JSON.parse(line) } catch { return }
  if (request.id === undefined) return
  const reply = (result) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: request.id, result })}\n`)
  const fail = (message) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32603, message } })}\n`)
  try {
    if (!ROOT) throw new Error('DSAN_ROOT 未设置')
    if (request.method === 'initialize') return reply({ protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'suiji', version: '0.3.0', commit: pluginCommit() } })
    if (request.method === 'tools/list') return reply({ tools: mcpTools })
    if (request.method === 'tools/call') {
      if (!mcpTools.some((tool) => tool.name === request.params?.name)) throw new Error('stdio 仅支持读取和任务提示，写入请使用 HTTP MCP')
      return reply(await callHttpMcpTool(ROOT, request.params?.name, request.params?.arguments || {}))
    }
    return fail(`未知方法：${request.method}`)
  } catch (err) { fail(String(err?.message ?? err)) }
})
