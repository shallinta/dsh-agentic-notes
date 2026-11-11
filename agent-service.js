// Unified business-service surface for the native agent loop and, later, MCP.
// The implementation is injected by index.js so the service never owns DSH
// context, UI state, or transport.

const METHODS = [
  'listNotebooks', 'updateNotebook', 'listNotes', 'readNote', 'readTodo', 'readStickies', 'readSettings', 'webFetch',
  'createNote', 'writeNote', 'renameNote', 'moveNote', 'deleteNote', 'updateFrontmatter',
  'todoAdd', 'todoUpdate', 'todoDelete', 'memoCreate', 'memoUpdate', 'memoDelete',
  'settingsUpdate', 'setPrivacy', 'stageOperations', 'applyOperations',
  'createSurface', 'updateSurface', 'closeSurface',
]

export function createAgentService(adapters) {
  if (!adapters || typeof adapters !== 'object') throw new Error('agent service adapters 必须是对象')
  const service = {}
  for (const name of METHODS) {
    if (typeof adapters[name] !== 'function') throw new Error(`agent service 缺少方法：${name}`)
    service[name] = (args) => adapters[name](args || {})
  }
  return service
}

export const agentServiceMethods = METHODS
