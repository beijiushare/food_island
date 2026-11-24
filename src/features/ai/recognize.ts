import type { FoodIndex } from '../../data/foods';
import { searchFoods } from '../../data/foods';
import type { Portion } from '../../data/types';
import { scaleNutrients } from '../diary/calc';
import { PORTION_CATEGORIES, portionGrams, resolvePortionCategory } from '../diary/portion';
import type { ResolvedItem } from '../parse/sentence';
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

/** 调一次视觉模型，拿识别结果 */
export async function recognizePhoto(
  profile: AIProfile,
  photoDataUrl: string,
): Promise<RecognizedItem[]> {
  const raw = await chat(profile, [
    {
      role: 'user',
      content: [
        { type: 'text', text: RECOGNIZE_PROMPT },
        { type: 'image_url', image_url: { url: photoDataUrl } },
      ],
    },
  ]);
  return parseRecognition(raw);
}

/** 没有 Key 时用的示例结果，用于把链路跑通 */
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
