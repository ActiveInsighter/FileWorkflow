import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
    lib: {
      entry: 'src/main.tsx',
      name: 'FileWorkflowChatGPTQueue',
      formats: ['iife'],
      fileName: () => 'fileworkflow-chatgpt-queue.iife.js'
    },
    rollupOptions: {
      output: {
        banner: 'var process = globalThis.process || { env: { NODE_ENV: "production" } };'
      }
    }
  }
});
