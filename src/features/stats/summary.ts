import type { DiaryEntry } from '../../data/types';
import { dayList, dayOfMonthNumber } from '../../lib/date';

export interface DayTotal {
  date: string;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  entries: number;
}

export interface MacroShare {
  protein: number;
  carb: number;
  fat: number;
}

export interface RangeSummary {
  days: DayTotal[];
  totalDays: number;
  recordedDays: number;
  averageKcal: number;
  maxDay: DayTotal | null;
  /** 按供能比算：蛋白 4、碳水 4、脂肪 9 kcal/g */
  macroShare: MacroShare;
}

export function summarizeByDay(entries: DiaryEntry[]): Map<string, DayTotal> {
  const map = new Map<string, DayTotal>();

  for (const entry of entries) {
    const day = map.get(entry.date) ?? {
      date: entry.date,
      kcal: 0,
      protein: 0,
      carb: 0,
      fat: 0,
      entries: 0,
    };
    day.kcal += entry.nutrients.kcal ?? 0;
    day.protein += entry.nutrients.protein ?? 0;
    day.carb += entry.nutrients.carb ?? 0;
    day.fat += entry.nutrients.fat ?? 0;
    day.entries += 1;
    map.set(entry.date, day);
  }

  return map;
}

/** 区间汇总：缺的日期补 0，保证图表连续 */
export function buildSummary(entries: DiaryEntry[], from: string, to: string): RangeSummary {
  const byDay = summarizeByDay(entries);
  const days = dayList(from, to).map(
    (date) =>
      byDay.get(date) ?? { date, kcal: 0, protein: 0, carb: 0, fat: 0, entries: 0 },
  );

  const recorded = days.filter((day) => day.entries > 0);
  const recordedDays = recorded.length;
  const totalKcal = recorded.reduce((sum, day) => sum + day.kcal, 0);

  const maxDay =
    recorded.length > 0
      ? recorded.reduce((best, day) => (day.kcal > best.kcal ? day : best), recorded[0])
      : null;

  const proteinKcal = recorded.reduce((sum, day) => sum + day.protein, 0) * 4;
  const carbKcal = recorded.reduce((sum, day) => sum + day.carb, 0) * 4;
  const fatKcal = recorded.reduce((sum, day) => sum + day.fat, 0) * 9;
  const energyTotal = proteinKcal + carbKcal + fatKcal;

  const share = (part: number) => (energyTotal > 0 ? Math.round((part / energyTotal) * 100) : 0);

  return {
    days,
    totalDays: days.length,
    recordedDays,
    averageKcal: recordedDays > 0 ? Math.round(totalKcal / recordedDays) : 0,
    maxDay,
    macroShare: {
      protein: share(proteinKcal),
      carb: share(carbKcal),
      fat: share(fatKcal),
    },
  };
}

export interface WeekBucket {
  label: string;
  kcal: number;
  days: number;
}

/** 本月按「第几周」聚合成 4~5 根柱子 */
export function bucketByWeek(days: DayTotal[]): WeekBucket[] {
  const buckets = new Map<number, WeekBucket>();

  for (const day of days) {
    const week = Math.floor((dayOfMonthNumber(day.date) - 1) / 7) + 1;
    const bucket = buckets.get(week) ?? { label: `${week}周`, kcal: 0, days: 0 };
    bucket.kcal += day.kcal;
    if (day.entries > 0) bucket.days += 1;
    buckets.set(week, bucket);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, bucket]) => bucket);
}
