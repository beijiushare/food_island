/**
 * 单位换算表（技术文档 §8.3 是物理常量，其余是「市面常见一份」的常识量）。
 * 全部零测量成本，可直接调整。
 */

/** 明确是重量/容量的单位 → 每单位多少克 */
export const WEIGHT_UNITS: Record<string, number> = {
  克: 1,
  g: 1,
  G: 1,
  公克: 1,
  两: 50,
  斤: 500,
  毫升: 1,
  ml: 1,
  mL: 1,
};

/** 计数/容器单位的兜底克数（没命中食材特例时用） */
export const UNIT_DEFAULTS: Record<string, number> = {
  碗: 250,
  盘: 200,
  杯: 250,
  瓶: 500,
  盒: 250,
  包: 100,
  袋: 100,
  份: 200,
  个: 100,
  只: 100,
  条: 100,
  片: 25,
  块: 50,
  勺: 15,
  汤匙: 15,
  茶匙: 6,
};

/** 容器单位要按食材落在哪个区间（一碗米饭 ≠ 一碗粥） */
const UNIT_BY_FOOD: { unit: string; test: RegExp; grams: number }[] = [
  { unit: '碗', test: /米饭|白饭|饭$/, grams: 150 },
  { unit: '碗', test: /粥|稀饭/, grams: 300 },
  { unit: '碗', test: /汤/, grams: 300 },
  { unit: '碗', test: /面|粉|米线/, grams: 250 },
  { unit: '碗', test: /豆浆|奶/, grams: 250 },
  { unit: '勺', test: /油/, grams: 13.8 },
  { unit: '汤匙', test: /油/, grams: 13.8 },
  { unit: '勺', test: /糖/, grams: 12.8 },
  { unit: '勺', test: /酱油/, grams: 17.5 },
  { unit: '勺', test: /蚝油/, grams: 19 },
  { unit: '勺', test: /醋/, grams: 15 },
  { unit: '茶匙', test: /盐/, grams: 6 },
];

/** 单个食材的常识重量（个 / 只 / 条 / 片…） */
const COUNT_BY_FOOD: { test: RegExp; grams: number }[] = [
  { test: /鸡蛋|鸭蛋|鹅蛋|鸽蛋|鹌鹑蛋/, grams: 50 },
  { test: /包子/, grams: 100 },
  { test: /饺子|水饺|锅贴|烧麦/, grams: 20 },
  { test: /馒头|花卷|窝头/, grams: 100 },
  { test: /油条/, grams: 70 },
  { test: /吐司|面包/, grams: 30 },
  { test: /香蕉/, grams: 120 },
  { test: /苹果/, grams: 200 },
  { test: /橘子|橙子|柑|桔/, grams: 130 },
  { test: /梨/, grams: 200 },
  { test: /桃/, grams: 150 },
  { test: /猕猴桃|奇异果/, grams: 80 },
  { test: /香肠|火腿肠/, grams: 40 },
  { test: /鸡翅/, grams: 50 },
  { test: /鸡腿/, grams: 120 },
  { test: /酸奶/, grams: 100 },
  { test: /牛奶|豆浆|饮料|果汁|可乐|奶茶/, grams: 250 },
];

/** 返回某食材按该单位的单份克数 */
export function unitGrams(unit: string, foodName: string): number | null {
  if (unit in WEIGHT_UNITS) return WEIGHT_UNITS[unit];

  const byFood = UNIT_BY_FOOD.find((row) => row.unit === unit && row.test.test(foodName));
  if (byFood) return byFood.grams;

  if (unit === '个' || unit === '只' || unit === '条' || unit === '片' || unit === '块') {
    const count = COUNT_BY_FOOD.find((row) => row.test.test(foodName));
    if (count) return count.grams;
  }

  return UNIT_DEFAULTS[unit] ?? null;
}
