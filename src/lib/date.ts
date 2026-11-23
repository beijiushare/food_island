import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';

import i18n from '../i18n';

const locale = () => (i18n.language.startsWith('zh') ? 'zh-cn' : 'en');

const at = (iso: string): Dayjs => dayjs(iso).locale(locale());

/** 'YYYY-MM-DD' */
export function todayISO(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function addDays(iso: string, days: number): string {
  return dayjs(iso).add(days, 'day').format('YYYY-MM-DD');
}

/** 最近 n 天（含今天），从早到晚 */
export function recentDays(n: number): string[] {
  const today = dayjs();
  return Array.from({ length: n }, (_, i) =>
    today.subtract(n - 1 - i, 'day').format('YYYY-MM-DD'),
  );
}

/** 周几：一 / 二 / … / 日；英文 Su / Mo … */
export function weekdayShort(iso: string): string {
  return at(iso).format('dd');
}

export function dayOfMonth(iso: string): string {
  return dayjs(iso).format('D');
}

/** 11月24日 */
export function monthDayLabel(iso: string): string {
  return at(iso).format(locale() === 'zh-cn' ? 'M月D日' : 'MMM D');
}

/** 周一为一周起点 */
export function startOfWeekISO(iso: string = todayISO()): string {
  const d = dayjs(iso);
  const offset = (d.day() + 6) % 7;
  return d.subtract(offset, 'day').format('YYYY-MM-DD');
}

export function endOfWeekISO(iso: string = todayISO()): string {
  return addDays(startOfWeekISO(iso), 6);
}

export function startOfMonthISO(iso: string = todayISO()): string {
  return dayjs(iso).startOf('month').format('YYYY-MM-DD');
}

export function endOfMonthISO(iso: string = todayISO()): string {
  return dayjs(iso).endOf('month').format('YYYY-MM-DD');
}

/** 闭区间内的每一天 */
export function dayList(from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = dayjs(from);
  const end = dayjs(to);
  while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
    out.push(cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'day');
  }
  return out;
}

export function dayOfMonthNumber(iso: string): number {
  return dayjs(iso).date();
}
