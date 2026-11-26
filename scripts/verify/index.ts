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
import { kcalOf, scaleNutrients, sumNutrients } from '../../src/features/diary/calc';
import { portionGrams, resolvePortionCategory } from '../../src/features/diary/portion';
import { diaryToCsv } from '../../src/features/diary/csv';
import {
  mockDish,
  parseDish,
  resolveDish,
} from '../../src/features/ai/recognize';
import { parseExtraHeader } from '../../src/services/ai-client';
import { dishPer100, searchDishes } from '../../src/data/dishes';

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

check('dataset has 1686 items', index.all.length === 1686, String(index.all.length));
check('tomato alias (西红柿 -> 番茄)', searchFoods(index, '西红柿', 5)[0]?.item.baseName.includes('番茄'));
check('pinyin mifan -> 米饭', searchFoods(index, 'mifan', 5)[0]?.item.baseName === '米饭');
check('potato alias (土豆 -> 马铃薯)', searchFoods(index, '土豆', 5)[0]?.item.baseName === '马铃薯');
check('dish not in table (宫保鸡丁)', searchFoods(index, '宫保鸡丁', 5).length === 0);
check('blank query returns nothing', searchFoods(index, '   ', 5).length === 0);

// 组成匹配：必须精确，不能短词模糊
const exact = (q: string) => searchFoods(index, q, 6, { exact: true }).map((h) => h.item.baseName);
check('exact 盐 -> 精盐', exact('盐').includes('精盐'), exact('盐').join(','));
check('exact 糖 -> 白砂糖', exact('糖').includes('白砂糖'), exact('糖').join(','));
check('exact 油 -> 豆油', exact('油').includes('豆油'), exact('油').join(','));
check('exact 淀粉 -> 玉米淀粉', exact('淀粉').includes('玉米淀粉'), exact('淀粉').join(','));
check('exact 青椒 -> 甜椒', exact('青椒')[0] === '甜椒', exact('青椒').join(','));
check('exact 醋 不会命中醋栗', !exact('醋').includes('醋栗'), exact('醋').join(','));
check('exact 蒜 不会命中蒜肠', !exact('蒜').includes('蒜肠'), exact('蒜').join(','));
check('exact 番茄炒蛋 查不到整菜', exact('番茄炒蛋').length === 0);
check('调味品有 kind', searchFoods(index, '酱油', 1, { exact: true })[0]?.item.kind === 'seasoning');

const noodle = searchFoods(index, '面条', 40);
check(
  'raw + cooked noodles both listed',
  noodle.some((h) => h.item.name.includes('生')) && noodle.some((h) => h.item.name.includes('煮')),
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
const dishJson = JSON.stringify({
  dish: '米饭',
  grams: 200,
  components: [
    { name: '米饭', grams: 200, kind: 'ingredient', per100: { kcal: 116, protein: 2.6, carb: 25.9, fat: 0.3 } },
  ],
});
check('plain dish json', parseDish(dishJson)?.name === '米饭');
check(
  'code fence + surrounding text',
  parseDish(`结果：\n\`\`\`json\n${dishJson}\n\`\`\`\n完毕`)?.name === '米饭',
);
check('missing dish -> null', parseDish('{"components":[]}') === null);
check('non-json -> null', parseDish('看不清') === null);
check('components required', parseDish('{"dish":"空盘子","components":[]}') === null);

const messy = parseDish(
  JSON.stringify({
    dish: '测试',
    components: [
      { name: '盐', grams: '不是数字', kind: '乱写', per100: { kcal: '10' } },
    ],
  }),
);
check('bad grams falls back to 100', messy?.components[0]?.grams === 100, String(messy?.components[0]?.grams));
check('bad kind -> ingredient', messy?.components[0]?.kind === 'ingredient');
check('string per100 parsed', messy?.components[0]?.per100.kcal === 10, String(messy?.components[0]?.per100.kcal));

const mock = resolveDish(index, mockDish());
check('mock dish has 3 components', mock.components.length === 3, String(mock.components.length));
check(
  'local table wins for tomato/egg/oil',
  mock.components.every((component) => component.source === 'table'),
  mock.components.map((c) => `${c.name}:${c.source}`).join(','),
);
check('oil resolved via alias to 豆油', mock.components[2]?.name.includes('豆油'), mock.components[2]?.name);

const withMissing = resolveDish(index, {
  name: '番茄炒蛋',
  grams: 300,
  components: [
    { name: '番茄', grams: 200, kind: 'ingredient', per100: { kcal: 15, protein: 0.9, carb: 3.3, fat: 0.2 } },
    { name: '料酒', grams: 10, kind: 'seasoning', per100: { kcal: 50, protein: 0.2, carb: 4, fat: 0 } },
  ],
});
check('unknown component falls back to ai', withMissing.components[1]?.source === 'ai');
check('parent totals sum components', withMissing.grams === 210, String(withMissing.grams));
check(
  'total kcal = local + ai',
  Math.round(withMissing.nutrients.kcal ?? 0) ===
    Math.round((withMissing.components[0].nutrients.kcal ?? 0) + (withMissing.components[1].nutrients.kcal ?? 0)),
);

check(
  'extra header parsed',
  JSON.stringify(parseExtraHeader('x-opencode-session: abc')) === '{"x-opencode-session":"abc"}',
);
check('malformed header ignored', Object.keys(parseExtraHeader('abc')).length === 0);

// ---------------------------------------------------------------- 菜品库

group('dishes');
const dishData = JSON.parse(fs.readFileSync('data-src/dishes.json', 'utf8')) as {
  items: import('../../src/data/dishes').DishItem[];
};
check('dish library has 152 items', dishData.items.length === 152, String(dishData.items.length));

const tomatoEgg = dishData.items.find((dish) => dish.name === '西红柿炒鸡蛋');
check('西红柿炒鸡蛋 imported', Boolean(tomatoEgg));
const ratioSum = tomatoEgg?.components.reduce((sum, component) => sum + component.ratio, 0) ?? 0;
check('ratios sum to 100', Math.abs(ratioSum - 100) < 0.5, String(ratioSum));
check(
  'per 100 g ≈ 130 kcal',
  Math.abs(Math.round(dishPer100(tomatoEgg!)!.kcal) - 130) <= 3,
  String(Math.round(dishPer100(tomatoEgg!).kcal)),
);
check('search by alias 番茄炒蛋', searchDishes(dishData.items, '番茄炒蛋').length === 1);
check('search 鸡 finds dishes', searchDishes(dishData.items, '鸡').length > 0);

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
