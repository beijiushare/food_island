import { useLiveQuery } from 'dexie-react-hooks';

import { recentFoods } from './memory';

/** 录入弹窗里的「最近吃过」 */
export function useRecentFoods(limit = 8) {
  return useLiveQuery(() => recentFoods(limit), [limit], []);
}
