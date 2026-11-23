import React from 'react';
import ReactDOM from 'react-dom/client';

import 'animal-island-ui/style';
import './styles/tokens.css';
import './styles/global.css';

import { App } from './app/App';
import './i18n';

// 开发期调试入口：window.__fi.cleanupOrphanPhotos({ force: true })
if (import.meta.env.DEV) {
  void import('./services/photoCleanup').then((mod) => {
    (window as unknown as Record<string, unknown>).__fi = mod;
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
