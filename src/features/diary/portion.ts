import type { Portion } from '../../data/types';

/**
 * 份量档位表（技术文档 §2.4）。
 * 全部是「市面上常见的一份」，属常识量，不需要称重。可直接调整。
 */
export const PORTION_CATEGORIES = [
  '米饭',
  '面条（熟）',
  '粥',
  '炒青菜',
  '炒菜（带肉）',
  '肉类（单份）',
  '汤',
  '水果',
  '面包',
  '饮品',
] as const;

export type PortionCategory = (typeof PORTION_CATEGORIES)[number];

export const PORTION_TABLE: Record<PortionCategory, Record<Portion, number>> = {
  米饭: { small: 100, medium: 150, large: 200 },
  '面条（熟）': { small: 180, medium: 250, large: 320 },
  粥: { small: 200, medium: 300, large: 400 },
  炒青菜: { small: 120, medium: 200, large: 300 },
  '炒菜（带肉）': { small: 150, medium: 220, large: 300 },
  '肉类（单份）': { small: 80, medium: 120, large: 180 },
  汤: { small: 200, medium: 300, large: 400 },
  水果: { small: 100, medium: 170, large: 250 },
  面包: { small: 30, medium: 50, large: 80 },
  饮品: { small: 200, medium: 250, large: 330 },
};

export function portionGrams(category: PortionCategory, portion: Portion): number {
  return PORTION_TABLE[category][portion];
}

/** 根据成分表条目猜一个档位类别，让「小/中/大」能直接换算出克数 */
export function resolvePortionCategory(item: {
  name: string;
  cat1: string;
  cat2: string;
}): PortionCategory {
  const { name, cat1, cat2 } = item;
  const text = `${cat2}${name}`;

  if (text.includes('粥')) return '粥';
  if (/面包|吐司|餐包/.test(text)) return '面包';
  if (text.includes('汤')) return '汤';
  if (/面条|挂面|拉面|米线|米粉|河粉|面片|烩面/.test(text)) return '面条（熟）';
  if (/米饭|饭|馒头|花卷|烙饼|烧饼|饼/.test(text)) return '米饭';
  if (cat1.startsWith('水果')) return '水果';
  if (cat1.startsWith('蔬菜') || cat1.startsWith('菌藻')) return '炒青菜';
  if (cat1.startsWith('畜肉') || cat1.startsWith('禽肉') || cat1.startsWith('鱼虾')) {
    return '肉类（单份）';
  }
  if (cat1.startsWith('乳类') || text.includes('饮料') || text.includes('茶')) return '饮品';
  return '炒菜（带肉）';
}
