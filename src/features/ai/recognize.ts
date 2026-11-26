import type { FoodIndex } from '../../data/foods';
import { searchFoods } from '../../data/foods';
import type { EntryComponent, Nutrients } from '../../data/types';
import { chat, type AIProfile } from '../../services/ai-client';
import { emptyNutrients, scaleNutrients, sumNutrients } from '../diary/calc';
import { INGREDIENT_ALIAS } from '../../data/ingredient-alias';

/**
 * 「一道菜 → 组成」的识别。
 *
 * AI 只负责：这道菜叫什么、拆成哪些原料和调料、各多少克、每 100g 营养。
 * 营养数值本地能查到就用本地的，查不到才用 AI 给的（source 会标出来）。
 */

const DISH_PROMPT = `你在帮我记录饮食。看这张照片（或读我的文字描述），把这一道菜拆成基础原料和调料。

只输出 JSON，结构必须是：
{"dish":"菜名","grams":总克数,"components":[{"name":"原料名","grams":克数,"kind":"ingredient","per100":{"kcal":0,"protein":0,"carb":0,"fat":0}}]}

规则：
- components 列出所有原料和调料，调料 kind 用 "seasoning"，其余用 "ingredient"。
- 每样都给一个大概克数，调料也要给（盐 2、油 15 这种量级），不要写 0。
- per100 是每 100 克的营养，只给这四项；数值按常识估，不要算总量。
- 单一食材（蒸米饭、白水煮玉米）就只列它自己。
- 不要输出解释、不要 markdown。`;

export interface Per100 {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export interface DishComponent {
  name: string;
  grams: number;
  kind: 'ingredient' | 'seasoning';
  per100: Per100;
}

export interface DishDraft {
  name: string;
  grams: number;
  components: DishComponent[];
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function toPer100(value: unknown): Per100 {
  const obj = (value ?? {}) as Record<string, unknown>;
  return {
    kcal: toNumber(obj.kcal ?? obj.calories),
    protein: toNumber(obj.protein),
    carb: toNumber(obj.carb ?? obj.carbs),
    fat: toNumber(obj.fat),
  };
}

/** 从模型输出里抠 JSON 并校验；任何字段缺失都不许崩 */
export function parseDish(raw: string): DishDraft | null {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }

  const obj = data as Record<string, unknown>;
  const name = typeof obj.dish === 'string' ? obj.dish.trim() : '';
  if (!name) return null;

  const rawComponents = Array.isArray(obj.components) ? obj.components : [];
  const components: DishComponent[] = rawComponents
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const item = raw as Record<string, unknown>;
      const itemName = typeof item.name === 'string' ? item.name.trim() : '';
      if (!itemName) return null;
      return {
        name: itemName,
        grams: Math.max(1, Math.round(toNumber(item.grams, 100))),
        kind: item.kind === 'seasoning' ? ('seasoning' as const) : ('ingredient' as const),
        per100: toPer100(item.per100),
      };
    })
    .filter((item): item is DishComponent => item !== null)
    .slice(0, 20);

  if (components.length === 0) return null;

  const grams = Math.round(
    toNumber(obj.grams, components.reduce((sum, item) => sum + item.grams, 0)),
  );

  return { name, grams: grams > 0 ? grams : components.reduce((sum, c) => sum + c.grams, 0), components };
}

/** 有照片走视觉，只有文字走文本，都是同一个 JSON 结构 */
export async function analyzeDish(
  profile: AIProfile,
  options: { photoDataUrls?: string[]; text?: string },
): Promise<DishDraft | null> {
  const photos = (options.photoDataUrls ?? []).filter(Boolean).slice(0, 4);
  const text = options.text?.trim();

  const content: Parameters<typeof chat>[1][number]['content'] =
    photos.length > 0
      ? [
          { type: 'text', text: DISH_PROMPT },
          ...photos.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
          ...(text ? [{ type: 'text' as const, text: `补充说明：${text}` }] : []),
        ]
      : `${DISH_PROMPT}\n\n我的描述：${text ?? ''}`;

  const raw = await chat(profile, [{ role: 'user', content }]);
  return parseDish(raw);
}

