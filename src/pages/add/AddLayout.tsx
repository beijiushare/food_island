import { useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';

import type { Meal } from '../../data/types';
import { useDraft } from '../../features/entry/draft';
import { todayISO } from '../../lib/date';
import './add.css';

const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/**
 * 录入流程的外壳（不在 Shell 里，没有底部导航）。
 * 1. 从 URL 兜底当天的日期/餐次：直接打开子页面或刷新后不会丢上下文
 * 2. 离开整个流程时把没保存的草稿照片真删掉，免得私有目录越攒越大
 */
export function AddLayout() {
  const reset = useDraft((state) => state.reset);
  const setContext = useDraft((state) => state.setContext);
  const [params] = useSearchParams();

  useEffect(() => {
    const date = params.get('date') ?? todayISO();
    const mealParam = params.get('meal');
    const meal = MEALS.includes(mealParam as Meal) ? (mealParam as Meal) : 'lunch';
    // 只在草稿还没有上下文时兜底，避免覆盖结果卡里改过的日期/餐次
    if (!useDraft.getState().date) setContext(date, meal);
  }, [params, setContext]);

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
