#!/usr/bin/env node
/**
 * 一次性导入：参考/NutritionCalculatorOfHOC-main → data-src/dishes.json
 *
 * 只保留「每 100 g 成品里各配料占多少克」和每 100 g 营养，
 * 不保留老乡鸡的门店份量（用户自己定克数）。
 *
 * 用法：node scripts/import-dishes.mjs
 * 参考目录不入库，所以这个脚本只是开发期工具，产物 data-src/dishes.json 入库。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, '参考', 'NutritionCalculatorOfHOC-main', 'src', 'data');
const OUT = path.join(ROOT, 'data-src', 'dishes.json');

if (!fs.existsSync(SRC_DIR)) {
  console.error('找不到参考项目：参考/NutritionCalculatorOfHOC-main');
  process.exit(1);
}

// ---------------------------------------------------------------- 营养库

const dbText = fs.readFileSync(path.join(SRC_DIR, 'nutritionDB.ts'), 'utf8');
const nutrition = new Map();

for (const line of dbText.split('\n')) {
  const match = line.match(/^\s*"([^"]+)":\s*\{(.*)\},?\s*$/);
  if (!match) continue;
  const [, key, body] = match;
  const num = (label) => {
    const m = body.match(new RegExp(`${label}:\\s*([\\d.]+)`));
    return m ? Number(m[1]) : 0;
  };
  const entry = {
    kcal: num('caloriesPer100g'),
    protein: num('protein'),
    carb: num('carbs'),
    fat: num('fat'),
  };
  nutrition.set(key, entry);
  const aliasBlock = body.match(/aliases:\s*\[([^\]]*)\]/)?.[1] ?? '';
  for (const alias of aliasBlock.matchAll(/"([^"]+)"/g)) {
    if (!nutrition.has(alias[1])) nutrition.set(alias[1], entry);
  }
}

// ---------------------------------------------------------------- 配方

const recText = fs.readFileSync(path.join(SRC_DIR, 'recipes.ts'), 'utf8');
const blocks = recText.split(/\n  \{\n/).slice(1);

const dishes = [];
let skipped = 0;

for (const block of blocks) {
  const name = block.match(/name:\s*'([^']+)'/)?.[1];
  const category = block.match(/category:\s*'([^']+)'/)?.[1] ?? '';
  const id = block.match(/id:\s*'([^']+)'/)?.[1] ?? name;
  if (!name) continue;

  const ingredientsBlock = block.slice(block.indexOf('ingredients:'), block.indexOf(']', block.indexOf('ingredients:')) + 1);
  const ingredients = [...ingredientsBlock.matchAll(/\{\s*name:\s*'([^']+)',\s*amount:\s*([\d.]+),\s*unit:\s*'([^']+)'/g)].map(
    (m) => ({ name: m[1], amount: Number(m[2]), unit: m[3] }),
  );
  if (ingredients.length === 0) {
    skipped++;
    continue;
  }

  const total = ingredients.reduce((sum, item) => sum + item.amount, 0);
  if (total <= 0) {
    skipped++;
    continue;
  }

  const components = ingredients.map((item) => {
    const nut = nutrition.get(item.name) ?? { kcal: 0, protein: 0, carb: 0, fat: 0 };
    return {
      name: item.name,
      // 每 100 g 成品里这个配料有多少克
      ratio: Math.round((item.amount / total) * 10000) / 100,
      per100: {
        kcal: Math.round(nut.kcal * 10) / 10,
        protein: Math.round(nut.protein * 10) / 10,
        carb: Math.round(nut.carb * 10) / 10,
        fat: Math.round(nut.fat * 10) / 10,
      },
    };
  });

  dishes.push({ id, name, category, components });
}

const payload = {
  source: 'NutritionCalculatorOfHOC (MIT) · 配方来自 CookLikeHOC / 老乡鸡菜品溯源报告',
  note: 'ratio 是每 100 g 成品中该配料的克数；份量由用户决定',
  items: dishes,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 1) + '\n');

console.log(`导入 ${dishes.length} 道菜（跳过 ${skipped}），写入 ${path.relative(ROOT, OUT)}`);
