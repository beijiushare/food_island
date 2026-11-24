import { create } from 'zustand';

import type { IndexedFood } from '../../data/foods';
import type {
  Basis,
  DiaryEntry,
  EntryComponent,
  Meal,
  MemoryItem,
  Nutrients,
  Portion,
} from '../../data/types';
import { emptyNutrients, scaleNutrients, sumNutrients } from '../diary/calc';
import {
  portionGrams,
  resolvePortionCategory,
  type PortionCategory,
} from '../diary/portion';
import { parseSentence, resolveParsed } from '../parse/sentence';
import { resolveComponentRow, resolveRecognized, type RecognizedItem } from '../ai/recognize';
import type { FoodIndex } from '../../data/foods';
import { deletePhotoFile } from '../../services/photo';

/** 草稿里的原料：比落库版本多带「按 100g 重算」所需的信息 */
export interface DraftComponent extends EntryComponent {
  per100: Nutrients | null;
  edible: number | null;
}

export interface DraftRow {
  id: string;
  name: string;
  grams: number;
  portion?: Portion;
  /** 简单食物才有档位类别；复合菜为空 */
  category?: PortionCategory;
  basis: Basis;
  foodCode: string | null;
  nutrients: Nutrients;
  components?: DraftComponent[];
  /** 手改过营养，改克数不重算 */
  nutrientsManual?: boolean;
  /** 没查到成分表，需要手填营养 */
  unresolved?: boolean;
  source: DiaryEntry['source'];
  per100?: Nutrients | null;
  edible?: number | null;
}

export interface DraftPhoto {
  id: string;
  relPath: string;
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
}

interface DraftState {
  date: string;
  meal: Meal;
  text: string;
  photos: DraftPhoto[];
  rows: DraftRow[];

  setContext: (date: string, meal: Meal) => void;
  setText: (text: string) => void;
  addPhoto: (photo: DraftPhoto) => void;
  removePhoto: (id: string) => Promise<void>;
  addRow: (row: DraftRow) => void;
  setRows: (rows: DraftRow[]) => void;
  removeRow: (id: string) => void;
  setRowName: (id: string, name: string) => void;
  setRowGrams: (id: string, grams: number) => void;
  setRowPortion: (id: string, portion: Portion) => void;
  setComponentGrams: (rowId: string, index: number, grams: number) => void;
  setRowNutrients: (id: string, patch: Partial<Nutrients>) => void;
  resetRowNutrients: (id: string) => void;
  /** 清空草稿；true 时把没保存的照片文件一并删掉 */
  reset: (deletePhotos?: boolean) => Promise<void>;
}

function withNutrition(row: DraftRow, grams: number): DraftRow {
  if (row.nutrientsManual) return { ...row, grams };

  if (row.components?.length) {
    const factor = row.grams > 0 ? grams / row.grams : 1;
    const components = row.components.map((component) => {
      const nextGrams = Math.max(1, Math.round(component.grams * factor));
      return {
        ...component,
        grams: nextGrams,
        nutrients: component.per100
          ? scaleNutrients(component.per100, nextGrams, 'edible', component.edible)
          : component.nutrients,
      };
    });
    return {
      ...row,
      grams,
      components,
      nutrients: sumNutrients(components.map((component) => component.nutrients)),
    };
  }

  if (row.per100) {
    return {
      ...row,
      grams,
      nutrients: scaleNutrients(row.per100, grams, row.basis, row.edible),
    };
  }

  return { ...row, grams };
}

export const useDraft = create<DraftState>((set, get) => ({
  date: '',
  meal: 'lunch',
  text: '',
  photos: [],
  rows: [],

  setContext: (date, meal) => set({ date, meal }),
  setText: (text) => set({ text }),

  addPhoto: (photo) => set((state) => ({ photos: [...state.photos, photo] })),

  removePhoto: async (id) => {
    const photo = get().photos.find((item) => item.id === id);
    set((state) => ({ photos: state.photos.filter((item) => item.id !== id) }));
    // 真删：文件留着迟早把手机撑爆
    if (photo) await deletePhotoFile(photo.relPath);
  },

  addRow: (row) => set((state) => ({ rows: [...state.rows, row] })),
  setRows: (rows) => set({ rows }),

  removeRow: (id) => set((state) => ({ rows: state.rows.filter((row) => row.id !== id) })),

  setRowName: (id, name) =>
    set((state) => ({
      rows: state.rows.map((row) => (row.id === id ? { ...row, name } : row)),
    })),

  setRowGrams: (id, grams) =>
    set((state) => ({
      rows: state.rows.map((row) => (row.id === id ? withNutrition(row, Math.max(1, grams)) : row)),
    })),

  setRowPortion: (id, portion) =>
    set((state) => ({
      rows: state.rows.map((row) => {
        if (row.id !== id || !row.category) return row;
        const next = withNutrition(row, portionGrams(row.category, portion));
        return { ...next, portion };
      }),
    })),

  setComponentGrams: (rowId, index, grams) =>
    set((state) => ({
      rows: state.rows.map((row) => {
        if (row.id !== rowId || !row.components) return row;
        const components = row.components.map((component, i) => {
          if (i !== index) return component;
          const nextGrams = Math.max(1, Math.round(grams));
          return {
            ...component,
            grams: nextGrams,
            nutrients: component.per100
              ? scaleNutrients(component.per100, nextGrams, 'edible', component.edible)
              : component.nutrients,
          };
        });
        return {
          ...row,
          components,
          grams: components.reduce((total, component) => total + component.grams, 0),
          nutrients: sumNutrients(components.map((component) => component.nutrients)),
        };
      }),
    })),

  setRowNutrients: (id, patch) =>
    set((state) => ({
      rows: state.rows.map((row) =>
        row.id === id
          ? {
              ...row,
              nutrientsManual: true,
              nutrients: { ...row.nutrients, ...patch },
            }
          : row,
      ),
    })),

  resetRowNutrients: (id) =>
    set((state) => ({
      rows: state.rows.map((row) => {
        if (row.id !== id) return row;
        const next: DraftRow = { ...row };
        delete next.nutrientsManual;
        return withNutrition(next, row.grams);
      }),
    })),

  reset: async (deletePhotos = true) => {
    const photos = get().photos;
    set({ text: '', photos: [], rows: [] });
    if (!deletePhotos) return;
    for (const photo of photos) await deletePhotoFile(photo.relPath);
  },
}));

