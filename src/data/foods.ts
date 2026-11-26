/**
 * 成分表加载与检索索引（技术文档 §5.4）。
 *
 * 1677 条这个量级，全量进内存 + 遍历过滤，0.1~0.5 ms，不需要任何倒排索引。
 * foods.json 是动态 import，进搜索页才加载，不拖慢启动。
 */

import type { FoodDataset, FoodItem } from './types';
import { ALIAS } from './alias';

export interface IndexedFood extends FoodItem {
  /** 去掉（…）与［…］后的核心名，「米饭」 */
  baseName: string;
  /** 表内别名 + 手工别名表补充 */
  searchAliases: string[];
  /** 名称 bigram，用于模糊兜底 */
  bigrams: string[];
  /** 原料 / 调味品：决定匹配策略与 UI 分组 */
  kind: 'ingredient' | 'seasoning';
}

export interface FoodIndex {
  all: IndexedFood[];
  byCode: Map<string, IndexedFood>;
}

const BRACKETS = /[（(][^）)]*[）)]|[［[][^］\]]*[］\]]/g;

function stripBrackets(name: string): string {
  return name.replace(BRACKETS, '').trim();
}

function bigrams(s: string): string[] {
  const chars = [...s];
  if (chars.length < 2) return chars;
  const out: string[] = [];
  for (let i = 0; i < chars.length - 1; i++) out.push(chars[i] + chars[i + 1]);
  return out;
}

export function buildIndex(dataset: FoodDataset): FoodIndex {
  const all: IndexedFood[] = dataset.items.map((item) => {
    const baseName = stripBrackets(item.name);
    const extra: string[] = [];
    for (const [canonical, synonyms] of Object.entries(ALIAS)) {
      // 只认「核心名里有」的，避免「淀粉（马铃薯）」被当成马铃薯的正名
      if (baseName.includes(canonical) || item.alias?.includes(canonical)) {
        extra.push(...synonyms);
      }
    }
    const searchAliases = [...new Set([...(item.alias ?? []), ...extra])];
    return {
      ...item,
      baseName,
      searchAliases,
      bigrams: bigrams(baseName),
      kind: item.cat1 === '调味品' ? 'seasoning' : 'ingredient',
    };
  });

  return {
    all,
    byCode: new Map(all.map((item) => [item.code, item])),
  };
}

let pending: Promise<FoodIndex> | null = null;

/** 懒加载 + 单例 */
export function loadFoodIndex(): Promise<FoodIndex> {
  if (!pending) {
    pending = import('../assets/foods.json').then((mod) => {
      const dataset = (mod.default ?? mod) as unknown as FoodDataset;
      return buildIndex(dataset);
    });
  }
  return pending;
}

// ---------------------------------------------------------------- 检索打分

export type MatchVia = 'name' | 'alias' | 'pinyin' | 'contains' | 'bigram' | 'token';

export interface SearchOptions {
  /**
   * 精确模式：只接受「名字/核心名/别名完全相等」。
   * 组成匹配（AI 拆出来的原料）必须用它——
   * 否则「醋」会命中「醋栗」、「蒜」会命中「蒜肠」，还不如直接交给 AI。
   */
  exact?: boolean;
  /** 只看原料或只看调味品 */
  kind?: 'ingredient' | 'seasoning';
}

export interface SearchHit {
  item: IndexedFood;
  score: number;
  via: MatchVia;
}

/** 归一化：小写、去空格、全角转半角 */
function normalize(input: string): string {
  return input
    .replace(/[\uff01-\uff5e]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, '');
}

/** 查询词的同义扩展（西红柿 → 番茄） */
function expandQuery(q: string): string[] {
  const synonyms = ALIAS[q] ?? [];
  return [q, ...synonyms.map(normalize)];
}

const isRepresentative = (item: IndexedFood) => /x$/.test(item.code);

