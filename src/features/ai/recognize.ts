import type { FoodIndex } from '../../data/foods';
import { searchFoods } from '../../data/foods';
import type { Portion } from '../../data/types';
import { scaleNutrients } from '../diary/calc';
import { PORTION_CATEGORIES, portionGrams, resolvePortionCategory } from '../diary/portion';
import type { ResolvedItem } from '../parse/sentence';
import { INGREDIENT_ALIAS } from '../parse/sentence';
import { chat, type AIProfile } from '../../services/ai-client';

/**
 * 拍照识别（技术文档 §6.3 / §6.4）。
 * AI 只做两件事：这是什么 + 小/中/大份。禁止返回克数或营养值。
 */

/** 技术文档 §6.4 的提示词，逐字使用 */
export const RECOGNIZE_PROMPT = `你在帮我记录饮食。看这张照片，只做两件事，不要做别的。

1. 识别里面有哪些食物（最多 6 种）。用中文常见名字。
2. 对每个食物判断份量是小份、中份还是大份。

规则：
- 只输出 JSON，不要任何解释文字。
- 不要计算热量，不要给克数，不要给营养值。
- 如果是多种食材混在一起的菜（如番茄炒蛋、青椒肉丝），
  标 is_composite=true，并在 components 里列出主要原料和大致用量。
- 拿不准的，confidence 给低值（0.3~0.5），不要编。
- category 只能从这些里选：
  米饭 / 面条（熟）/ 粥 / 炒青菜 / 炒菜（带肉）/ 肉类（单份）/
  汤 / 水果 / 面包 / 饮品

份量参考：
- 小份 = 明显少于常规一份（约一个拳头的一半）
- 中份 = 常规一份
- 大份 = 明显多于常规一份（或加了饭/加了面）`;

export interface RecognizedComponent {
  nameCn: string;
  gramsHint?: number;
  tbsp?: number;
}

export interface RecognizedItem {
  nameCn: string;
  nameEn?: string;
  category?: string;
  portion: Portion;
  isComposite: boolean;
  components: RecognizedComponent[];
  confidence: number;
}

const PORTIONS: Portion[] = ['small', 'medium', 'large'];

function toPortion(value: unknown): Portion {
  return PORTIONS.includes(value as Portion) ? (value as Portion) : 'medium';
}

function toConfidence(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function toCategory(value: unknown): string | undefined {
  return typeof value === 'string' && (PORTION_CATEGORIES as readonly string[]).includes(value)
    ? value
    : undefined;
}

function toComponents(value: unknown): RecognizedComponent[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const obj = raw as Record<string, unknown>;
      const name = typeof obj.name_cn === 'string' ? obj.name_cn.trim() : '';
      if (!name) return null;
      const component: RecognizedComponent = { nameCn: name };
      if (typeof obj.grams_hint === 'number' && obj.grams_hint > 0) {
        component.gramsHint = Math.round(obj.grams_hint);
      }
      if (typeof obj.tbsp === 'number' && obj.tbsp > 0) component.tbsp = obj.tbsp;
      return component;
    })
    .filter((c): c is RecognizedComponent => c !== null);
}

/** 从模型输出里抠出 JSON 并做字段校验；任何字段缺失都不许崩 */
export function parseRecognition(raw: string): RecognizedItem[] {
  let text = raw.trim();

  // 去掉 ```json 代码围栏
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  // 保险：只取第一个 { 到最后一个 }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }

  const items = (data as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];

  return items
    .map((raw): RecognizedItem | null => {
      if (!raw || typeof raw !== 'object') return null;
      const obj = raw as Record<string, unknown>;
      const nameCn = typeof obj.name_cn === 'string' ? obj.name_cn.trim() : '';
      if (!nameCn) return null;

      return {
        nameCn,
        nameEn: typeof obj.name_en === 'string' ? obj.name_en : undefined,
        category: toCategory(obj.category),
        portion: toPortion(obj.portion),
        isComposite: obj.is_composite === true,
        components: toComponents(obj.components),
        confidence: toConfidence(obj.confidence),
      };
    })
    .filter((item): item is RecognizedItem => item !== null)
    .slice(0, 6);
}

/** 调一次视觉模型，拿识别结果（单张照片） */
export async function recognizePhoto(
  profile: AIProfile,
  photoDataUrl: string,
): Promise<RecognizedItem[]> {
  return recognizePhotos(profile, [photoDataUrl]);
}

/**
 * 多张照片 + 一句备注一起交给模型。
 * 照片是同一餐的不同角度/不同盘，提示词里要求合并判断、不要重复计数。
 */
export async function recognizePhotos(
  profile: AIProfile,
  photoDataUrls: string[],
  note?: string,
): Promise<RecognizedItem[]> {
  const photos = photoDataUrls.filter(Boolean).slice(0, 6);
  if (photos.length === 0) return [];

  const pieces: string[] = [RECOGNIZE_PROMPT];
  if (photos.length > 1) {
    pieces.push(`这次一共给了 ${photos.length} 张照片，拍的是同一顿饭，请合并判断，同一样食物只列一次。`);
  }
  if (note?.trim()) {
    pieces.push(`用户补充：${note.trim()}（用来修正识别和份量，不要照抄进结果）`);
  }

  const raw = await chat(profile, [
    {
      role: 'user',
      content: [
        { type: 'text', text: pieces.join('\n\n') },
        ...photos.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
      ],
    },
  ]);
  return parseRecognition(raw);
}

