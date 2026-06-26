# FileWorkflow ChatGPT Queue

这是一个 ChatGPT 消息队列自动化项目。现在采用“双入口”结构：同一套 React 面板和队列逻辑，同时构建 Chrome 扩展版和 Tampermonkey 油猴版。

## 推荐使用方式

优先使用 Chrome 扩展版：

```text
dist/extension/
```

开发或临时测试时仍可使用油猴版：

```text
dist/userscript/fileworkflow-chatgpt-queue.user.js
```

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
├─ bootstrap/              # 共享挂载逻辑，油猴和扩展共同使用
├─ entry-userscript.tsx    # Tampermonkey 油猴入口
├─ entry-extension.tsx     # Chrome Extension content script 入口
├─ app/                    # React 应用入口
├─ components/             # 纯 UI 组件
├─ features/queue/         # 队列解析、完成信号、默认文本
├─ hooks/                  # UI 状态、拖拽、队列控制器
├─ services/chatgpt/       # ChatGPT 页面 DOM 适配层
├─ services/backend/       # 后端仓储工厂，后续可切 Supabase / API
├─ services/supabase/      # Supabase REST 客户端预留
├─ shared/                 # 常量、类型、storage、timer、format
└─ styles/                 # 样式字符串注入

extension/
├─ manifest.json           # Chrome Manifest V3 配置
├─ popup.html              # 扩展图标弹窗
├─ popup.js
└─ options.html            # 扩展设置页占位

scripts/
├─ build-userscript.mjs    # 给 Vite 产物补完整油猴头部
└─ build-extension.mjs     # 复制 manifest/popup/options，并打包扩展 zip
```

## 安装依赖

```bash
npm install
```

## 构建全部产物

```bash
npm run build
```

构建结果：

```text
dist/
├─ extension/                         # Chrome 加载这个文件夹
│  ├─ manifest.json
│  ├─ content.js
│  ├─ popup.html
│  ├─ popup.js
│  └─ options.html
├─ userscript/
│  ├─ fileworkflow-chatgpt-queue.user.js
│  └─ fileworkflow-chatgpt-queue.iife.js
└─ fileworkflow-chrome-extension.zip
```

## 只构建 Chrome 扩展

```bash
npm run build:extension
```

然后打开 Chrome：

```text
chrome://extensions
```

开启“开发者模式”，点击“加载已解压的扩展程序”，选择：

```text
dist/extension
```

之后打开：

```text
https://chatgpt.com/
```

页面右侧会自动出现 FileWorkflow 队列面板。

修改扩展代码后，需要：

1. 重新运行 `npm run build:extension`。
2. 回到 `chrome://extensions`，点击 FileWorkflow 扩展卡片上的刷新按钮。
3. 刷新 ChatGPT 页面。

## 只构建油猴脚本

```bash
npm run build:userscript
```

构建结果：

```text
dist/userscript/fileworkflow-chatgpt-queue.user.js
```

这个文件自带 `// ==UserScript==` 头部，可以导入 Tampermonkey。

## CDN 发布逻辑

`.github/workflows/build-and-publish-cdn.yml` 会在推送到 `main` 或 `master` 后自动执行：

```text
GitHub push
↓
npm install
↓
npm run build
↓
发布 Chrome 扩展 zip、油猴 .user.js、油猴 zip 到 cdn 分支
↓
jsDelivr 从 cdn 分支提供 CDN 文件
```

Chrome 扩展 zip：

```text
https://cdn.jsdelivr.net/gh/ActiveInsighter/FileWorkflow@cdn/fileworkflow-chrome-extension.zip
```

油猴脚本：

```text
https://cdn.jsdelivr.net/gh/ActiveInsighter/FileWorkflow@cdn/fileworkflow-chatgpt-queue.user.js
```

## 后续建议

短期：扩展版先复用当前 React 悬浮面板。

长期：如果追求更轻、更稳定，可以把 React 面板逐步改成原生 DOM 或 Preact，同时把任务调度、跨标签页通信、日志和 Supabase 同步放到扩展的 background/service worker 中。

注意：浏览器扩展前端只能放 Supabase anon key，不能放 service_role key。需要管理员权限时，应该通过 Supabase Edge Function 或自己的后端中转。
