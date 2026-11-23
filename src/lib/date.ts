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
