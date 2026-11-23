import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    // Android WebView（minSdk 26 起）都支持 ES2020 语法
    target: 'es2020',
    // foods.json 压缩后再进包
    assetsInlineLimit: 4096,
  },
});