/** 没有 Key / 开发调试时用的示例 */
export function mockDish(): DishDraft {
  return {
    name: '番茄炒蛋',
    grams: 314,
    components: [
      { name: '番茄', grams: 200, kind: 'ingredient', per100: { kcal: 15, protein: 0.9, carb: 3.3, fat: 0.2 } },
      { name: '鸡蛋', grams: 100, kind: 'ingredient', per100: { kcal: 139, protein: 13.3, carb: 2.8, fat: 8.8 } },
      { name: '食用油', grams: 14, kind: 'seasoning', per100: { kcal: 884, protein: 0, carb: 0, fat: 99.9 } },
    ],
  };
}

export interface ResolvedDish {
  name: string;
  grams: number;
  components: EntryComponent[];
  nutrients: Nutrients;
  /** 有任何一个组成没查到本地表 */
  hasAiSource: boolean;
}

const FOUR = ['kcal', 'protein', 'carb', 'fat'] as const;

function aiNutrients(per100: Per100): Nutrients {
  const nut = emptyNutrients();
  for (const key of FOUR) nut[key] = per100[key];
  return nut;
}

/** 调料的常识用量区间：AI 猜飞了就夹住，避免「盐 50 g」这种数 */
const SEASONING_RANGE: { test: RegExp; min: number; max: number }[] = [
  { test: /香油|芝麻油|花生油|菜籽油|橄榄油|猪油|黄油|油/, min: 1, max: 60 },
  { test: /盐/, min: 0.2, max: 10 },
  { test: /糖/, min: 0.5, max: 60 },
  { test: /酱油|生抽|老抽|豉油/, min: 1, max: 40 },
  { test: /醋/, min: 1, max: 40 },
  { test: /料酒|黄酒|花雕/, min: 1, max: 40 },
  { test: /蚝油/, min: 1, max: 40 },
  { test: /豆瓣酱|黄豆酱|甜面酱|酱/, min: 1, max: 50 },
  { test: /鸡精|味精/, min: 0.2, max: 10 },
  { test: /淀粉|生粉/, min: 1, max: 30 },
  { test: /番茄酱|番茄沙司/, min: 5, max: 60 },
  { test: /花椒|胡椒|孜然|五香|咖喱|辣椒粉/, min: 0.1, max: 5 },
];

function clampSeasoning(name: string, grams: number): { grams: number; clamped: boolean } {
  const range = SEASONING_RANGE.find((row) => row.test.test(name));
  if (!range) return { grams, clamped: false };
  const next = Math.min(range.max, Math.max(range.min, grams));
  return { grams: Math.round(next * 10) / 10, clamped: Math.abs(next - grams) > 0.05 };
}

/**
 * 组成 → 本地表优先，查不到用 AI 的每 100g 值。
 * 全程精确匹配（「醋」不会命中醋栗）。
 */
export function resolveDish(
  index: FoodIndex,
  dish: DishDraft,
  fallbackSource: 'ai' | 'recipe' = 'ai',
): ResolvedDish {
  const components: EntryComponent[] = dish.components.map((component) => {
    const query = INGREDIENT_ALIAS[component.name] ?? component.name;
    const hit = searchFoods(index, query, 1, { exact: true })[0]?.item ?? null;
    const isSeasoning = component.kind === 'seasoning' || hit?.kind === 'seasoning';
    const amount = isSeasoning
      ? clampSeasoning(component.name, component.grams)
      : { grams: component.grams, clamped: false };

    if (hit) {
      return {
        name: hit.name,
        grams: amount.grams,
        foodCode: hit.code,
        nutrients: scaleNutrients(hit.nut, amount.grams, 'edible', hit.edible),
        per100: hit.nut,
        source: 'table',
        kind: component.kind,
        clamped: amount.clamped || undefined,
      };
    }

    return {
      name: component.name,
      grams: amount.grams,
      foodCode: null,
      nutrients: scaleNutrients(aiNutrients(component.per100), amount.grams, 'edible', null),
      per100: aiNutrients(component.per100),
      source: fallbackSource,
      kind: component.kind,
      clamped: amount.clamped || undefined,
    };
  });

  return {
    name: dish.name,
    grams: components.reduce((sum, component) => sum + component.grams, 0),
    components,
    nutrients: sumNutrients(components.map((component) => component.nutrients)),
    hasAiSource: components.some((component) => component.source === 'ai'),
  };
}
