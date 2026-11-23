/**
 * 一句话 → 食物条目（本地规则，不调 AI）。
 *
 * 设计（技术文档 §7.3）：本地正则优先，因为「二两米饭」这类表达规则极固定，
 * 准确率 100%，还省一次 API 调用。AI 只做兜底（P5 再接）。
 */

import { searchFoods, type FoodIndex, type IndexedFood } from '../../data/foods';
import type { Nutrients, Portion } from '../../data/types';
import { scaleNutrients } from '../diary/calc';
import { portionGrams, resolvePortionCategory } from '../diary/portion';
import { cnToNumber } from './cnNumber';
import { unitGrams } from './units';

export interface ParsedItem {
  /** 原始片段 */
  raw: string;
  /** 去掉数量后的食物名 */
  name: string;
  quantity: number | null;
  unit: string | null;
  /** 明确说出的克数（含单位折算），没说出来就是 null */
  grams: number | null;
}

export interface ResolvedItem extends ParsedItem {
  food: IndexedFood | null;
  score: number;
  /** 最终采用克数（没给就用中份） */
  grams: number;
  /** 只在「没给克数」时才有档位；明确说了克数就不该再标小/中/大 */
  portion?: Portion;
  nutrients: Nutrients | null;
}

/** 一条记录里可能有多个食物：先按标点和连接词切 */
const SEGMENT_SPLIT = /[、,，;；。!！?\n]+|和|跟|还有|外加/;

const QTY_SOURCE =
  '(\\d+(?:\\.\\d+)?|[零〇一二三四五六七八九十百千半]+|两)\\s*(公克|毫升|克|g|G|ml|mL|两|斤|碗|盘|杯|瓶|盒|包|袋|份|个|只|条|片|块|勺|汤匙|茶匙)';

const QTY_RE = new RegExp(QTY_SOURCE);

const LEADING_NOISE =
  /^(我|今天|昨天|早上|上午|中午|下午|晚上|夜里|早饭|午饭|晚饭|夜宵|吃了|喝了|来了|又|再|点了|买了|大概|差不多|的)+/;

/** 单字食材映射到成分表里真正的条目（「油」在表里叫豆油，「粥」没有独立条目） */
const INGREDIENT_ALIAS: Record<string, string> = {
  油: '豆油',
  食用油: '豆油',
  植物油: '豆油',
  花生油: '花生油',
  菜油: '菜籽油',
  色拉油: '豆油',
  粥: '粳米粥',
  稀饭: '粳米粥',
  饭: '米饭',
  面: '面条',
  蛋: '鸡蛋',
};

function cleanName(input: string): string {
  let name = input.trim();
  let prev = '';
  // 反复剥前缀，直到稳定（「我今天中午吃了」要剥好几层）
  while (prev !== name) {
    prev = name;
    name = name.replace(LEADING_NOISE, '').trim();
  }
  return name;
}

/**
 * 「一个包子一杯豆浆」这种没有标点的连写，按数量词再切一次。
 * 返回的每段都以数量词开头。
 */
function splitByQuantities(chunk: string): string[] {
  const matches = [...chunk.matchAll(new RegExp(QTY_SOURCE, 'g'))];
  if (matches.length <= 1) return [chunk];

  const pieces: string[] = [];
  const prefix = chunk.slice(0, matches[0].index ?? 0);
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? chunk.length) : chunk.length;
    const piece = chunk.slice(start, end).trim();
    if (piece) pieces.push(i === 0 ? `${prefix}${piece}` : piece);
  }
  return pieces;
}

export function parseSentence(input: string): ParsedItem[] {
  const items: ParsedItem[] = [];

  for (const chunk of input.split(SEGMENT_SPLIT)) {
    if (!chunk.trim()) continue;

    for (const segment of splitByQuantities(chunk)) {
      const raw = segment.trim();
      if (!raw) continue;

      const match = QTY_RE.exec(raw);
      if (!match) {
        const name = cleanName(raw);
        if (name) items.push({ raw, name, quantity: null, unit: null, grams: null });
        continue;
      }

      const [full, numberText, unit] = match;
      let quantity = cnToNumber(numberText);
      let name = cleanName(raw.slice(0, match.index) + raw.slice(match.index + full.length));

      // 「一两半」= 1.5 两
      if (name.startsWith('半')) {
        quantity = (quantity ?? 0) + 0.5;
        name = name.slice(1).trim();
      }

      if (!name) continue;

      const per = unitGrams(unit, name);
      const grams = per !== null && quantity !== null ? Math.round(per * quantity) : null;

      items.push({ raw, name, quantity, unit, grams });
    }
  }

  return items;
}

/** 解析结果 → 成分表条目 + 克数 + 营养 */
export function resolveParsed(index: FoodIndex, parsed: ParsedItem): ResolvedItem {
  const cleaned = parsed.name.trim();
  const nameForMatch = INGREDIENT_ALIAS[cleaned] ?? cleaned;

  const hits = nameForMatch ? searchFoods(index, nameForMatch, 20) : [];
  let best: (typeof hits)[number] | undefined = hits[0];

  // 单字查询只接受完全同名/别名命中，否则「油」会匹到「油饼」
  const isSingleChar = [...cleaned].length === 1;
  if (best && isSingleChar && best.via !== 'name' && best.via !== 'alias') {
    best = undefined;
  }

  // 生熟陷阱：说「面条」默认是煮好的，除非明确说了「生」
  if (best && best.item.state === '生' && !/生/.test(cleaned)) {
    const minScore = Math.min(0.7, best.score);
    const cooked = hits.find(
      (hit) => /煮|蒸|熟|炒|烤/.test(hit.item.name) && hit.score >= minScore,
    );
    if (cooked) best = cooked;
  }

  const food = best && best.score >= 0.7 ? best.item : null;

  // 说了克数 → 不再标档位；没说 → 用中份兜底
  const portion: Portion | undefined =
    parsed.grams !== null ? undefined : food ? 'medium' : undefined;
  const grams = parsed.grams ?? (food && portion ? portionGrams(resolvePortionCategory(food), portion) : 0);

  return {
    ...parsed,
    food,
    score: best?.score ?? 0,
    grams,
    portion,
    nutrients: food ? scaleNutrients(food.nut, grams, 'edible', food.edible) : null,
  };
}
