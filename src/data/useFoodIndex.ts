import { useEffect, useState } from 'react';

import { loadFoodIndex, type FoodIndex } from './foods';

interface FoodIndexState {
  index: FoodIndex | null;
  loading: boolean;
  error: Error | null;
}

/**
 * 组件里拿成分表索引。
 * enabled=false 时不触发加载——保证启动首页不会白白拉 700 KB 的 foods.json。
 */
export function useFoodIndex(enabled = true): FoodIndexState {
  const [state, setState] = useState<FoodIndexState>({
    index: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setState((prev) => (prev.index ? prev : { ...prev, loading: true }));
    loadFoodIndex().then(
      (index) => {
        if (alive) setState({ index, loading: false, error: null });
      },
      (error: unknown) => {
        if (alive) {
          setState({
            index: null,
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
    );
    return () => {
      alive = false;
    };
  }, [enabled]);

  return state;
}
