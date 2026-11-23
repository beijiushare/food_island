import { useLiveQuery } from 'dexie-react-hooks';

import { listBetween } from '../../data/dao/diary';

/** 区间内的日记条目，随 IndexedDB 变化刷新 */
export function useRangeEntries(from: string, to: string) {
  return useLiveQuery(() => listBetween(from, to), [from, to], []);
}
