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

/**
 * 渲染一张正方形 PNG。
 * background:
 *   'none'   透明
 *   'white'  白底方块（旧版图标、favicon）
 *   'circle' 白底圆形（round 图标，四角保持透明）
 * inset < 1 时居中留白
 */
async function render(size, out, inset = 1, background = 'none') {
  const art = Math.round(size * inset);
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

  // 以较高 density 光栅化，再缩到目标尺寸，边缘更干净
  const artBuffer = await sharp(svg, { density: 384 })
    .resize(art, art, { fit: 'contain', background: transparent })
    .png()
    .toBuffer();

  const pad = Math.round((size - art) / 2);
  const layers = [];

  if (background === 'circle') {
    const circle = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
        `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#ffffff"/></svg>`,
    );
    layers.push({ input: await sharp(circle).png().toBuffer(), left: 0, top: 0 });
  }

  if (background === 'none' && art === size) {
    fs.writeFileSync(out, artBuffer);
    return;
  }

  layers.push({ input: artBuffer, left: pad, top: pad });

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background === 'white' ? { r: 255, g: 255, b: 255, alpha: 1 } : transparent,
    },
  })
    .composite(layers)
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
  await render(size, out, 0.84, 'white');
  await render(size, path.join(dir, 'ic_launcher_round.png'), 0.84, 'circle');
  count += 2;
  console.log(`  ${density}  ${size}×${size}`);
}

for (const [density, size] of FOREGROUND) {
  const dir = path.join(RES, `mipmap-${density}`);
  // 自适应底是白色，前景留出边距，桌面上就是白底 + 居中盘子
  await render(size, path.join(dir, 'ic_launcher_foreground.png'), 0.84);
  count += 1;
  console.log(`  ${density}  foreground ${size}×${size}`);
}

const publicDir = path.join(ROOT, 'public');
fs.mkdirSync(publicDir, { recursive: true });
await render(64, path.join(publicDir, 'favicon.png'), 0.84, 'white');
count += 1;

// ---------------------------------------------------------------- 启动图
// 默认的 Capacitor 蓝色 logo 启动图跟动森暖米色不搭，用同一个 SVG 重画：
// 暖米底 + 居中图标（短边的 28%），留白足够，不裁到圆角。

const SPLASH_BG = { r: 0xf8, g: 0xf8, b: 0xf0, alpha: 1 };
const SPLASH_ICON_RATIO = 0.28;

async function renderSplash(width, height, out) {
  const art = Math.round(Math.min(width, height) * SPLASH_ICON_RATIO);
  const iconBuffer = await sharp(svg, { density: 384 })
    .resize(art, art, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({ create: { width, height, channels: 4, background: SPLASH_BG } })
    .composite([
      {
        input: iconBuffer,
        left: Math.round((width - art) / 2),
        top: Math.round((height - art) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(out);
}

const SPLASH_PORT = [
  ['mdpi', 320, 480],
  ['hdpi', 480, 800],
  ['xhdpi', 720, 1280],
  ['xxhdpi', 960, 1600],
  ['xxxhdpi', 1280, 1920],
];

let splashCount = 0;

for (const [density, w, h] of SPLASH_PORT) {
  await renderSplash(w, h, path.join(RES, `drawable-port-${density}`, 'splash.png'));
  await renderSplash(h, w, path.join(RES, `drawable-land-${density}`, 'splash.png'));
  splashCount += 2;
}

// 无方向限定符的兜底图（部分设备会走到这里）
await renderSplash(480, 800, path.join(RES, 'drawable', 'splash.png'));
splashCount += 1;

// 校验生成的尺寸
const check = await sharp(path.join(publicDir, 'favicon.png')).metadata();
console.log(`  favicon  ${check.width}×${check.height}`);
console.log(`✓ 生成 ${count} 张图标`);
console.log(`✓ 生成 ${splashCount} 张启动图`);
