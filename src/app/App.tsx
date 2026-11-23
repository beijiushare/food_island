import { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';

import { cleanupOrphanPhotos } from '../services/photoCleanup';
import { AppRouter } from './router';

export function App() {
  useEffect(() => {
    // 启动时顺手扫一次孤儿图片（默认 30 天一次，失败静默）
    void cleanupOrphanPhotos();
  }, []);

  return (
    <HashRouter>
      <AppRouter />
    </HashRouter>
  );
}
