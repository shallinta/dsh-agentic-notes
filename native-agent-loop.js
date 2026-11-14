// DSH-native tool loop prototype.
// Dependency-injected so it can be exercised with a fake stream before it is
// wired into the plugin. It never creates a Host session on its own.

function textOf(value) {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return ''
  return value.map((part) => (part?.type === 'text' ? String(part.text || '') : '')).join('')
}

function assistantMessage(text, calls, provider, model, replayState) {
  return {
    role: 'assistant',
    content: assistantContent(text, calls),
    source: { kind: 'model', provider, model, ...(replayState === undefined ? {} : { replayState }) },
  }
}

function assistantContent(text, calls) {
  const content = []
  if (text) content.push({ type: 'text', text })
  for (const call of calls) content.push({ type: 'tool-call', id: call.id, name: call.name, arguments: call.raw })
  return content
}

function toolResult(call, text, isError) {
  return {
    role: 'tool',
    toolCallId: call.id,
    source: { kind: 'tool', callId: call.id },
    isError: isError === true,
    content: [{ type: 'text', text: String(text || '') }],
  }
}

async function collectTurn(stream) {
  let text = ''
  let finish = null
  const calls = new Map()
  for await (const chunk of stream) {
    if (!chunk || typeof chunk !== 'object') continue
    if (chunk.type === 'text-delta') text += String(chunk.text || '')
    if (chunk.type === 'tool-call-delta') {
      const index = Number(chunk.index ?? 0)
      const current = calls.get(index) || { index, id: '', name: '', arguments: '' }
      if (chunk.id) current.id = String(chunk.id)
      if (chunk.name) current.name = String(chunk.name)
      if (chunk.argumentsDelta) current.arguments += String(chunk.argumentsDelta)
      calls.set(index, current)
    }
    if (chunk.type === 'block-end' && chunk.block?.type === 'tool-call') {
      const index = Number(chunk.index ?? calls.size)
      const current = calls.get(index) || { index, id: '', name: '', arguments: '' }
      if (chunk.block.id) current.id = String(chunk.block.id)
      if (chunk.block.name) current.name = String(chunk.block.name)
      if (chunk.block.arguments !== undefined) {
        current.arguments = typeof chunk.block.arguments === 'string'
          ? chunk.block.arguments
          : JSON.stringify(chunk.block.arguments)
      }
      calls.set(index, current)
    }
    if (chunk.type === 'finish') finish = chunk
  }
  return { text: text.trim(), calls: [...calls.values()].sort((a, b) => a.index - b.index), finish }
}

/**
 * Run one native-tool conversation.
 *
 * @param {object} options
 * @param {{stream: Function}} options.llm
 * @param {string} options.provider
 * @param {string} options.model
 * @param {Array} options.messages mutable message history
 * @param {string} [options.system]
 * @param {Array} options.tools ToolSchema[] from DSH
 * @param {(call: {id:string,name:string,args:object}) => Promise<{text:string,isError?:boolean}>} options.executeTool
 * @param {AbortSignal} [options.signal]
 * @param {number} [options.maxRounds]
 * @param {number} [options.maxToolCalls]
 * @param {(state:object) => void} [options.onProgress]
 */
export function validateToolArguments(tools, name, args) {
  const tool = (tools || []).find((entry) => entry.name === name)
  if (!tool) return `未知工具：${name}`
  if (!args || typeof args !== 'object' || Array.isArray(args)) return '工具参数必须是对象'
  const schema = tool.parameters || {}
  for (const key of schema.required || []) {
    if (!(key in args)) return `缺少必填参数：${key}`
  }
  for (const [key, value] of Object.entries(args)) {
    const property = schema.properties?.[key]
    if (!property) {
      if (schema.additionalProperties === false) return `不允许的参数：${key}`
      continue
    }
    if (property.type === 'string' && typeof value !== 'string') return `参数 ${key} 需要字符串`
    if (property.type === 'boolean' && typeof value !== 'boolean') return `参数 ${key} 需要布尔值`
    if (property.type === 'array' && !Array.isArray(value)) return `参数 ${key} 需要数组`
    if (property.type === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) return `参数 ${key} 需要对象`
    if (Array.isArray(property.enum) && !property.enum.includes(value)) return `参数 ${key} 不在允许值内`
  }
  return ''
}

