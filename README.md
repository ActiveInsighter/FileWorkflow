# FileWorkflow ChatGPT Queue

这是一个 React + Vite 版本的 ChatGPT 消息队列油猴项目。源码保持模块化开发，构建时会同时生成完整 `.user.js` 油猴脚本和兼容旧 loader 的 IIFE 包。

## 当前功能

- 悬浮玻璃面板
- 消息队列编辑器
- 一行一条消息
- `---` / `===` 分隔多行消息
- `<https://...>` URL 命令：切换页面后自动恢复队列
- 开始、暂停、结束、保存
- 随机等待
- 回复完成检测
- 检测“完成/完毕/结束”等任务完成信号
- 完成后自动滚动
- 面板拖拽、折叠、位置记忆
- 预留 Supabase REST 同步入口

## 项目分层

```text
src/
├─ app/                    # React 应用入口
├─ components/             # 纯 UI 组件
├─ features/queue/         # 队列解析、完成信号、默认文本
├─ hooks/                  # UI 状态、拖拽、队列控制器
├─ services/chatgpt/       # ChatGPT 页面 DOM 适配层
├─ services/backend/       # 后端仓储工厂，后续可切 Supabase / API
├─ services/supabase/      # Supabase REST 客户端预留
├─ shared/                 # 常量、类型、storage、timer、format
└─ styles/                 # 样式字符串注入
scripts/
└─ build-userscript.mjs    # 给 Vite 产物补完整油猴头部，生成 .user.js
```

## 安装依赖

```bash
npm install
```

## 本地开发

```bash
npm run dev
```

## 构建

```bash
npm run build
```

构建结果：

```text
dist/fileworkflow-chatgpt-queue.user.js
dist/fileworkflow-chatgpt-queue.iife.js
```

推荐使用：

```text
dist/fileworkflow-chatgpt-queue.user.js
```

这个文件是完整油猴脚本，自带 `// ==UserScript==` 头部和全部业务代码，可以整段复制到 Tampermonkey。

`fileworkflow-chatgpt-queue.iife.js` 只用于兼容旧的 `@require` loader。

## CDN 发布逻辑

`.github/workflows/build-and-publish-cdn.yml` 会在推送到 `main` 或 `master` 后自动执行：

```text
GitHub push
↓
npm install
↓
npm run build
↓
把 dist/fileworkflow-chatgpt-queue.user.js 和 iife 包推送到 cdn 分支
↓
jsDelivr 从 cdn 分支提供 CDN 文件
```

推荐 CDN 地址：

```text
https://cdn.jsdelivr.net/gh/ActiveInsighter/FileWorkflow@cdn/fileworkflow-chatgpt-queue.user.js
```

兼容旧 loader 的 IIFE 地址：

```text
https://cdn.jsdelivr.net/gh/ActiveInsighter/FileWorkflow@cdn/fileworkflow-chatgpt-queue.iife.js
```

## 油猴完整脚本

见：

```text
docs/tampermonkey-loader.md
```

## Supabase 后续扩展建议

当前已经预留：

```text
src/services/supabase/supabaseRestClient.ts
src/services/backend/taskRepositoryFactory.ts
```

建议后续任务表字段：

```text
task_id              text primary key
name                 text
status               text
total_count          integer
completed_count      integer
started_at_ms         bigint
finished_at_ms        bigint
updated_at_ms         bigint
prompt_text           text
settings              jsonb
logs                  jsonb
```

注意：油猴前端只能放 Supabase anon key，不能放 service_role key。需要管理员权限时，应该通过 Supabase Edge Function 或自己的后端中转。
