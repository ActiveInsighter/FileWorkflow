# FileWorkflow 油猴完整脚本

现在推荐使用完整单文件版，不再使用 `@require` 远程加载主体代码。

构建后会生成：

```text
fileworkflow-chatgpt-queue.user.js
```

CDN 地址：

```text
https://cdn.jsdelivr.net/gh/ActiveInsighter/FileWorkflow@cdn/fileworkflow-chatgpt-queue.user.js
```

## 使用方式

打开上面的 CDN 地址，复制整个文件内容，新建 Tampermonkey 脚本后完整粘贴保存即可。

这个文件已经自带油猴头部，例如：

```js
// ==UserScript==
// @name         FileWorkflow ChatGPT Queue
// @namespace    https://github.com/ActiveInsighter/FileWorkflow
// @version      2026.06.26.5
// @description  ChatGPT 消息队列面板，完整单文件版，无需 @require 外部主体脚本
// @author       Tom Li
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chatgpt.com
// @grant        none
// @run-at       document-idle
// @downloadURL  https://cdn.jsdelivr.net/gh/ActiveInsighter/FileWorkflow@cdn/fileworkflow-chatgpt-queue.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/ActiveInsighter/FileWorkflow@cdn/fileworkflow-chatgpt-queue.user.js
// ==/UserScript==
```

## 兼容旧 loader

`cdn` 分支仍会保留旧的 IIFE 包：

```text
https://cdn.jsdelivr.net/gh/ActiveInsighter/FileWorkflow@cdn/fileworkflow-chatgpt-queue.iife.js
```

旧 loader 如果还在，也能继续临时使用。但后续建议删除旧 loader，只保留完整 `.user.js` 脚本。

## 本地构建

```bash
npm install
npm run build
```

构建结果：

```text
dist/fileworkflow-chatgpt-queue.user.js
dist/fileworkflow-chatgpt-queue.iife.js
```

`fileworkflow-chatgpt-queue.user.js` 是完整油猴脚本，可以直接复制进 Tampermonkey。
`fileworkflow-chatgpt-queue.iife.js` 仅用于兼容旧的 `@require` loader。
