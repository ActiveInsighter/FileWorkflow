# FileWorkflow

FileWorkflow 已迁移为 WXT + React + TypeScript 的 Chrome Manifest V3 扩展工程。

## 技术栈

```text
框架：WXT
语言：TypeScript
UI：React
构建：WXT
扩展标准：Manifest V3
```

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
