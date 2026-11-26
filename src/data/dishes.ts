/**
 * 菜品库（离线）：每 100 g 成品里各配料占多少克。
 * 数据由参考项目 NutritionCalculatorOfHOC 导入，份量交给用户定。
 */

export interface RecipeComponent {
  name: string;
  /** 每 100 g 成品里的克数 */
  ratio: number;
  per100: { kcal: number; protein: number; carb: number; fat: number };
}

export interface DishItem {
  id: string;
  name: string;
  category: string;
  /** 出去吃饭常见的一份克数，只当默认值用 */
  servingGrams: number;
  components: RecipeComponent[];
}

/** 口语别名：搜「番茄炒蛋」也能找到「西红柿炒鸡蛋」 */
const DISH_ALIAS: Record<string, string[]> = {
  西红柿炒鸡蛋: ['番茄炒蛋', '番茄炒鸡蛋', '西红柿炒蛋'],
  什锦蛋炒饭: ['蛋炒饭', '炒饭'],
  宫保鸡丁: ['宫爆鸡丁'],
  鱼香肉丝: ['鱼香肉丝'],
  农家小炒肉: ['小炒肉'],
};

export function dishSearchText(dish: DishItem): string {
  return dish.name + (DISH_ALIAS[dish.name] ?? []).join('');
}

let pending: Promise<DishItem[]> | null = null;

export function loadDishes(): Promise<DishItem[]> {
  if (!pending) {
    pending = import('../assets/dishes.json').then(
      (mod) => ((mod.default ?? mod) as { items: DishItem[] }).items,
    );
  }
  return pending;
}

export function searchDishes(dishes: DishItem[], query: string, limit = 8): DishItem[] {
  const q = query.trim();
  if (!q) return [];
  return dishes.filter((dish) => dishSearchText(dish).includes(q)).slice(0, limit);
}

/** 每 100 g 成品的营养，用于列表展示 */
export interface DishPer100 {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export function dishPer100(dish: DishItem): DishPer100 {
  const nut: DishPer100 = { kcal: 0, protein: 0, carb: 0, fat: 0 };
  for (const component of dish.components) {
    const factor = component.ratio / 100;
    nut.kcal += component.per100.kcal * factor;
    nut.protein += component.per100.protein * factor;
    nut.carb += component.per100.carb * factor;
    nut.fat += component.per100.fat * factor;
  }
  return nut;
}
