# FileWorkflow 油猴入口脚本

把下面整段复制到 Tampermonkey 新脚本里即可。

注意：Tampermonkey 会缓存 `@require` 外部脚本。每次 CDN 包更新后，如果页面仍然运行旧代码，就把 `@version` 和 `@require` 后面的 `?v=` 一起改一下，或者删除旧脚本后重新安装。

```js
// ==UserScript==
// @name         FileWorkflow ChatGPT Queue Loader
// @namespace    https://github.com/ActiveInsighter/FileWorkflow
// @version      2026-06-26-v3
// @description  从 CDN 加载 FileWorkflow React/Vite 版 ChatGPT 消息队列面板
// @author       Tom Li
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chatgpt.com
// @grant        none
// @require      https://cdn.jsdelivr.net/gh/ActiveInsighter/FileWorkflow@cdn/fileworkflow-chatgpt-queue.iife.js?v=20260626-3
// @run-at       document-idle
// ==/UserScript==

(function () {
  console.log('[FileWorkflow] loader executed');
})();
```

如果你的仓库不是 `ActiveInsighter/FileWorkflow`，只需要改这一行：

```js
// @require      https://cdn.jsdelivr.net/gh/你的GitHub用户名/FileWorkflow@cdn/fileworkflow-chatgpt-queue.iife.js?v=20260626-3
```
