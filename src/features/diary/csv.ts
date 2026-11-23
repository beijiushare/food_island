import type { DiaryEntry } from '../../data/types';

const MEAL_LABEL: Record<DiaryEntry['meal'], string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
};

const CSV_HEADER = [
  '日期',
  '餐次',
  '食物',
  '克数',
  '口径',
  '热量kcal',
  '蛋白质g',
  '脂肪g',
  '碳水g',
  '膳食纤维g',
  '钠mg',
  '食物编码',
  '来源',
];

function escapeCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** 日记 → CSV 文本（风险 5：导出必须 P2 就有） */
export function diaryToCsv(entries: DiaryEntry[]): string {
  const rows = entries.map((entry) => [
    entry.date,
    MEAL_LABEL[entry.meal],
    entry.name,
    Math.round(entry.grams),
    entry.basis === 'edible' ? '可食部' : '带骨壳',
    Math.round(entry.nutrients.kcal ?? 0),
    entry.nutrients.protein ?? 0,
    entry.nutrients.fat ?? 0,
    entry.nutrients.carb ?? 0,
    entry.nutrients.fiber ?? 0,
    entry.nutrients.na ?? 0,
    entry.foodCode ?? '',
    entry.source,
  ]);

  return [CSV_HEADER, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

export function csvFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `food-island-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}.csv`;
}
