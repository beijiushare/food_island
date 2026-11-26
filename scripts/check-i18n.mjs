#!/usr/bin/env node
/**
 * 中英文案对齐检查：
 *   1. key 集合一致（缺的、多的都报）
 *   2. 同一 key 的 {{占位符}} 一致
 *   3. 没有空字符串
 *
 * 运行：npm run check:i18n
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['zh', 'en'];

function load(lang) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'i18n', `${lang}.json`), 'utf8'));
}

function flatten(obj, prefix = '') {
  const out = new Map();
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      for (const [k, v] of flatten(value, full)) out.set(k, v);
    } else {
      out.set(full, value);
    }
  }
  return out;
}

function placeholders(value) {
  return [...String(value).matchAll(/\{\{\s*(\w+)\s*\}\}/g)]
    .map((m) => m[1])
    .sort()
    .join(',');
}

const maps = Object.fromEntries(LANGS.map((lang) => [lang, flatten(load(lang))]));
const [base, ...others] = LANGS;
const problems = [];

for (const key of maps[base].keys()) {
  if (!maps[others[0]].has(key)) problems.push(`en 缺少：${key}`);
}
for (const key of maps[others[0]].keys()) {
  if (!maps[base].has(key)) problems.push(`en 多出：${key}`);
}

for (const [key, value] of maps[base]) {
  if (String(value).trim() === '') problems.push(`空文案：${key}`);
  const other = maps[others[0]].get(key);
  if (other === undefined) continue;
  if (String(other).trim() === '') problems.push(`空文案（en）：${key}`);
  const a = placeholders(value);
  const b = placeholders(other);
  if (a !== b) problems.push(`占位符不一致：${key}（zh: ${a || '无'} / en: ${b || '无'}）`);
}

console.log(`zh ${maps.zh.size} 条 · en ${maps.en.size} 条`);
if (problems.length > 0) {
  for (const problem of problems) console.error('✗ ' + problem);
  process.exit(1);
}
console.log('✓ 中英文案一致');
