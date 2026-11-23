import { Directory, Filesystem } from '@capacitor/filesystem';

import { db } from '../data/db';

/**
 * 孤儿图片清理（技术文档 §5.8）。
 *
 * 孤儿 = 文件在 photos/ 下、但 photos 表里没有任何引用。
 * 保守策略：
 *   - 只删「不在表里」且「写入超过 24 小时」的文件（刚拍还没保存的那张不能误删）
 *   - 反向：表里有引用但文件已经不在的，清掉引用行
 *   - 默认 30 天跑一次，避免每次启动都扫盘
 */

const ROOT = 'photos';
const CLEANUP_KEY = 'photoCleanupAt';
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface CleanupResult {
  scanned: number;
  deleted: number;
  brokenRefs: number;
}

async function walk(path: string): Promise<string[]> {
  const { files: entries } = await Filesystem.readdir({ path, directory: Directory.Data });
  const files: string[] = [];

  for (const entry of entries) {
    const child = `${path}/${entry.name}`;
    if (entry.type === 'directory') {
      files.push(...(await walk(child)));
    } else {
      files.push(child);
    }
  }
  return files;
}

export async function cleanupOrphanPhotos(
  options: { force?: boolean; minAgeMs?: number } = {},
): Promise<CleanupResult | null> {
  const { force = false, minAgeMs = DAY_MS } = options;

  try {
    const last = await db.settings.get(CLEANUP_KEY);
    const lastAt = typeof last?.value === 'number' ? last.value : 0;
    if (!force && Date.now() - lastAt < MONTH_MS) return null;

    // 目录不存在（还没拍过照）直接跳过
    const files = await walk(ROOT).catch(() => [] as string[]);
    const refs = await db.photos.toArray();
    const known = new Set(refs.map((ref) => ref.relPath));
    const now = Date.now();
    let deleted = 0;

    for (const relPath of files) {
      if (known.has(relPath)) continue;

      const info = await Filesystem.stat({ path: relPath, directory: Directory.Data }).catch(
        () => null,
      );
      const mtime = info?.mtime ?? 0;
      // 刚写入的文件可能还没入库，先留着
      if (mtime && now - mtime < minAgeMs) continue;

      await Filesystem.deleteFile({ path: relPath, directory: Directory.Data }).catch(() => {});
      deleted += 1;
    }

    // 反向：引用还在但文件没了
    const onDisk = new Set(files);
    const broken = refs.filter((ref) => !onDisk.has(ref.relPath));
    if (broken.length > 0) {
      await db.photos.bulkDelete(broken.map((ref) => ref.id));
    }

    await db.settings.put({ key: CLEANUP_KEY, value: now });

    return { scanned: files.length, deleted, brokenRefs: broken.length };
  } catch {
    // 清理失败不能影响 App 使用
    return null;
  }
}
