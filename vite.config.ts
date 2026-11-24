import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * animal-island-ui 会把自带的 @fontsource 字体全部打进包：
 *   Noto Sans SC（中文，3 个权重 ≈ 3.4 MB）
 *   Nunito（西文数字，≈ 50 KB）
 *   Zen Maru Gothic（日文，3 个权重 ≈ 4.4 MB）← 我们的中文由 Noto Sans SC 覆盖，永远用不到
 * 这个插件只剃掉日文字体的 @font-face，中文与西文渲染零变化。
 */
function stripFonts(...needles: string[]): Plugin {
  return {
    name: 'food-island:strip-fonts',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.css')) return null;
      if (!needles.some((needle) => code.includes(needle))) return null;
      const cleaned = code.replace(/@font-face\s*\{[^{}]*\}/g, (block) =>
        needles.some((needle) => block.includes(needle)) ? '' : block,
      );
      return { code: cleaned, map: null };
    },
  };
}

export default defineConfig({
  plugins: [stripFonts('zen-maru-gothic'), react()],
  server: {
    host: true,
    // 5173 常被其它项目占用，食岛固定用 5199
    port: 5199,
    strictPort: true,
    proxy: {
      // 浏览器直连 DeepSeek 会被 CORS 拦，开发期走代理
      '/api/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepseek/, ''),
      },
    },
    watch: {
      // Android 工程与本地产物不参与热更新
      ignored: ['**/android/**', '**/dist/**', '**/.claude_temp/**'],
    },
  },
  build: {
    // Android WebView（minSdk 26 起）都支持 ES2020 语法
    target: 'es2020',
    assetsInlineLimit: 4096,
  },
});
