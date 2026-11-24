#!/usr/bin/env node
/**
 * assets/app-icon.svg → android/app/src/main/res/mipmap-* + public/favicon.png
 *
 * 用无头 Edge 截图渲染（不引额外依赖）：
 *   legacy  ic_launcher.png / ic_launcher_round.png  mdpi 48 → xxxhdpi 192
 *   adaptive ic_launcher_foreground.png              108dp 画布，图形缩到 92%
 *
 * 用法：node scripts/generate-icons.mjs
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets', 'app-icon.svg');
const TMP = path.join(ROOT, '.claude_temp', 'icon-render');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');

const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

const browser = EDGE_CANDIDATES.find((p) => fs.existsSync(p));
if (!browser) {
  console.error('找不到 Edge / Chrome，无法渲染图标');
  process.exit(1);
}

fs.mkdirSync(TMP, { recursive: true });

/** 渲染一张透明底 PNG */
function render({ size, inset = 1, out }) {
  const art = Math.round(size * inset);
  const html = `<!doctype html><html><body style="margin:0;background:transparent">
<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">
<img src="${pathToFileUrl(SRC)}" style="width:${art}px;height:${art}px" />
</div></body></html>`;

  const page = path.join(TMP, `page-${size}-${Math.round(inset * 100)}.html`);
  fs.writeFileSync(page, html, 'utf8');

  execFileSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--user-data-dir=${path.join(TMP, 'profile')}`,
      `--window-size=${size},${size}`,
      '--default-background-color=00000000',
      `--screenshot=${out}`,
      pathToFileUrl(page),
    ],
    { stdio: 'ignore' },
  );
}

function pathToFileUrl(p) {
  return 'file:///' + p.replace(/\\/g, '/').replace(/ /g, '%20');
}

const DENSITIES = [
  ['mdpi', 48],
  ['hdpi', 72],
  ['xhdpi', 96],
  ['xxhdpi', 144],
  ['xxxhdpi', 192],
];

const FOREGROUND = [
  ['mdpi', 108],
  ['hdpi', 162],
  ['xhdpi', 216],
  ['xxhdpi', 324],
  ['xxxhdpi', 432],
];

let count = 0;

for (const [density, size] of DENSITIES) {
  const dir = path.join(RES, `mipmap-${density}`);
  const out = path.join(dir, 'ic_launcher.png');
  render({ size, inset: 1, out });
  fs.copyFileSync(out, path.join(dir, 'ic_launcher_round.png'));
  count += 2;
  console.log(`  ${density}  ${size}×${size}`);
}

for (const [density, size] of FOREGROUND) {
  const dir = path.join(RES, `mipmap-${density}`);
  const out = path.join(dir, 'ic_launcher_foreground.png');
  render({ size, inset: 0.92, out });
  count += 1;
  console.log(`  ${density}  foreground ${size}×${size}`);
}

// 浏览器 favicon
const publicDir = path.join(ROOT, 'public');
fs.mkdirSync(publicDir, { recursive: true });
render({ size: 64, inset: 1, out: path.join(publicDir, 'favicon.png') });
count += 1;

console.log(`✓ 生成 ${count} 张图标`);
