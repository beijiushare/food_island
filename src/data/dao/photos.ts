import { db } from '../db';
import type { PhotoRef } from '../types';

export async function addPhotoRef(ref: PhotoRef): Promise<void> {
  await db.photos.add(ref);
}

export async function getPhotoByEntry(entryId: string): Promise<PhotoRef | undefined> {
  return db.photos.where('entryId').equals(entryId).first();
}

/** 删记录时一起清掉图片引用，返回被删的引用方便删文件 */
export async function deletePhotoByEntry(entryId: string): Promise<PhotoRef[]> {
  const refs = await db.photos.where('entryId').equals(entryId).toArray();
  if (refs.length > 0) {
    await db.photos.bulkDelete(refs.map((ref) => ref.id));
  }
  return refs;
}
