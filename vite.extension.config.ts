import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    outDir: 'dist/extension',
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
    lib: {
      entry: 'src/entry-extension.tsx',
      name: 'FileWorkflowExtensionContent',
      formats: ['iife'],
      fileName: () => 'content.js'
    },
    rollupOptions: {
      output: {
        banner: 'var process = globalThis.process || { env: { NODE_ENV: "production" } };'
      }
    }
  }
});
