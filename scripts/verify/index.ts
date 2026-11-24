/**
 * 纯逻辑回归：搜索 / 文字解析 / 计算 / 统计 / AI 输出校验 / CSV
 *
 * 运行：npm run verify
 * 这些模块不碰 DOM 和 IndexedDB，所以可以直接在 Node 里跑。
 * 标签用英文，避免 Windows 控制台编码问题。
 */

import fs from 'node:fs';

import { buildIndex, searchFoods } from '../../src/data/foods';
import type { DiaryEntry, Nutrients } from '../../src/data/types';
import { buildSummary, bucketByWeek } from '../../src/features/stats/summary';
import { parseSentence, resolveParsed } from '../../src/features/parse/sentence';
import { kcalOf, scaleNutrients, sumNutrients } from '../../src/features/diary/calc';
import { portionGrams, resolvePortionCategory } from '../../src/features/diary/portion';
import { diaryToCsv } from '../../src/features/diary/csv';
import {
  mockRecognition,
  parseRecognition,
  resolveRecognized,
} from '../../src/features/ai/recognize';
import { parseExtraHeader } from '../../src/services/ai-client';

let failed = 0;

function check(label: string, ok: boolean, extra = '') {
  if (!ok) failed++;
  console.log(`${ok ? '[ok]  ' : '[FAIL]'} ${label}${extra ? '  -> ' + extra : ''}`);
}

function group(name: string) {
  console.log(`\n== ${name} ==`);
}

// ---------------------------------------------------------------- 检索

group('search');
const dataset = JSON.parse(fs.readFileSync('src/assets/foods.json', 'utf8'));
const index = buildIndex(dataset);

check('dataset has 1677 items', index.all.length === 1677, String(index.all.length));
check('tomato alias (西红柿 -> 番茄)', searchFoods(index, '西红柿', 5)[0]?.item.baseName.includes('番茄'));
check('pinyin mifan -> 米饭', searchFoods(index, 'mifan', 5)[0]?.item.baseName === '米饭');
check('potato alias (土豆 -> 马铃薯)', searchFoods(index, '土豆', 5)[0]?.item.baseName === '马铃薯');
check('dish not in table (宫保鸡丁)', searchFoods(index, '宫保鸡丁', 5).length === 0);
check('blank query returns nothing', searchFoods(index, '   ', 5).length === 0);

const noodle = searchFoods(index, '面条', 40);
check(
  'raw + cooked noodles both listed',
  noodle.some((h) => h.item.name.includes('生')) && noodle.some((h) => h.item.name.includes('煮')),
);

// ---------------------------------------------------------------- 文字解析

group('parse');
const parsed = parseSentence('二两米饭、一个鸡蛋').map((p) => resolveParsed(index, p));
check('splits into two items', parsed.length === 2, String(parsed.length));
check('2 liang rice = 100 g', parsed[0]?.grams === 100, String(parsed[0]?.grams));
check('one egg = 50 g', parsed[1]?.grams === 50, String(parsed[1]?.grams));
check(
  '300g noodles default to cooked',
  resolveParsed(index, parseSentence('300g面条')[0]).food?.name.includes('煮'),
);

// ---------------------------------------------------------------- 计算

group('calc');
const rice = index.byCode.get('012401x')!;
const rice150 = scaleNutrients(rice.nut, 150);
check('rice 150 g = 174 kcal', kcalOf(rice150) === 174, String(kcalOf(rice150)));
check('300 g is twice 150 g', kcalOf(scaleNutrients(rice.nut, 300)) === kcalOf(rice150) * 2);
check('sum of two = double', kcalOf(sumNutrients([rice150, rice150])) === kcalOf(rice150) * 2);

const bony = index.all.find((it) => it.edible !== null && it.edible < 100 && it.nut.kcal !== null)!;
const asPurchased = scaleNutrients(bony.nut, 100, 'as_purchased', bony.edible);
check(
  `edible-part scaling (${bony.edible}%)`,
  Math.abs((asPurchased.kcal ?? 0) - ((bony.nut.kcal ?? 0) * (bony.edible ?? 100)) / 100) < 0.02,
);

check('portion table: rice medium = 150', portionGrams('米饭', 'medium') === 150);
check(
  'portion category: apple -> fruit',
  resolvePortionCategory(searchFoods(index, '苹果', 1)[0].item) === '水果',
);

// ---------------------------------------------------------------- 统计

group('stats');
const nut = (kcal: number, protein: number, carb: number, fat: number) =>
  ({ kcal, protein, carb, fat } as Nutrients);
const entry = (date: string, n: Nutrients): DiaryEntry => ({
  id: date + Math.random(),
  date,
  meal: 'lunch',
  foodCode: null,
  name: 'x',
  grams: 100,
  basis: 'edible',
  nutrients: n,
  source: 'manual',
  createdAt: 1,
});

const summary = buildSummary(
  [entry('2026-11-24', nut(1000, 50, 100, 20)), entry('2026-11-25', nut(2000, 100, 200, 60))],
  '2026-11-23',
  '2026-11-29',
);
check('recorded days = 2', summary.recordedDays === 2);
check('average = 1500', summary.averageKcal === 1500, String(summary.averageKcal));
check('max day = 2000', Math.round(summary.maxDay?.kcal ?? 0) === 2000);
check(
  'macro shares sum ~100',
  Math.abs(summary.macroShare.protein + summary.macroShare.carb + summary.macroShare.fat - 100) <= 1,
);
check('month buckets = 5', bucketByWeek(buildSummary([], '2026-11-01', '2026-11-30').days).length === 5);

// ---------------------------------------------------------------- AI 输出校验

group('ai');
check('plain json', parseRecognition('{"items":[{"name_cn":"米饭","portion":"medium"}]}').length === 1);
check(
  'code fence + surrounding text',
  parseRecognition('result:\n```json\n{"items":[{"name_cn":"面条","portion":"large"}]}\n```\ndone').length === 1,
);
const messy = parseRecognition('{"items":[{"name_cn":"炒饭","portion":"超大","confidence":3}]}')[0];
check('invalid portion -> medium', messy?.portion === 'medium');
check('confidence clamped to 1', messy?.confidence === 1);
check('non-json -> empty', parseRecognition('看不清').length === 0);
check(
  'max 6 items',
  parseRecognition(JSON.stringify({ items: Array.from({ length: 9 }, (_, i) => ({ name_cn: `f${i}` })) })).length === 6,
);
check('mock recognition maps to food table', resolveRecognized(index, mockRecognition()[0]).food !== null);
check(
  'extra header parsed',
  JSON.stringify(parseExtraHeader('x-opencode-session: abc')) === '{"x-opencode-session":"abc"}',
);
check('malformed header ignored', Object.keys(parseExtraHeader('abc')).length === 0);

// ---------------------------------------------------------------- CSV

group('csv');
const fake: DiaryEntry[] = [
  { ...entry('2026-11-24', nut(174, 3.9, 38.9, 0.5)), name: '奶茶,"三分糖"', grams: 500 },
];
const csv = diaryToCsv(fake);
check('csv has header', csv.startsWith('日期,餐次,食物'));
check('quotes and commas escaped', csv.includes('"奶茶,""三分糖"""'));

// ---------------------------------------------------------------- 结果

console.log(failed === 0 ? '\nALL PASSED' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
