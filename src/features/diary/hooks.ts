import { useLiveQuery } from 'dexie-react-hooks';

import { markedDates, listByDate } from '../../data/dao/diary';
import { getTargets } from '../../data/dao/settings';
import { DEFAULT_TARGETS, type Targets } from '../../data/types';

/** 某一天的日记条目，随 IndexedDB 变化自动刷新 */
export function useDayEntries(date: string) {
  return useLiveQuery(() => listByDate(date), [date], []);
}

/** 哪些天有记录 */
export function useMarkedDates(from: string, to: string): Set<string> {
  const dates = useLiveQuery(() => markedDates(from, to), [from, to], []);
  return new Set(dates);
}

/** 每日目标；还没读出来时先用默认值，避免界面跳动 */
export function useTargets(): Targets {
  const stored = useLiveQuery(() => getTargets(), [], null);
  return stored ?? DEFAULT_TARGETS;
}
