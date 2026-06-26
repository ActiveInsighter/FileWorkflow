import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'FileWorkflow',
    short_name: 'FileWorkflow',
    version: '0.2.0',
    manifest_version: 3,
    description: 'ChatGPT 消息队列、任务执行和文件工作流辅助扩展。',
    permissions: ['storage', 'tabs'],
    host_permissions: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
    action: {
      default_title: 'FileWorkflow'
    },
    commands: {
      'toggle-panel': {
        suggested_key: {
          default: 'Alt+Shift+F'
        },
        description: '显示或隐藏 FileWorkflow 面板'
      }
    }
  }
});
