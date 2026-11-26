import { create } from 'zustand';

import type { IndexedFood } from '../../data/foods';
import type { DishItem } from '../../data/dishes';
import type {
  Basis,
  DiaryEntry,
  EntryComponent,
  Meal,
  MemoryItem,
  Nutrients,
} from '../../data/types';
import { scaleNutrients, sumNutrients } from '../diary/calc';
import {
  portionGrams,
  resolvePortionCategory,
  type PortionCategory,
} from '../diary/portion';
import { resolveDish, type DishDraft } from '../ai/recognize';
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
  /** 只用来给一个起始克数，不再作为「小/中/大」展示 */
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
  /** 编辑已有记录时带着原记录（id/createdAt/photoId 要保留） */
  baseEntry: DiaryEntry | null;
  /** 编辑时原来那张照片（只展示，不参与 reset 的删除） */
  editPhoto: DraftPhoto | null;
  /** 用户点了「删照片」，保存时才真删 */
  photoRemoved: boolean;

  setContext: (date: string, meal: Meal) => void;
  setText: (text: string) => void;
  addPhoto: (photo: DraftPhoto) => void;
  removePhoto: (id: string) => Promise<void>;
  addRow: (row: DraftRow) => void;
  setRows: (rows: DraftRow[]) => void;
  removeRow: (id: string) => void;
  setRowName: (id: string, name: string) => void;
  setRowGrams: (id: string, grams: number) => void;
  setComponentGrams: (rowId: string, index: number, grams: number) => void;
  setRowNutrients: (id: string, patch: Partial<Nutrients>) => void;
  resetRowNutrients: (id: string) => void;
  /** 打开已有记录准备编辑 */
  startEdit: (entry: DiaryEntry, rows: DraftRow[], photo: DraftPhoto | null) => void;
  markPhotoRemoved: () => void;
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
  baseEntry: null,
  editPhoto: null,
  photoRemoved: false,

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

  startEdit: (entry, rows, photo) =>
    set({
      date: entry.date,
      meal: entry.meal,
      text: '',
      photos: [],
      rows,
      baseEntry: entry,
      editPhoto: photo,
      photoRemoved: false,
    }),

  markPhotoRemoved: () => set({ photoRemoved: true, editPhoto: null }),

  reset: async (deletePhotos = true) => {
    const photos = get().photos;
    set({
      text: '',
      photos: [],
      rows: [],
      baseEntry: null,
      editPhoto: null,
      photoRemoved: false,
    });
    if (!deletePhotos) return;
    for (const photo of photos) await deletePhotoFile(photo.relPath);
  },
}));

// ---------------------------------------------------------------- 构造行

let seq = 0;
const nextId = () => `row-${++seq}`;

function rowFromFood(item: IndexedFood): DraftRow {
  const category = resolvePortionCategory(item);
  const grams = portionGrams(category, 'medium');
  return {
    id: nextId(),
    name: item.name,
    grams,
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
  const row = rowFromFood(item);
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

/** 结果 → 一行草稿（AI 识别与菜品库共用） */
function rowFromResolved(
  resolved: { name: string; grams: number; components: EntryComponent[]; nutrients: Nutrients },
  source: DiaryEntry['source'],
): DraftRow {
  return {
    id: nextId(),
    name: resolved.name,
    grams: resolved.grams,
    basis: 'edible',
    foodCode: null,
    nutrients: resolved.nutrients,
    components: resolved.components.map<DraftComponent>((component) => ({
      name: component.name,
      grams: component.grams,
      foodCode: component.foodCode,
      nutrients: component.nutrients,
      per100: component.per100 ?? null,
      edible: null,
      source: component.source,
      kind: component.kind,
      clamped: component.clamped,
    })),
    source,
  };
}

/**
 * AI 识别 → 草稿行。
 * 一道菜一行，原料和调料都在 components 里；本地查不到的组成用 AI 的每 100g 值。
 */
export function rowsFromDish(index: FoodIndex, dish: DishDraft): DraftRow[] {
  return [rowFromResolved(resolveDish(index, dish), 'photo')];
}

/** 从菜品库选一道菜：按每 100 g 比例换算成指定克数（默认用配方的一份） */
export function rowsFromRecipe(
  index: FoodIndex,
  dish: DishItem,
  grams = dish.servingGrams || 250,
): DraftRow[] {
  const draft: DishDraft = {
    name: dish.name,
    grams,
    components: dish.components.map((component) => ({
      name: component.name,
      grams: Math.max(1, Math.round((component.ratio * grams) / 100)),
      kind: isSeasoningName(component.name) ? 'seasoning' : 'ingredient',
      per100: component.per100,
    })),
  };
  return [rowFromResolved(resolveDish(index, draft, 'recipe'), 'search')];
}

function isSeasoningName(name: string): boolean {
  return /油|盐|糖|醋|酱|精|淀粉|料酒|花椒|胡椒|咖喱|汁|料/.test(name);
}

/** 已有记录 → 草稿行（编辑页用），保留原营养快照与原料明细 */
export function rowsFromEntry(entry: DiaryEntry, index: FoodIndex | null): DraftRow[] {
  const food = entry.foodCode ? (index?.byCode.get(entry.foodCode) ?? null) : null;
  const components = entry.components?.map<DraftComponent>((component) => {
    const componentFood = component.foodCode
      ? (index?.byCode.get(component.foodCode) ?? null)
      : null;
    return {
      name: component.name,
      grams: component.grams,
      foodCode: component.foodCode,
      nutrients: component.nutrients,
      per100: component.per100 ?? componentFood?.nut ?? null,
      edible: componentFood?.edible ?? null,
      source: component.source,
      kind: component.kind,
      clamped: component.clamped,
    };
  });

  return [
    {
      id: nextId(),
      name: entry.name || '未命名',
      grams: entry.grams,
      category: food ? resolvePortionCategory(food) : undefined,
      basis: entry.basis,
      foodCode: entry.foodCode,
      nutrients: entry.nutrients,
      nutrientsManual: entry.nutrientsManual,
      unresolved: !food && !components?.length,
      components,
      source: entry.source,
      per100: food?.nut ?? null,
      edible: food?.edible ?? null,
    },
  ];
}
