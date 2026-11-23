import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cheng.foodisland',
  appName: '食岛',
  webDir: 'dist',
  android: {
    // WebView 背景跟页面一致的暖米色，避免启动瞬间白闪
    backgroundColor: '#f8f8f0',
  },
  plugins: {
    Keyboard: {
      // 输入框不被键盘遮挡（设计文档 §7.2）
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      // 背景是暖米色，状态栏用深色文字
      style: 'DARK',
      backgroundColor: '#f8f8f0',
      overlaysWebView: false,
    },
  },
};

export default config;
