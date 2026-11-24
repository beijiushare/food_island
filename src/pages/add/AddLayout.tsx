import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { useDraft } from '../../features/entry/draft';
import './add.css';

/**
 * 录入流程的外壳（不在 Shell 里，没有底部导航）。
 * 离开整个流程时把没保存的草稿照片真删掉，免得私有目录越攒越大。
 */
export function AddLayout() {
  const reset = useDraft((state) => state.reset);

  useEffect(() => {
    return () => {
      void reset(true);
    };
  }, [reset]);

  return (
    <div className="add">
      <Outlet />
    </div>
  );
}
