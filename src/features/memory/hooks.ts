import { useLiveQuery } from 'dexie-react-hooks';

import { rankedFoods, recentFoods } from './memory';

/** 录入弹窗里的「最近吃过」 */
export function useRecentFoods(limit = 8) {
  return useLiveQuery(() => recentFoods(limit), [limit], []);
}

/** 录入页的「最近」：次数优先，其次最近 */
export function useRankedFoods(limit = 80) {
  return useLiveQuery(() => rankedFoods(limit), [limit], []);
}
