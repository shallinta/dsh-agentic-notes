---
name: suiji-mcp
description: 连接随记的 HTTP MCP 服务，读取本地笔记、搜索笔记并提交待确认的笔记变更。用户提到随记、MCP 笔记、读取/整理本地笔记时使用。
---

# 随记 MCP

随记是 DSH 的本地 Markdown 笔记插件。它提供一个 HTTP MCP 服务。

## 连接步骤

1. 让用户打开随记设置页，找到「MCP 连接」。
2. 复制设置页显示的地址和 Token。不要猜测 Token，也不要把 Token 写入文件或日志。
3. 用下面的请求头连接：

```text
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

默认地址：

```text
http://127.0.0.1:53152/dsh-agentic-notes/mcp
```

如果用户改过端口，以设置页显示为准。

## 初始化

先发送：

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"suiji-skill","version":"1.0.0"}}}
```

再发送：

```json
{"jsonrpc":"2.0","method":"notifications/initialized"}
```

之后用：

```json
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
```

## 可用工具

只读：

- `list_notebooks`
- `list_notes`
- `search_notes`
- `read_note`
- `read_todo`
- `read_stickies`

写入：

- `propose_operations`：创建待确认变更，不直接写盘
- `pending_status`
- `cancel_pending`

## 写入规则

不要声称已经写入笔记。  
`propose_operations` 只生成提案，必须让用户回随记设置页确认：

```text
设置 → 外部提案 → 审阅 → 确认执行
```

提案会校验路径、版本和操作白名单。用户确认前，文件不会改变。

## 安全

- 只连接 `127.0.0.1`。
- 不把 Token 发给其他域名。
- 不把 Token 写进仓库、日志或笔记。
- 不尝试传绝对路径或 `..`。
- 不调用不存在或未授权的工具。
