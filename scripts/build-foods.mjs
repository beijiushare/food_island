#!/usr/bin/env node
/**
 * data-src/food_composition_full.csv  →  src/assets/foods.json
 *
 * 清洗规则见 docs/01-技术文档.md §5.2：
 *   —      未检出/无数据  → null
 *   Tr     微量           → 0，raw 记 'Tr'
 *   899*   计算值         → 899，标 calculated
 *   un     未知           → null
 *   ''     缺失           → null
 *   成分合计 > 105 g/100g → 保留 + quality: 'suspect'
 *
 * 另外做三件事：
 *   1. 从原名拆出别名（番茄［西红柿］）与状态（生/熟/蒸/煮/干/罐头/代表值…）
 *   2. 预计算拼音全拼与首字母检索键（运行时不再跑 pinyin-pro 全表）
 *   3. 输出前做自检，任何一条不达标就非零退出
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinyin } from 'pinyin-pro';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'data-src', 'food_composition_full.csv');
const EXTRA = path.join(ROOT, 'data-src', 'seasonings.csv');
const OUT = path.join(ROOT, 'src', 'assets', 'foods.json');

// ---------------------------------------------------------------- CSV 解析

function parseCsv(input) {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      // 忽略，统一按 \n 断行
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------- 数值清洗

/** @returns {{ value: number | null, raw?: string, calculated?: boolean }} */
function toNumber(rawValue) {
  const raw = (rawValue ?? '').trim();
  if (raw === '') return { value: null };
  if (raw === '—' || raw === 'un') return { value: null, raw };
  if (raw === 'Tr') return { value: 0, raw: 'Tr' };
  if (raw.endsWith('*')) {
    const n = Number(raw.slice(0, -1));
    return Number.isFinite(n) ? { value: n, calculated: true } : { value: null, raw };
  }
  const n = Number(raw);
  return Number.isFinite(n) ? { value: n } : { value: null, raw };
}

/** 保留 2 位小数，去掉浮点尾巴 */
const round2 = (n) => (n === null ? null : Math.round(n * 100) / 100);

// ---------------------------------------------------------------- 字段映射

/** CSV 列名 → JSON 短键（顺序即输出顺序，便于 diff） */
const NUTRIENTS = [
  ['energyKCal', 'kcal'],
  ['protein', 'protein'],
  ['fat', 'fat'],
  ['CHO', 'carb'],
  ['dietaryFiber', 'fiber'],
  ['cholesterol', 'chol'],
  ['Na', 'na'],
  ['Ca', 'ca'],
  ['Fe', 'fe'],
  ['vitaminC', 'vc'],
];

const STATE_KEYWORDS = [
  '生',
  '熟',
  '蒸',
  '煮',
  '炒',
  '炸',
  '烤',
  '干',
  '罐头',
  '酱',
  '代表值',
  '切面',
  '速冻',
  '凉粉',
  '粉条',
  '粉丝',
  '淀粉',
];

const BRACKETS = /[（(][^）)]*[）)]|[［[][^］\]]*[］\]]/g;

/** 去掉（…）与［…］，得到核心名：面条（富强粉，煮） → 面条 */
function stripBrackets(name) {
  return name.replace(BRACKETS, '').trim();
}

/** 从原名取状态标签；越靠前越具体 */
function detectState(name) {
  for (const kw of STATE_KEYWORDS) {
    if (name.includes(kw)) return kw;
  }
  return undefined;
}

/** 从 ［］ 与 （） 里取别名（原名本身保留，不裁剪） */
function extractAliases(name) {
  const out = [];
  for (const m of name.matchAll(/［([^］]+)］/g)) {
    for (const part of m[1].split(/[、，,]/)) {
      const s = part.trim();
      if (s) out.push(s);
    }
  }
  return [...new Set(out)];
}

// ---------------------------------------------------------------- 拼音键

/** 全拼（无声调）与首字母；多音字把所有读法都塞进同一个键串 */
function pinyinKeys(name) {
  const full = pinyin(name, { toneType: 'none', type: 'array', multiple: true }).join(' ');
  const initials = pinyin(name, { pattern: 'first', toneType: 'none', type: 'array', multiple: true }).join(
    ' ',
  );
  return {
    py: full.replace(/\s+/g, ''),
    ini: initials.replace(/\s+/g, ''),
  };
}

// ---------------------------------------------------------------- 主流程

