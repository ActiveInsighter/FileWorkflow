# Chrome 扩展开发与安装

## 构建扩展

```bash
npm install
npm run build:extension
```

构建输出：

```text
dist/extension/
├─ manifest.json
├─ content.js
├─ popup.html
├─ popup.js
└─ options.html
```

## 本地加载扩展

1. 打开 Chrome。
2. 地址栏输入：

```text
chrome://extensions
```

3. 打开右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择项目里的：

```text
dist/extension
```

6. 打开或刷新：

```text
https://chatgpt.com/
```

页面右侧会出现 FileWorkflow 队列面板。

## 修改代码后的刷新流程

每次修改 `src/`、`extension/` 或构建配置后：

```bash
npm run build:extension
```

然后：

1. 到 `chrome://extensions`。
2. 找到 FileWorkflow 扩展。
3. 点击刷新按钮。
4. 刷新 ChatGPT 页面。

## 文件关系

```text
extension/manifest.json
```

声明扩展权限、匹配网址、content script、popup 和 options。

```text
src/entry-extension.tsx
```

Chrome 扩展 content script 入口。

```text
src/bootstrap/mountApp.tsx
```

共享挂载逻辑，油猴和 Chrome 扩展都会复用它。

```text
vite.extension.config.ts
```

把 `src/entry-extension.tsx` 打包成 `dist/extension/content.js`。

```text
scripts/build-extension.mjs
```

把 `extension/manifest.json`、popup、options 复制到 `dist/extension`，并尝试生成 `dist/fileworkflow-chrome-extension.zip`。

## 发布给自己使用

如果只是自己用，不需要上传 Chrome Web Store。保留 `dist/extension` 文件夹，然后用“加载已解压的扩展程序”即可。

如果要发给别人，可以发：

```text
dist/fileworkflow-chrome-extension.zip
```

别人解压后，在 Chrome 里加载解压后的文件夹。
