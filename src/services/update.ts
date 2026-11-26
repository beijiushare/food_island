import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import pkg from '../../package.json';

/**
 * 版本检查：读 GitHub Releases 的 latest，和本机版本比。
 * 不自动下载/安装，只把下载地址交给系统浏览器。
 */

const REPO = 'beijiushare/food_island';
const API = `https://api.github.com/repos/${REPO}/releases/latest`;

export interface UpdateInfo {
  version: string;
  url: string;
  notes?: string;
}

function parseVersion(value: string): number[] {
  return value
    .replace(/^v/i, '')
    .split(/[.+-]/)
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10) || 0);
}

/** latest 是否比 current 新 */
export function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
    if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
  }
  return false;
}

export async function getAppVersion(): Promise<string> {
  if (!Capacitor.isNativePlatform()) return pkg.version;
  try {
    const info = await App.getInfo();
    return info.version || pkg.version;
  } catch {
    return pkg.version;
  }
}

/** 有新版返回信息，已是最新返回 null */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(API, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (response.status === 404) return null; // 还没发过 Release
    if (!response.ok) throw new Error(`GitHub ${response.status}`);

    const data = (await response.json()) as {
      tag_name?: string;
      html_url?: string;
      body?: string;
      assets?: { name?: string; browser_download_url?: string }[];
    };

    const version = String(data.tag_name ?? '').replace(/^v/i, '');
    if (!version) throw new Error('Release 没有 tag');

    const current = await getAppVersion();
    if (!isNewer(version, current)) return null;

    const asset = (data.assets ?? []).find((item) => String(item.name ?? '').endsWith('.apk'));
    return {
      version,
      url: asset?.browser_download_url ?? data.html_url ?? `https://github.com/${REPO}/releases`,
      notes: data.body,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** 交给系统浏览器（WebView 里直接跳转会被拦） */
export function openInBrowser(url: string): void {
  const opened = window.open(url, '_system');
  if (!opened) window.open(url, '_blank');
}
