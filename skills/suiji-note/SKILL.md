---
name: suiji-note
description: 连接随记 HTTP MCP，读取、搜索和管理本地笔记。写入前展示具体改动并取得用户确认；多步任务持续携带 Surface ID 复用同一提示。
---

# 随记 MCP

随记保存本地 Markdown 笔记，HTTP MCP 提供读写工具和任务提示。

## 连接与工具发现

1. 从随记设置页「外部连接」取得当前地址和 Token。不要猜测端口、Token，也不要将 Token 写入文件或日志。
2. 仅连接用户本机的 `127.0.0.1`，携带 `Authorization: Bearer <TOKEN>` 和 `Content-Type: application/json`。
3. 发送 MCP `initialize`（协议版本 `2025-06-18`），再发送 `notifications/initialized`。
4. 调用 `tools/list`，按返回的工具参数使用。不要依赖旧版本的工具清单。

业务工具包括：

- 读取：`list_notebooks`、`list_notes`、`search_notes`、`read_note`、`read_todo`、`read_stickies`。
- 笔记写入：`create_note`、`write_note`、`rename_note`、`move_note`、`delete_note`、`update_frontmatter`。
- 笔记本：`update_notebook`、`reorder_notes`、`reorder_notebooks`。
- 待办与便笺：`todo_add` / `todo_update` / `todo_delete`、`memo_create` / `memo_update` / `memo_delete`。
- 提示：`create_surface`、`update_surface`、`get_surface`、`list_surfaces`、`close_surface`；`notify` 是普通通知的兼容入口。

设置读写不通过 MCP 暴露。

## 同一事件持续携带 Surface ID

**Surface 只关联提示，不授予写入权限，也不代表用户已同意。**

多步任务开始时调用：

```json
{
  "name": "create_surface",
  "arguments": {
    "title": "整理咖啡笔记",
    "body": "正在读取相关笔记……",
    "state": "running",
    "requestId": "本次任务唯一且重试不变的标识"
  }
}
```

保存返回的 `surfaceId`、`eventId`、`attempt`。它们可能位于工具结果的 `structuredContent`，以及正文 JSON 中。

- **同一事件的每次业务工具请求携带 `surfaceId` 与返回的 `attempt`**；收到返回值后使用实际返回的 ID。
- 有效 ID 复用原提示。旧提示已在终态后关闭或过期，新业务请求会返回新 ID；后续换用新 ID。
- 用 `update_surface` 更新进展、问题或结果，并携带返回的 `attempt`。不要为每个工具调用重复创建提示。
- 标题用简短任务名，不加「Agent 正在执行」等固定前缀。只在实际进展变化时更新，不发相同内容的心跳。
- 单独一次业务调用可以不提供 ID，随记会返回对应 Surface ID。
- 多步任务最后必须明确更新为 `state: "succeeded"` 或 `state: "failed"`，并如实说明结果。工具调用结束不等于整个任务结束。
- 如果更新报告旧执行已结束或提示已移除，不要用迟到的进度重新创建提示。

例如写入时：

```json
{
  "name": "create_note",
  "arguments": {
    "surfaceId": "此前返回的 ID",
    "attempt": 1,
    "notebook": "咖啡",
    "title": "手冲参数",
    "body": "已向用户展示并得到确认的正文"
  }
}
```

任务结束时：

```json
{
  "name": "update_surface",
  "arguments": {
    "surfaceId": "当前 ID",
    "attempt": 1,
    "state": "succeeded",
    "title": "整理咖啡笔记",
    "body": "已更新三篇笔记，并调整了顺序。"
  }
}
```

示例中的 `attempt` 仅示意，必须使用工具实际返回的值。

## 输入输出完整性

- 随记端读取笔记和搜索命中文本时返回完整内容，不设置隐藏的 token 或字符配额。
- 随记内部 Agent 的公开字符设置默认是 0（不限）；显式设置非零时，返回资料会注明设置名称及截断情况。看到截断说明时，不得把片段当全文。
- 实际模型上下文与输出容量，以及外部 MCP 客户端自己的限制，仍由各自配置决定。发生超限时说明原因，由用户选择调整范围或设置；不得暗中删掉原文、历史或规则，再声称已完整处理。
- 模型服务以 `max-tokens` 结束生成时，不使用未完成的结果执行写入。Surface ID 不改变审查和确认要求。

## 用户选择与确认

可以在同一提示上设置 `state: "waiting_user"`、`options` 和 `allowFreeText`。读取 `get_surface` 中的真实用户回答后再继续；未回答就保持等待，不按超时推断同意。

等待期间不要高频轮询；没有可用的等待机制时结束当前轮次，说明正在等用户，后续继续同一事件。禁止调用任何用户专用接口替自己确认。

`close_surface` 在执行中仅暂时隐藏提示；下一次有效内容更新会重新显示。等待回答时关闭表示放弃任务。终态提示关闭后退出队列。卡片状态由宿主统一维护。

## 写入前：阅读规则、展示改动、取得确认

MCP 写工具直接修改文件，不会替调用方自动完成审查和确认。

1. 先读取目标笔记当前内容、相关标题和受影响的待办或便笺。
2. 从 `list_notebooks` 读取目标笔记本的 `manualRules` 与 `agentRules` 并遵守。冲突时 **manualRules 优先**。
3. **禁止修改 manualRules**，也禁止通过改写其他内容绕过它；`agentRules` 可以按规则维护。
4. 展示操作、目标、正文预览及影响范围，删除、移动、重命名或覆盖正文要单独说明。
5. 等待用户针对本次方案明确同意。沉默、只说「先看看」、或对其他方案的历史确认，都不算本次授权。方案改变后重新确认。
6. 确认后才执行写工具，最后报告实际结果。失败时说明原因，不能声称成功。

可以通过对话或真实用户回答完成确认；显示通知、读取数据、持有 Surface ID 都不等于确认。

## 安全

- 不将 Token 发给其他域名，不写入仓库、日志、笔记或提示正文。
- 不尝试传绝对路径或 `..`。
- 不调用不存在、未授权或用户专用的工具。
- 已安装 Skill 的更新由用户点击「安装更新」触发，直接替换现有文件，不自动安装、不备份。
