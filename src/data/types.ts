/**
 * 成分表数据结构。
 *
 * 字段来源：scripts/build-foods.mjs 生成 src/assets/foods.json。
 * 短键是为了压体积，映射关系见该脚本的 NUTRIENTS 表。
 */

export interface Nutrients {
  /** kcal / 100g 可食部 */
  kcal: number | null;
  kj: number | null;
  protein: number | null;
  fat: number | null;
  carb: number | null;
  fiber: number | null;
  ash: number | null;
  water: number | null;
  chol: number | null;
  na: number | null;
  k: number | null;
  ca: number | null;
  p: number | null;
  mg: number | null;
  fe: number | null;
  zn: number | null;
  se: number | null;
  cu: number | null;
  mn: number | null;
  va: number | null;
  car: number | null;
  ret: number | null;
  vb1: number | null;
  vb2: number | null;
  niacin: number | null;
  vc: number | null;
  ve: number | null;
}

export type NutrientKey = keyof Nutrients;

export interface FoodItem {
  /** 成分表 foodCode，唯一 */
  code: string;
  /** 原始名，保留括号内的状态（面条（富强粉，煮）） */
  name: string;
  nameEn?: string;
  /** 一级类别，如「谷类及其制品」 */
  cat1: string;
  /** 二级类别，如「小麦粉及其制品」 */
  cat2: string;
  /** 状态标签：生 / 熟 / 蒸 / 煮 / 干 / 罐头 / 代表值 … */
  state?: string;
  /** 可食部 %，<100 表示带骨带壳 */
  edible: number | null;
  nut: Nutrients;
  /** 这些字段在原表里是计算值（带星号） */
  calc?: string[];
  /** 成分合计异常，仅作提示，不影响使用 */
  quality?: 'suspect';
  /** 原表为「Tr」微量的字段 */
  tr?: string[];
  /** 从原名 ［］ 拆出的别名（西红柿、土豆…） */
  alias?: string[];
  /** 全拼检索键，无声调（核心名） */
  py: string;
  /** 首字母检索键（核心名） */
  ini: string;
  /** 全名全拼（含括号内限定语），用于「富强粉 → fqfen」这类查询 */
  pyFull: string;
  /** 全名首字母 */
  iniFull: string;
}

export interface FoodDataset {
  version: number;
  source: string;
  generatedAt: string;
  count: number;
  columns: number;
  items: FoodItem[];
}
