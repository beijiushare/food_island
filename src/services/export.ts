import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import type { DiaryEntry } from '../data/types';
import { csvFileName, diaryToCsv } from '../features/diary/csv';

/** 原生：写到 App 缓存目录再调系统分享；浏览器：直接下载 */
export async function exportDiaryCsv(entries: DiaryEntry[]): Promise<void> {
  const csv = diaryToCsv(entries);
  const name = csvFileName();

  if (!Capacitor.isNativePlatform()) {
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const written = await Filesystem.writeFile({
    path: `exports/${name}`,
    data: `\ufeff${csv}`,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  await Share.share({ title: name, url: written.uri, dialogTitle: '导出饮食记录' });
}
