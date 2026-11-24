import { App } from '@capacitor/app';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useSheetStore } from '../features/ui/sheetStore';

/**
 * Android 返回键（技术文档 §9）：
 *   有弹窗 → 先关弹窗
 *   在录入流程 / 任意二级页 → 回上一页
 *   不在首页 → 回首页
 *   在首页 → 退出 App
 * 不接管的话按返回键会直接退到桌面。
 */
export function useAndroidBackButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const closeSheet = useSheetStore((state) => state.close);
  const sheetOpen = useSheetStore((state) => state.open);

  useEffect(() => {
    let removed = false;
    let handle: { remove: () => void } | undefined;

    void App.addListener('backButton', () => {
      if (sheetOpen && closeSheet) {
        closeSheet();
        return;
      }
      if (pathname !== '/' && pathname !== '') {
        navigate(-1);
        return;
      }
      void App.exitApp();
    }).then((listener) => {
      if (removed) void listener.remove();
      else handle = listener;
    });

    return () => {
      removed = true;
      void handle?.remove();
    };
  }, [pathname, sheetOpen, closeSheet, navigate]);
}
