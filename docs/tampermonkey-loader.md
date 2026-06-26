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

Windows 友好的 zip 下载地址：

```text
https://cdn.jsdelivr.net/gh/ActiveInsighter/FileWorkflow@cdn/fileworkflow-chatgpt-queue.user.zip
```

## 推荐安装方式

不要直接在浏览器里打开 `.user.js` 预览大文件。更推荐下面两种方式。

### 方式一：PowerShell 直接下载

```powershell
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/gh/ActiveInsighter/FileWorkflow@cdn/fileworkflow-chatgpt-queue.user.js" -OutFile "$env:USERPROFILE\Downloads\fileworkflow-chatgpt-queue.user.js"
```

如果 jsDelivr 慢，换 GitHub raw 的 `cdn` 分支：

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/ActiveInsighter/FileWorkflow/cdn/fileworkflow-chatgpt-queue.user.js" -OutFile "$env:USERPROFILE\Downloads\fileworkflow-chatgpt-queue.user.js"
```

### 方式二：下载 zip

```powershell
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/gh/ActiveInsighter/FileWorkflow@cdn/fileworkflow-chatgpt-queue.user.zip" -OutFile "$env:USERPROFILE\Downloads\fileworkflow-chatgpt-queue.user.zip"
```

下载后右键解压，得到 `fileworkflow-chatgpt-queue.user.js`。

## Tampermonkey 导入

1. 打开 Tampermonkey 管理面板。
2. 进入“实用工具 / Utilities”。
3. 选择“从文件导入 / Import from file”。
4. 选择 `fileworkflow-chatgpt-queue.user.js`。
5. 保存并启用。

也可以新建脚本，用 VS Code 或记事本打开 `.user.js`，全选复制进去保存。

## 完整脚本头部

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
