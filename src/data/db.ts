import Dexie, { type Table } from 'dexie';

import type { DiaryEntry, MemoryItem, PhotoRef, Setting } from './types';

/**
 * Dexie schema（技术文档 §5.6）。
 * 升级时 version(2) 追加，不要改动已发布的 version(1)。
 */
export class FoodDB extends Dexie {
  diary!: Table<DiaryEntry, string>;
  memory!: Table<MemoryItem, string>;
  photos!: Table<PhotoRef, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('food-island');
    this.version(1).stores({
      diary: 'id, date, [date+meal], createdAt',
      memory: 'id, foodKey, [foodKey+scene], lastUsedAt',
      photos: 'id, entryId, createdAt',
      settings: 'key',
    });
  }
}

export const db = new FoodDB();