export async function runNativeToolLoop(options) {
  const {
    llm, provider, model, messages, system = '', tools = [], executeTool,
    signal, maxRounds = 20, maxToolCalls = Infinity,
  } = options
  if (!llm || typeof llm.stream !== 'function') throw new Error('模型服务不可用')
  if (!provider || !model) throw new Error('没有可用的默认模型')
  if (!Array.isArray(messages)) throw new Error('messages 必须是数组')
  let toolCalls = 0
  let usage = { input: 0, output: 0 }

  for (let round = 0; round < Math.max(1, maxRounds); round += 1) {
    if (signal?.aborted || options.isCancelled?.()) throw Object.assign(new Error('已取消'), { cancelled: true })
    const request = {
      provider, model, system, messages, tools,
      ...(signal ? { signal } : {}),
    }
    const turn = await collectTurn(llm.stream(request))
    if (signal?.aborted || options.isCancelled?.()) throw Object.assign(new Error('已取消'), { cancelled: true })
    const reason = turn.finish?.reason
    if (reason?.kind === 'aborted') throw Object.assign(new Error('已取消'), { cancelled: true })
    if (reason?.kind === 'error') throw Object.assign(new Error(reason.failure?.message || '模型调用失败'), { fromModel: true, code: reason.failure?.code || '' })
    if (reason?.usage) {
      usage = {
        input: usage.input + (Number(reason.usage.inputTokens) || 0),
        output: usage.output + (Number(reason.usage.outputTokens) || 0),
      }
    }
    if (reason?.kind === 'max-tokens') throw Object.assign(new Error('模型服务返回输出长度上限（max-tokens），本轮生成未完成'), { fromModel: true, code: 'MAX_TOKENS' })
    if (!turn.calls.length) {
      if (turn.text) messages.push(assistantMessage(turn.text, [], provider, model, turn.finish?.replayState))
      return { text: turn.text, messages, toolCalls, usage, rounds: round + 1 }
    }

    const parsed = []
    for (const raw of turn.calls) {
      const id = raw.id || `call-${round}-${raw.index}`
      const name = raw.name || ''
      let args = null
      let error = ''
      try { args = raw.arguments ? JSON.parse(raw.arguments) : {} } catch { error = '工具参数不是合法 JSON' }
      if (!name) error = '工具调用缺少 name'
      parsed.push({ id, name, raw: raw.arguments, args, error })
    }
    messages.push(assistantMessage(turn.text, parsed, provider, model, turn.finish?.replayState))
    const finishCall = parsed.find((call) => call.name === 'finish')
    if (finishCall) {
      if (finishCall.error) throw new Error(finishCall.error)
      const reply = String(finishCall.args?.reply || '')
      messages.push(toolResult(finishCall, reply, false))
      for (const extra of parsed) if (extra.id !== finishCall.id) messages.push(toolResult(extra, '未执行：已结束本轮', true))
      return { text: reply || turn.text, messages, toolCalls, usage, rounds: round + 1 }
    }
    for (const call of parsed) {
      if (signal?.aborted || options.isCancelled?.()) throw Object.assign(new Error('已取消'), { cancelled: true })
      toolCalls += 1
      if (toolCalls > maxToolCalls) throw new Error('工具调用次数超过上限')
      let text = ''
      let isError = false
      let stopTurn = null
      if (call.error) {
        text = JSON.stringify({ error: call.error, expected: '合法 JSON 参数' })
        isError = true
      } else {
        const schemaError = validateToolArguments(tools, call.name, call.args)
        if (schemaError) {
          text = JSON.stringify({ error: schemaError })
          isError = true
        } else try {
          const result = await executeTool({ id: call.id, name: call.name, args: call.args })
          text = typeof result === 'string' ? result : JSON.stringify(result ?? {})
          isError = result?.isError === true
          if (result?.stopTurn) stopTurn = result
        } catch (err) {
          text = JSON.stringify({ error: String(err?.message ?? err) })
          isError = true
        }
      }
      messages.push(toolResult(call, text, isError))
      if (stopTurn) {
        for (const extra of parsed.slice(parsed.indexOf(call) + 1)) messages.push(toolResult(extra, '未执行：等待用户', true))
        return { text: turn.text, messages, toolCalls, usage, rounds: round + 1, waiting: true, surfaceId: stopTurn.surfaceId }
      }
    }
    if (typeof options.onProgress === 'function') {
      options.onProgress({ round: round + 1, toolCalls, usage })
    }
  }
  throw new Error('模型工具调用超过轮次上限')
}

export const nativeLoopInternals = { collectTurn, textOf }
