import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const distDir = resolve('dist');
const iifePath = resolve(distDir, 'fileworkflow-chatgpt-queue.iife.js');
const userscriptPath = resolve(distDir, 'fileworkflow-chatgpt-queue.user.js');

const userscriptHeader = `// ==UserScript==
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
// ==/UserScript==`;

const bundle = await readFile(iifePath, 'utf8');
const body = bundle
  .replace(/\n?\/\/# sourceMappingURL=fileworkflow-chatgpt-queue\.iife\.js\.map\s*$/u, '')
  .trimEnd();

await writeFile(userscriptPath, `${userscriptHeader}\n\n${body}\n`, 'utf8');

console.log(`Generated ${userscriptPath}`);
