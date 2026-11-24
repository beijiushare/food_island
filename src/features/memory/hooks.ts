import { useLiveQuery } from 'dexie-react-hooks';

import { rankedFoods } from './memory';

/** 录入页的「最近」：次数优先，其次最近 */
export function useRankedFoods(limit = 80) {
  return useLiveQuery(() => rankedFoods(limit), [limit], []);
}