function build() {
  const csv = fs.readFileSync(SRC, 'utf8');
  const rows = parseCsv(csv);
  const header = rows[0].map((h) => h.trim());
  const col = Object.fromEntries(header.map((h, i) => [h, i]));

  // 成分表里没有调味品，单独维护一份（列结构与主表一致），构建时合并
  const extraRows = fs.existsSync(EXTRA) ? parseCsv(fs.readFileSync(EXTRA, 'utf8')) : [];
  const extraHeader = (extraRows[0] ?? []).map((h) => h.trim());
  if (extraRows.length > 0 && extraHeader.join(',') !== header.join(',')) {
    throw new Error('seasonings.csv 的列与主表不一致');
  }

  const body = [...rows.slice(1), ...extraRows.slice(1)].filter((r) =>
    r.some((c) => c.trim() !== ''),
  );

  const items = [];
  const warnings = [];
  const stateHistogram = new Map();

  for (const r of body) {
    const name = (r[col.foodName] ?? '').trim();
    if (!name) {
      warnings.push('空名行已跳过');
      continue;
    }

    const code = (r[col.foodCode] ?? '').trim();
    const [cat1 = '', cat2 = ''] = (r[col.category] ?? '').split('-');

    const nut = {};
    const calc = [];
    const rawTr = [];
    for (const [csvName, key] of NUTRIENTS) {
      const parsed = toNumber(r[col[csvName]]);
      nut[key] = round2(parsed.value);
      if (parsed.calculated) calc.push(key);
      if (parsed.raw === 'Tr') rawTr.push(key);
    }

    // 成分合计自检（不含 fiber：中式成分表的 CHO 已含膳食纤维，重复计入会假阳性）
    // 水分/灰分没进 Nutrients，这里直接读原始列
    const sumCore = ['water', 'protein', 'fat', 'CHO', 'ash'].reduce(
      (acc, name) => acc + (toNumber(r[col[name]]).value ?? 0),
      0,
    );
    const suspect = sumCore > 105;

    const edibleParsed = toNumber(r[col.edible]);
    const state = detectState(name);
    if (state) stateHistogram.set(state, (stateHistogram.get(state) ?? 0) + 1);

    const item = {
      code,
      name,
      ...(r[col.englishName]?.trim() ? { nameEn: r[col.englishName].trim() } : {}),
      cat1,
      cat2,
      ...(state ? { state } : {}),
      edible: round2(edibleParsed.value),
      nut,
      ...(calc.length ? { calc } : {}),
      ...(suspect ? { quality: 'suspect' } : {}),
      ...(rawTr.length ? { tr: rawTr } : {}),
    };

    const alias = extractAliases(name);
    if (alias.length) item.alias = alias;

    // py/ini 用「核心名」：拼音精确命中（mifan → 米饭）靠它，带上括号就永远对不上
    const baseKeys = pinyinKeys(stripBrackets(name));
    item.py = baseKeys.py;
    item.ini = baseKeys.ini;

    // pyFull/iniFull 用「全名去标点」：支持 fqfen → 面条（富强粉）
    const fullKeys = pinyinKeys(name.replace(/[（）()［］[\],，、\s]/g, ''));
    item.pyFull = fullKeys.py;
    item.iniFull = fullKeys.ini;

    items.push(item);
  }

  // 自检：没有这些就说明清洗或列映射错了（"食用油"在表里按具体油种存，单独校验分类）
  const required = ['米饭', '面条', '番茄', '鸡蛋', '马铃薯'];
  const missing = required.filter((k) => !items.some((it) => it.name.includes(k)));
  if (!items.some((it) => it.cat1 === '植物油')) missing.push('植物油（分类缺失）');
  const noKcal = items.filter((it) => it.nut.kcal === null).length;
  const noEnglish = items.filter((it) => !it.nameEn).length;
  const codes = new Set(items.map((it) => it.code));

  const doc = {
    version: 1,
    source: 'data-src/food_composition_full.csv',
    generatedAt: new Date().toISOString(),
    count: items.length,
    columns: header.length,
    items,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(doc), 'utf8');

  const bytes = fs.statSync(OUT).size;
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

  console.log('食岛 · foods.json 构建完成');
  console.log('─'.repeat(46));
  console.log(`记录数        ${items.length}（唯一 foodCode ${codes.size}）`);
  console.log(`原始列数      ${header.length}`);
  console.log(`一级类别      ${new Set(items.map((i) => i.cat1)).size}`);
  console.log(`二级类别      ${new Set(items.map((i) => i.cat1 + '-' + i.cat2)).size}`);
  console.log(`有英文名      ${items.length - noEnglish}（${(((items.length - noEnglish) / items.length) * 100).toFixed(1)}%）`);
  console.log(`缺热量        ${noKcal}`);
  console.log(`可疑合计      ${items.filter((i) => i.quality === 'suspect').length}`);
  console.log(`有别名        ${items.filter((i) => i.alias).length}`);
  console.log(`输出体积      ${kb(bytes)}`);
  console.log(`状态标签      ${[...stateHistogram.entries()].map(([k, v]) => `${k}:${v}`).join(' ')}`);

  if (warnings.length) console.log(`警告          ${warnings.length}`);
  if (missing.length) {
    console.error(`✗ 自检失败：成分表里找不到 ${missing.join('、')}`);
    process.exit(1);
  }
  if (codes.size !== items.length) {
    console.error('✗ 自检失败：foodCode 有重复');
    process.exit(1);
  }
  console.log('✓ 自检通过');
  buildDishes();
}

// ---------------------------------------------------------------- 菜品库
// data-src/dishes.json 由 scripts/import-dishes.mjs 生成（一次性导入参考项目）

function buildDishes() {
  const SRC_DISHES = path.join(ROOT, 'data-src', 'dishes.json');
  const OUT_DISHES = path.join(ROOT, 'src', 'assets', 'dishes.json');
  if (!fs.existsSync(SRC_DISHES)) {
    console.log('（跳过菜品库：没有 data-src/dishes.json）');
    return;
  }

  const raw = JSON.parse(fs.readFileSync(SRC_DISHES, 'utf8'));
  const problems = [];
  for (const dish of raw.items) {
    const sum = dish.components.reduce((acc, component) => acc + component.ratio, 0);
    if (Math.abs(sum - 100) > 0.5) problems.push(`${dish.name} 比例合计 ${sum}`);
    if (dish.components.some((component) => component.ratio <= 0)) {
      problems.push(`${dish.name} 有 0 比例配料`);
    }
  }

  fs.writeFileSync(OUT_DISHES, JSON.stringify(raw), 'utf8');
  console.log(`菜品库        ${raw.items.length} 道 → ${(fs.statSync(OUT_DISHES).size / 1024).toFixed(1)} KB`);

  if (problems.length) {
    console.error('✗ 菜品库自检失败：' + problems.slice(0, 5).join('；'));
    process.exit(1);
  }
}

build();
