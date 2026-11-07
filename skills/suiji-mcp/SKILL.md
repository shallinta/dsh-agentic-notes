---
name: suiji-mcp
description: 连接随记的 HTTP MCP 服务，读取、搜索并写入本地笔记；写入前必须让用户审查具体改动并明确确认。用户提到随记、MCP 笔记、读取/整理本地笔记时使用。
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

## 写入规则：必须先审查再确认

这些工具会直接修改文件，不会弹插件确认框。  
所以写入前必须由你完成审查步骤，不能直接调用写工具。

### 第一步：读取目标

在提出改动前，先用只读工具读取：

- 目标笔记当前内容
- 目标笔记本里的相关标题
- 待办或便笺的当前状态

### 第二步：向用户展示改动

用下面的格式给用户看，不要只写“我将修改笔记”：

```text
准备写入：
- 操作：write / create / delete / rename / move
- 目标：<笔记本>/<笔记路径>
- 变更：<新增/删除/替换了什么>
- 正文预览：<关键段落或完整新内容>
- 影响：<会覆盖哪些内容、是否删除文件、是否移动图片>
```

如果一次有多个操作，逐条列出。

删除、移动、重命名、覆盖已有正文必须单独说明。

### 第三步：等待明确确认

只有用户明确回复以下意思之一，才可以调用写工具：

- 确认
- 可以
- 执行
- 没问题
- 按这个改

以下回复不算确认：

- 沉默
- “先看看”
- “你觉得呢”
- 只回复了方案的一部分
- 只说了“继续”但没有针对具体改动

如果用户修改了方案，重新展示改动并再次确认。

### 第四步：执行并报告

确认后：

1. 调用对应写工具。
2. 报告实际结果，例如：
   ```text
   已写入：<路径>
   ```
3. 如果工具返回错误，原样说明，不要声称成功。

### 禁止

- 不要在用户确认前调用任何写工具。
- 不要把“已读取”当成“已确认”。
- 不要因为用户之前确认过别的改动，就默认这次也确认。
- 不要用 notify 代替确认步骤。

设置读写是插件内部工具，不通过 MCP 暴露。

## 安全

- 只连接 `127.0.0.1`。
- 不把 Token 发给其他域名。
- 不把 Token 写进仓库、日志或笔记。
- 不尝试传绝对路径或 `..`。
- 不调用不存在或未授权的工具。
