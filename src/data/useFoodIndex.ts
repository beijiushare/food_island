import { useEffect, useState } from 'react';

import { loadFoodIndex, type FoodIndex } from './foods';

interface FoodIndexState {
  index: FoodIndex | null;
  loading: boolean;
  error: Error | null;
}

/** 组件里拿成分表索引；首次调用触发懒加载，之后走单例 */
export function useFoodIndex(): FoodIndexState {
  const [state, setState] = useState<FoodIndexState>({
    index: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let alive = true;
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
  }, []);

  return state;
}