/** 没有照片、只打字时用这段提示词（和视觉版同一个 JSON 结构） */
export const TEXT_PROMPT = `你在帮我记录饮食。下面是我对这一餐的描述，只做两件事，不要做别的。

1. 列出我吃了哪些食物（最多 6 种）。用中文常见名字。
2. 对每个食物判断份量是小份、中份还是大份。

规则：
- 只输出 JSON，不要任何解释文字。
- 不要计算热量，不要给克数，不要给营养值。
- 如果是多种食材混在一起的菜（如番茄炒蛋、青椒肉丝），
  标 is_composite=true，并在 components 里列出主要原料和大致用量。
- 拿不准的，confidence 给低值（0.3~0.5），不要编。
- category 只能从这些里选：
  米饭 / 面条（熟）/ 粥 / 炒青菜 / 炒菜（带肉）/ 肉类（单份）/
  汤 / 水果 / 面包 / 饮品`;

export async function recognizeText(
  profile: AIProfile,
  description: string,
): Promise<RecognizedItem[]> {
  const raw = await chat(profile, [
    { role: 'user', content: `${TEXT_PROMPT}\n\n我的描述：${description.trim()}` },
  ]);
  return parseRecognition(raw);
}

/** 没配 Key 时用的示例结果，用于把链路跑通 */
export function mockRecognition(): RecognizedItem[] {
  return [
    {
      nameCn: '米饭',
      nameEn: 'steamed rice',
      category: '米饭',
      portion: 'medium',
      isComposite: false,
      components: [],
      confidence: 0.86,
    },
    {
      nameCn: '番茄炒蛋',
      category: '炒菜（带肉）',
      portion: 'medium',
      isComposite: true,
      components: [
        { nameCn: '番茄', gramsHint: 200 },
        { nameCn: '鸡蛋', gramsHint: 100 },
        { nameCn: '食用油', tbsp: 1 },
      ],
      confidence: 0.62,
    },
  ];
}

/** 识别结果 → 成分表条目 + 克数 + 营养（与文字解析同一条通路） */
export function resolveRecognized(index: FoodIndex, item: RecognizedItem): ResolvedItem {
  const hits = searchFoods(index, item.nameCn, 1);
  const best = hits[0];
  const food = best && best.score >= 0.7 ? best.item : null;
  const category = item.category ?? (food ? resolvePortionCategory(food) : undefined);
  const grams = food && category ? portionGrams(portionCategory(category), item.portion) : 0;

  return {
    raw: item.nameCn,
    name: item.nameCn,
    quantity: null,
    unit: null,
    grams,
    food,
    score: best?.score ?? 0,
    portion: item.portion,
    nutrients: food ? scaleNutrients(food.nut, grams, 'edible', food.edible) : null,
  };
}

function portionCategory(value: string) {
  return (PORTION_CATEGORIES as readonly string[]).includes(value)
    ? (value as (typeof PORTION_CATEGORIES)[number])
    : '炒菜（带肉）';
}

/** 一汤匙的常识重量（技术文档 §8.3） */
const TBSP_GRAMS: { test: RegExp; grams: number }[] = [
  { test: /油/, grams: 13.8 },
  { test: /糖/, grams: 12.8 },
  { test: /酱油/, grams: 17.5 },
  { test: /蚝油/, grams: 19 },
  { test: /醋/, grams: 15 },
];

function tbspGrams(name: string): number {
  return TBSP_GRAMS.find((row) => row.test.test(name))?.grams ?? 15;
}

/** 复合菜里的单个原料 → 可编辑的一行 */
export function resolveComponentRow(
  index: FoodIndex,
  component: RecognizedComponent,
  fallbackCategory: string | undefined,
): ResolvedItem {
  const searchName = INGREDIENT_ALIAS[component.nameCn] ?? component.nameCn;
  const hits = searchFoods(index, searchName, 6);
  const best = hits[0];
  const food = best && best.score >= 0.7 ? best.item : null;

  let grams = 0;
  let portion: Portion | undefined;

  if (component.gramsHint) {
    grams = Math.round(component.gramsHint);
  } else if (component.tbsp) {
    grams = Math.round(tbspGrams(component.nameCn) * component.tbsp);
  } else if (food) {
    // 只给了「适量」→ 按档位中份兜底
    portion = 'medium';
    const category = portionCategory(fallbackCategory ?? resolvePortionCategory(food));
    grams = portionGrams(category, portion);
  }

  return {
    raw: component.nameCn,
    name: component.nameCn,
    quantity: component.tbsp ?? null,
    unit: component.tbsp ? 'tbsp' : null,
    grams,
    food,
    score: best?.score ?? 0,
    portion,
    nutrients: food ? scaleNutrients(food.nut, grams, 'edible', food.edible) : null,
  };
}

/**
 * 识别结果 → 可编辑行。
 * 复合菜（番茄炒蛋这类）拆成原料逐条查表（技术文档 §2.6），
 * 拆不动就退回原来的一条，交给用户手动处理。
 */
export function expandRecognized(index: FoodIndex, item: RecognizedItem): ResolvedItem[] {
  if (!item.isComposite || item.components.length === 0) {
    return [resolveRecognized(index, item)];
  }

  const components = item.components.map((component) =>
    resolveComponentRow(index, component, item.category),
  );

  // 一个都查不到时，保留整道菜（至少用户能看到 AI 认出了什么）
  if (components.every((row) => row.food === null)) {
    return [resolveRecognized(index, item)];
  }

  return components;
}
