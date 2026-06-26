# FileWorkflow 油猴入口脚本

把下面整段复制到 Tampermonkey 新脚本里即可。以后 React/Vite 项目更新后，只要 GitHub Actions 成功发布到 `cdn` 分支，这个入口脚本通常不用改。

```js
// ==UserScript==
// @name         FileWorkflow ChatGPT Queue Loader
// @namespace    https://github.com/ActiveInsighter/FileWorkflow
// @version      2026-06-26-v1
// @description  从 CDN 加载 FileWorkflow React/Vite 版 ChatGPT 消息队列面板
// @author       Tom Li
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chatgpt.com
// @grant        none
// @require      https://cdn.jsdelivr.net/gh/ActiveInsighter/FileWorkflow@cdn/fileworkflow-chatgpt-queue.iife.js
// @run-at       document-idle
// ==/UserScript==
```

如果你的仓库不是 `ActiveInsighter/FileWorkflow`，只需要改这一行：

```js
// @require      https://cdn.jsdelivr.net/gh/你的GitHub用户名/FileWorkflow@cdn/fileworkflow-chatgpt-queue.iife.js
```
