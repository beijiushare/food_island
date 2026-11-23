import { db } from '../db';
import type { DiaryEntry } from '../types';

export type NewEntryInput = Omit<DiaryEntry, 'id' | 'createdAt'>;

const byCreatedAt = (a: DiaryEntry, b: DiaryEntry) => a.createdAt - b.createdAt;

export async function listByDate(date: string): Promise<DiaryEntry[]> {
  const rows = await db.diary.where('date').equals(date).toArray();
  return rows.sort(byCreatedAt);
}

export async function listBetween(from: string, to: string): Promise<DiaryEntry[]> {
  const rows = await db.diary.where('date').between(from, to, true, true).toArray();
  return rows.sort(byCreatedAt);
}

/** 全部记录，按日期升序（导出用） */
export async function listAll(): Promise<DiaryEntry[]> {
  const rows = await db.diary.toArray();
  return rows.sort((a, b) =>
    a.date === b.date ? a.createdAt - b.createdAt : a.date.localeCompare(b.date),
  );
}

export async function addEntry(input: NewEntryInput): Promise<DiaryEntry> {
  // 脏数据在写入时就拦住，不要等到列表里显示 NaN
  if (!Number.isFinite(input.grams) || input.grams <= 0) {
    throw new Error(`addEntry: 非法克数 ${String(input.grams)}`);
  }
  const entry: DiaryEntry = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  await db.diary.add(entry);
  return entry;
}

export async function updateEntry(id: string, patch: Partial<DiaryEntry>): Promise<void> {
  await db.diary.update(id, patch);
}

/** 整条替换：用来把可选字段（portion/scene）真的清掉 */
export async function putEntry(entry: DiaryEntry): Promise<void> {
  await db.diary.put(entry);
}

export async function deleteEntry(id: string): Promise<void> {
  // 图片文件由 services/photo 负责，P5 接入时在这里包一个事务
  await db.diary.delete(id);
}

/** 给定日期区间里哪些天有记录（DateStrip 的小圆点） */
export async function markedDates(from: string, to: string): Promise<string[]> {
  const rows = await db.diary.where('date').between(from, to, true, true).toArray();
  return [...new Set(rows.map((row) => row.date))];
}
