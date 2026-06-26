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
    sourcemap: true,
    minify: 'esbuild',
    lib: {
      entry: 'src/main.tsx',
      name: 'FileWorkflowChatGPTQueue',
      formats: ['iife'],
      fileName: () => 'fileworkflow-chatgpt-queue.iife.js'
    }
  }
});
