/// <reference types="vite/client" />

// 库的样式入口在 package.json exports 里叫 "./style"，没有扩展名，TS 解析不到
declare module 'animal-island-ui/style';
