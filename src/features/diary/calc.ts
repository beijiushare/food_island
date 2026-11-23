import { NUTRIENT_KEYS, type Basis, type Nutrients } from '../../data/types';

export function emptyNutrients(): Nutrients {
  const out = {} as Nutrients;
  for (const key of NUTRIENT_KEYS) out[key] = 0;
  return out;
}

/**
 * 技术文档 §8.2：nutrients = per100 × 克数 / 100
 * basis = as_purchased 时，先按可食部折算（带骨带壳整体计量）。
 */
export function scaleNutrients(
  per100: Nutrients,
  grams: number,
  basis: Basis = 'edible',
  edible: number | null = 100,
): Nutrients {
  const usable = basis === 'as_purchased' ? (grams * (edible ?? 100)) / 100 : grams;
  const factor = usable / 100;
  const out = {} as Nutrients;
  for (const key of NUTRIENT_KEYS) {
    const value = per100[key];
    out[key] = value === null ? 0 : Math.round(value * factor * 100) / 100;
  }
  return out;
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  const out = emptyNutrients();
  for (const item of list) {
    for (const key of NUTRIENT_KEYS) {
      out[key] = (out[key] ?? 0) + (item[key] ?? 0);
    }
  }
  for (const key of NUTRIENT_KEYS) {
    out[key] = Math.round((out[key] ?? 0) * 10) / 10;
  }
  return out;
}

/** 显示用：整数千卡 */
export function kcalOf(nutrients: Nutrients): number {
  return Math.round(nutrients.kcal ?? 0);
}
