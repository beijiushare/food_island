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

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Portion = 'small' | 'medium' | 'large';

/** 克数口径：可食部 / 带骨带壳整重 */
export type Basis = 'edible' | 'as_purchased';

export interface DiaryEntry {
  id: string;
  /** 'YYYY-MM-DD' */
  date: string;
  meal: Meal;
  /** 命中成分表才有；手工录入的自定义食物为 null */
  foodCode: string | null;
  /** 显示名快照，不随成分表更新而变 */
  name: string;
  grams: number;
  basis: Basis;
  portion?: Portion;
  /** 已按克数折算的「实际摄入量」快照 */
  nutrients: Nutrients;
  /** 用户手改过营养：改克数不再自动重算 */
  nutrientsManual?: boolean;
  /** 复合菜的原料明细：外层只显示一道菜，展开能看到番茄 200g / 鸡蛋 100g */
  components?: EntryComponent[];
  /**
   * 识别状态。undefined 视为 ready（老记录）。
   * recognizing 表示「照片已存、正在拆解」，failed 表示拆解失败，可重试。
   */
  status?: EntryStatus;
  /** 识别失败的原因，显示在卡片上 */
  error?: string;
  /** 失败原因的错误码（AI 侧），用于国际化文案 */
  errorCode?: string;
  scene?: string;
  photoId?: string;
  source: 'photo' | 'text' | 'search' | 'memory' | 'manual';
  createdAt: number;
  /**
   * 只有照片、还没确定食物的占位记录。
   * 照片先存档，分析成功与否都不影响原图（避免网络抖动就丢图）。
   */
  pending?: boolean;
}

/** 复合菜里的一条原料 */
export interface EntryComponent {
  name: string;
  grams: number;
  foodCode: string | null;
  nutrients: Nutrients;
  /** 每 100 g 营养：改克数时就地重算，不用再问 AI */
  per100?: Nutrients | null;
  /** 数值来源：本地成分表 / AI 估算 / 手填 */
  source?: 'table' | 'ai' | 'manual';
  /** 原料还是调料：决定 UI 分组 */
  kind?: 'ingredient' | 'seasoning';
  /** AI 给的克数超出常识范围、被夹住过 */
  clamped?: boolean;
}

/** 拍照后的识别状态 */
export type EntryStatus = 'recognizing' | 'ready' | 'failed';

export interface MemoryItem {
  id: string;
  /** foodCode，或 name:<归一化食物名> */
  foodKey: string;
  /** 显示名快照 */
  name: string;
  scene: string;
  grams: number;
  portion?: Portion;
  usedCount: number;
  corrections: number;
  lastUsedAt: number;
}

export interface PhotoRef {
  id: string;
  entryId: string;
  /** 相对路径 'photos/2026/11/xxx.jpg'，不存绝对路径 */
  relPath: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

export interface Targets {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export const DEFAULT_TARGETS: Targets = {
  kcal: 1800,
  protein: 90,
  carb: 200,
  fat: 60,
};

export const NUTRIENT_KEYS: NutrientKey[] = [
  'kcal',
  'kj',
  'protein',
  'fat',
  'carb',
  'fiber',
  'ash',
  'water',
  'chol',
  'na',
  'k',
  'ca',
  'p',
  'mg',
  'fe',
  'zn',
  'se',
  'cu',
  'mn',
  'va',
  'car',
  'ret',
  'vb1',
  'vb2',
  'niacin',
  'vc',
  've',
];

export interface FoodDataset {
  version: number;
  source: string;
  generatedAt: string;
  count: number;
  columns: number;
  items: FoodItem[];
}
