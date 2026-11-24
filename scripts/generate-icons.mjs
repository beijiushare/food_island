#!/usr/bin/env node
/**
 * assets/app-icon.svg → android mipmap-* + public/favicon.png
 *
 * 用 sharp 做真正的 SVG 光栅化（之前的「无头浏览器截图」在小尺寸下会截偏）。
 *
 * 用法：node scripts/generate-icons.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets', 'app-icon.svg');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');

const svg = fs.readFileSync(SRC);

/** 渲染一张正方形透明 PNG；inset < 1 时居中留白（给自适应图标安全区用） */
async function render(size, out, inset = 1) {
  const art = Math.round(size * inset);

  // 以较高 density 光栅化，再缩到目标尺寸，边缘更干净
  const artBuffer = await sharp(svg, { density: 384 })
    .resize(art, art, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  if (art === size) {
    fs.writeFileSync(out, artBuffer);
    return;
  }

  const pad = Math.round((size - art) / 2);
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: artBuffer, left: pad, top: pad }])
    .png()
    .toFile(out);
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
  await render(size, out);
  fs.copyFileSync(out, path.join(dir, 'ic_launcher_round.png'));
  count += 2;
  console.log(`  ${density}  ${size}×${size}`);
}

for (const [density, size] of FOREGROUND) {
  const dir = path.join(RES, `mipmap-${density}`);
  await render(size, path.join(dir, 'ic_launcher_foreground.png'), 0.92);
  count += 1;
  console.log(`  ${density}  foreground ${size}×${size}`);
}

const publicDir = path.join(ROOT, 'public');
fs.mkdirSync(publicDir, { recursive: true });
await render(64, path.join(publicDir, 'favicon.png'));
count += 1;

// 校验生成的尺寸
const check = await sharp(path.join(publicDir, 'favicon.png')).metadata();
console.log(`  favicon  ${check.width}×${check.height}`);
console.log(`✓ 生成 ${count} 张图标`);
