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

提示：

- `notify`：显示一条全局 toast

写入（直接落盘）：

- `create_note`
- `write_note`
- `rename_note`
- `move_note`
- `delete_note`
- `update_frontmatter`
- `todo_add` / `todo_update` / `todo_delete`
- `memo_create` / `memo_update` / `memo_delete`

## 写入规则

这些工具会直接修改笔记，不会弹出确认。  
调用前先读取目标内容，向用户说明将改什么。删除、移动、重命名前必须得到用户明确同意。

设置读写是插件内部工具，不通过 MCP 暴露。

## 安全

- 只连接 `127.0.0.1`。
- 不把 Token 发给其他域名。
- 不把 Token 写进仓库、日志或笔记。
- 不尝试传绝对路径或 `..`。
- 不调用不存在或未授权的工具。
