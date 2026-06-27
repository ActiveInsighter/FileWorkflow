# FileWorkflow

FileWorkflow 是一个 WXT + React + TypeScript 的 Chrome Manifest V3 扩展工程，用于在 ChatGPT Web 前端记录和执行可恢复的工作流队列。

## 技术栈

```text
框架：WXT
语言：TypeScript
UI：React
构建：WXT
扩展标准：Manifest V3
数据库：Supabase，可选
```

## 消息队列格式

队列输入框前两行必填任务和事件名称：

```text
[task: 408 逐节整理]
[event: 数据结构第 1 章]
```

后续内容由链接和轮询消息组成。

### 链接 Activity

链接必须写成：

```text
<https://chatgpt.com/>
```

只有完整的 `https://` 链接才会被识别为 Activity 切换指令。执行到链接时，扩展会保存当前运行状态，替换当前网页地址，并在新页面继续执行后续消息。

### 轮询消息

轮询消息写成：

```text
{继续总结下一小节}*10
```

含义是把花括号里的消息连续执行 10 次。`*次数` 可以省略，省略时默认执行 1 次。

支持最多三层嵌套：

```text
{
  {这个执行一次}*1
  {这个执行两次}*2
  {
    {这是最里层，执行三次}*3
  }
}
```

解析后会展开为后端 JSON 队列，每个普通消息项大致形如：

```json
{
  "type": "message",
  "content": "继续总结下一小节",
  "activityIndex": 1,
  "repeatIndex": 1,
  "repeatTotal": 10,
  "loopPath": [1, 1]
}
```

链接项大致形如：

```json
{
  "type": "url",
  "content": "<https://chatgpt.com/>",
  "url": "https://chatgpt.com/",
  "activityIndex": 1
}
```

## 结束和暂停规则

单条消息结束检测暂时保持原逻辑：扩展通过 ChatGPT 页面 DOM 判断 assistant 回复内容稳定、生成按钮恢复、输入框可用。

Event 结束不再匹配关键词。每条消息结束后，扩展会读取数据库状态字段：

```text
workflow_events.status
workflow_activities.status
```

规则如下：

```text
event.status = paused / waiting / pause / hold
=> 扩展暂停，不再继续发消息

event.status = succeeded / completed / done / ended / finished / cancelled / failed
=> 当前事件结束，扩展停止继续发送

activity.status = succeeded / completed / done / ended / finished / closed / cancelled / failed
=> 当前 Activity 结束，跳过本 Activity 剩余轮询消息，直接执行下一个 <https://...> 链接
```

随机等待、用户暂停、用户结束等状态变化，也会写回 `workflow_events.status`。

## Supabase 字段

核心表仍然是：

```text
workflow_tasks
workflow_events
workflow_activities
```

本版本给 `workflow_activities` 增加轮询队列相关字段：

```text
polling_queue jsonb
current_polling_index integer
polling_repeat_total integer
polling_repeat_done integer
last_polled_at timestamptz
```

`workflow_events.message_queue` 保存整个事件展开后的消息队列，`workflow_activities.polling_queue` 保存当前 Activity 的轮询消息子队列。

## 开发

```bash
npm install
npm run dev
```

开发目录：

```text
.output/chrome-mv3-dev
```

## 构建

```bash
npm run build
```

正式扩展目录：

```text
.output/chrome-mv3
```

Chrome 打开 `chrome://extensions`，开启开发者模式，选择“加载已解压的扩展程序”，加载 `.output/chrome-mv3`。

## GitHub Actions

推送到 `main` 后会自动执行 `.github/workflows/build-extension.yml`，构建并上传 `fileworkflow-chrome-extension` artifact。