export function searchFoods(
  index: FoodIndex,
  query: string,
  limit = 30,
  options: SearchOptions = {},
): SearchHit[] {
  const q = normalize(query);
  if (q.length === 0) return [];

  const qAliases = expandQuery(q);
  const qBigrams = bigrams(q);
  // 多词查询（「面条 煮」）按 AND 处理，空格/逗号/顿号都当分隔
  const qTokens = query
    .split(/[\s,，、/]+/)
    .map(normalize)
    .filter((tok) => tok.length > 0);

  const hits: SearchHit[] = [];

  for (const item of index.all) {
    if (options.kind && item.kind !== options.kind) continue;

    if (options.exact) {
      const exact =
        item.name === q || item.baseName === q
          ? 1
          : item.searchAliases.some((a) => normalize(a) === q)
            ? 0.9
            : qAliases.some((x) => x !== q && (item.baseName === x || item.name === x))
              ? 0.88
              : 0;
      if (exact > 0) {
        hits.push({ item, score: exact, via: exact === 1 ? 'name' : 'alias' });
      }
      continue;
    }

    let score = 0;
    let via: MatchVia = 'bigram';

    const allTokensInName =
      qTokens.length > 1 && qTokens.every((tok) => item.name.includes(tok));
    const allTokensInAny =
      qTokens.length > 1 &&
      qTokens.every(
        (tok) => item.name.includes(tok) || item.searchAliases.some((a) => a.includes(tok)),
      );

    if (item.name === q || item.baseName === q) {
      score = 1;
      via = 'name';
    } else if (allTokensInName) {
      score = 0.95;
      via = 'contains';
    } else if (item.searchAliases.some((a) => normalize(a) === q)) {
      score = 0.9;
      via = 'alias';
    } else if (qAliases.some((x) => x !== q && (item.baseName === x || item.name === x))) {
      // 查询词是别名，条目是正名（西红柿 → 番茄）
      score = 0.88;
      via = 'alias';
    } else if (allTokensInAny) {
      score = 0.82;
      via = 'token';
    } else if (item.py === q) {
      score = 0.8;
      via = 'pinyin';
    } else if (item.ini === q) {
      score = 0.78;
      via = 'pinyin';
    } else if (item.pyFull === q || (q.length >= 3 && item.py.startsWith(q))) {
      score = 0.74;
      via = 'pinyin';
    } else if (item.baseName.includes(q)) {
      score = 0.7;
      via = 'contains';
    } else if (item.name.includes(q)) {
      score = 0.68;
      via = 'contains';
    } else if (q.length >= 4 && item.pyFull.includes(q)) {
      // 拼音子串：fqfen → 面条（富强粉）
      score = 0.64;
      via = 'pinyin';
    } else if (q.includes(item.baseName) && item.baseName.length >= 2) {
      score = 0.62;
      via = 'contains';
    } else if (item.searchAliases.some((a) => normalize(a).includes(q))) {
      score = 0.55;
      via = 'token';
    } else if (qBigrams.length > 0) {
      const overlap = qBigrams.filter((b) => item.baseName.includes(b)).length;
      const ratio = overlap / qBigrams.length;
      if (ratio >= 0.5) {
        score = 0.5 * ratio;
        via = 'bigram';
      }
    }

    // 罐头是特定变体，不该压过新鲜的同名食物
    if (score > 0 && item.state === '罐头') score *= 0.97;

    if (score > 0) hits.push({ item, score, via });
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // 同分优先「代表值」条目（成分表里带 x 后缀的平均值）
    const ra = isRepresentative(a.item) ? 0 : 1;
    const rb = isRepresentative(b.item) ? 0 : 1;
    if (ra !== rb) return ra - rb;
    if (a.item.baseName.length !== b.item.baseName.length) {
      return a.item.baseName.length - b.item.baseName.length;
    }
    return a.item.code.localeCompare(b.item.code);
  });

  return hits.slice(0, limit);
}
