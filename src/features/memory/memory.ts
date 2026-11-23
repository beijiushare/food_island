import { db } from '../../data/db';
import type { MemoryItem, Portion } from '../../data/types';

export interface RememberInput {
  foodCode: string | null;
  name: string;
  grams: number;
  portion?: Portion;
}

/** 记忆库的键：有 foodCode 用 foodCode，没有就按名字 */
export function memoryKey(input: { foodCode: string | null; name: string }): string {
  return input.foodCode ?? `name:${input.name.trim()}`;
}

/** 记完一顿就回写记忆库（技术文档 §2.5：修正一次，永久生效） */
export async function rememberFood(input: RememberInput): Promise<void> {
  const foodKey = memoryKey(input);
  const scene = 'unknown';
  const now = Date.now();

  const existing = await db.memory.where('[foodKey+scene]').equals([foodKey, scene]).first();

  if (!existing) {
    await db.memory.add({
      id: crypto.randomUUID(),
      foodKey,
      name: input.name,
      scene,
      grams: input.grams,
      portion: input.portion,
      usedCount: 1,
      corrections: 0,
      lastUsedAt: now,
    });
    return;
  }

  // 克数变了才算一次"修正"
  const corrected = Math.abs(existing.grams - input.grams) > 0.5;

  await db.memory.update(existing.id, {
    name: input.name,
    grams: input.grams,
    portion: input.portion,
    usedCount: existing.usedCount + 1,
    corrections: existing.corrections + (corrected ? 1 : 0),
    lastUsedAt: now,
  });
}

/** 最近吃过的食物，按最后使用时间倒序 */
export async function recentFoods(limit = 8): Promise<MemoryItem[]> {
  return db.memory.orderBy('lastUsedAt').reverse().limit(limit).toArray();
}

export async function getMemory(foodKey: string): Promise<MemoryItem | undefined> {
  return db.memory.where('foodKey').equals(foodKey).first();
}