// ---------------------------------------------------------------- 构造行

let seq = 0;
const nextId = () => `row-${++seq}`;

function rowFromFood(item: IndexedFood, portion: Portion): DraftRow {
  const category = resolvePortionCategory(item);
  const grams = portionGrams(category, portion);
  return {
    id: nextId(),
    name: item.name,
    grams,
    portion,
    category,
    basis: 'edible',
    foodCode: item.code,
    nutrients: scaleNutrients(item.nut, grams, 'edible', item.edible),
    source: 'search',
    per100: item.nut,
    edible: item.edible,
  };
}

export function rowsFromSearch(
  item: IndexedFood,
  source: 'search' | 'memory' = 'search',
): DraftRow[] {
  const row = rowFromFood(item, 'medium');
  return [{ ...row, source }];
}

/** 最近吃过：份量沿用上一次 */
export function rowsFromMemory(
  memory: MemoryItem,
  index: { byCode: Map<string, IndexedFood> } | null,
): DraftRow[] {
  const code = memory.foodKey.startsWith('name:') ? null : memory.foodKey;
  const food = code ? (index?.byCode.get(code) ?? null) : null;
  if (!food) return [];

  const category = resolvePortionCategory(food);
  const grams = memory.grams > 0 ? memory.grams : portionGrams(category, 'medium');
  return [
    {
      id: nextId(),
      name: food.name,
      grams: Math.round(grams),
      portion: memory.portion,
      category,
      basis: 'edible',
      foodCode: food.code,
      nutrients: scaleNutrients(food.nut, grams, 'edible', food.edible),
      source: 'memory',
      per100: food.nut,
      edible: food.edible,
    },
  ];
}

/**
 * AI 识别 → 草稿行。
 * 复合菜合成一条（一道菜一行），原料挂在 components 里；
 * 原料全查不到时保留整道菜，让用户手填。
 */
export function rowsFromRecognized(index: FoodIndex, items: RecognizedItem[]): DraftRow[] {
  const rows: DraftRow[] = [];

  for (const item of items) {
    if (item.isComposite && item.components.length > 0) {
      const components = item.components
        .map((component) => resolveComponentRow(index, component, item.category))
        .filter((resolved) => resolved.food !== null)
        .map<DraftComponent>((resolved) => ({
          name: resolved.food?.name ?? resolved.name,
          grams: resolved.grams,
          foodCode: resolved.food?.code ?? null,
          nutrients: resolved.nutrients ?? emptyNutrients(),
          per100: resolved.food?.nut ?? null,
          edible: resolved.food?.edible ?? null,
        }));

      if (components.length > 0) {
        rows.push({
          id: nextId(),
          name: item.nameCn,
          grams: components.reduce((total, component) => total + component.grams, 0),
          portion: item.portion,
          basis: 'edible',
          foodCode: null,
          nutrients: sumNutrients(components.map((component) => component.nutrients)),
          components,
          source: 'photo',
        });
        continue;
      }
    }

    const resolved = resolveRecognized(index, item);
    const food = resolved.food;

    rows.push({
      id: nextId(),
      name: food?.name ?? item.nameCn,
      grams: food ? resolved.grams : 0,
      portion: food ? item.portion : undefined,
      category: food ? resolvePortionCategory(food) : undefined,
      basis: 'edible',
      foodCode: food?.code ?? null,
      nutrients: resolved.nutrients ?? emptyNutrients(),
      unresolved: !food,
      source: 'photo',
      per100: food?.nut ?? null,
      edible: food?.edible ?? null,
    });
  }

  return rows;
}

/** 没配 Key 时的文字兜底：本地规则解析 */
export function rowsFromSentence(index: FoodIndex, sentence: string): DraftRow[] {
  return parseSentence(sentence).map((parsed) => {
    const item = resolveParsed(index, parsed);
    const food = item.food;
    return {
      id: nextId(),
      name: food?.name ?? item.name,
      grams: food ? item.grams : 0,
      portion: item.portion,
      category: food ? resolvePortionCategory(food) : undefined,
      basis: 'edible',
      foodCode: food?.code ?? null,
      nutrients: item.nutrients ?? emptyNutrients(),
      unresolved: !food,
      source: 'text',
      per100: food?.nut ?? null,
      edible: food?.edible ?? null,
    };
  });
}
