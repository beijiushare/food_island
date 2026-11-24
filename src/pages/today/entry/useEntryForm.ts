import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { addEntry, deleteEntry, putEntry } from '../../../data/dao/diary';
import { addPhotoRef, deletePhotoByEntry, getPhotoByEntry } from '../../../data/dao/photos';
import { getAIProfile } from '../../../data/dao/settings';
import { searchFoods, type IndexedFood } from '../../../data/foods';
import type { Basis, DiaryEntry, Meal, Portion } from '../../../data/types';
import { useFoodIndex } from '../../../data/useFoodIndex';
import { mockRecognition, recognizePhoto, resolveRecognized } from '../../../features/ai/recognize';
import { emptyNutrients, scaleNutrients } from '../../../features/diary/calc';
import { portionGrams, resolvePortionCategory } from '../../../features/diary/portion';
import { useRecentFoods } from '../../../features/memory/hooks';
import { rememberFood } from '../../../features/memory/memory';
import { parseSentence, resolveParsed, type ResolvedItem } from '../../../features/parse/sentence';
import { useSheetStore } from '../../../features/ui/sheetStore';
import { capturePhoto, deletePhotoFile, photoDataUrl } from '../../../services/photo';

export interface EntrySheetProps {
  open: boolean;
  date: string;
  defaultMeal: Meal;
  editing: DiaryEntry | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export type EntryMode = 'pick' | 'sentence' | 'review';

export interface PhotoMeta {
  width: number;
  height: number;
  bytes: number;
}

/**
 * 录入弹窗的全部状态与动作。
 * 拆出 hook 是为了让三个视图（选择 / 文字 / 详情）只负责渲染。
 */
export function useEntryForm({
  open,
  date,
  defaultMeal,
  editing,
  onClose,
  onSaved,
}: EntrySheetProps) {
  const { t } = useTranslation();
  const { index } = useFoodIndex(open);
  const recent = useRecentFoods(8);

  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<IndexedFood | null>(null);
  const [grams, setGrams] = useState(150);
  const [portion, setPortion] = useState<Portion | undefined>();
  const [meal, setMeal] = useState<Meal>(defaultMeal);
  const [basis, setBasis] = useState<Basis>('edible');
  const [busy, setBusy] = useState(false);
  const initializedRef = useRef(false);

  const [mode, setMode] = useState<EntryMode>('pick');
  const [sentence, setSentence] = useState('');
  const [rows, setRows] = useState<ResolvedItem[]>([]);
  const [recognizing, setRecognizing] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // 拍照即建档：pending 表示「只有照片、食物待补」
  const [pendingEntry, setPendingEntry] = useState<DiaryEntry | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoMeta, setPhotoMeta] = useState<PhotoMeta | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  /** 当前正在编辑/补充的记录 */
  const target = editing ?? pendingEntry;

  // 把「弹窗是否打开」告诉 Android 返回键的处理器
  const setSheetState = useSheetStore((state) => state.setSheet);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setSheetState(true, () => onCloseRef.current());
    return () => setSheetState(false);
  }, [open, setSheetState]);

  // 有 Key 才能真识别，没有就先给示例结果，按钮文案也随之变化
  useEffect(() => {
    if (!open) return;
    let alive = true;
    getAIProfile().then(
      (profile) => {
        if (alive) setHasKey(profile.apiKey.length > 0);
      },
      () => {
        if (alive) setHasKey(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [open]);

  // 只在「打开的那一次」回填，索引后到也不会把用户正在改的值冲掉
  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    if (editing?.foodCode && !index) return;

    initializedRef.current = true;
    setBusy(false);
    setQuery('');
    setMode('pick');
    setSentence('');
    setRows([]);
    setPendingEntry(null);
    setPhotoPreview(null);
    setPhotoMeta(null);
    setNotice(null);
    setAiNotice(null);

    if (editing) {
      const item = editing.foodCode ? index?.byCode.get(editing.foodCode) : undefined;
      setPicked(item ?? null);
      setGrams(editing.grams);
      setPortion(editing.portion);
      setMeal(editing.meal);
      setBasis(editing.basis);

      void getPhotoByEntry(editing.id).then(async (ref) => {
        if (!ref) return;
        try {
          setPhotoPreview(await photoDataUrl(ref.relPath));
          setPhotoMeta({ width: ref.width, height: ref.height, bytes: ref.bytes });
        } catch {
          /* 文件可能已被系统清理，忽略 */
        }
      });
    } else {
      setPicked(null);
      setGrams(150);
      setPortion(undefined);
      setMeal(defaultMeal);
      setBasis('edible');
    }
  }, [open, editing, defaultMeal, index]);

  const hits = useMemo(
    () => (index && query.trim() ? searchFoods(index, query, 20) : []),
    [index, query],
  );

  const previewNutrients = useMemo(() => {
    if (!picked) return null;
    return scaleNutrients(picked.nut, grams, basis, picked.edible);
  }, [picked, grams, basis]);

  const portionLabels = {
    small: t('entry.small'),
    medium: t('entry.medium'),
    large: t('entry.large'),
  };

  function pick(item: IndexedFood) {
    const category = resolvePortionCategory(item);
    setPicked(item);
    setPortion('medium');
    setGrams(portionGrams(category, 'medium'));
    setQuery('');
  }

  function applyPortion(next: Portion) {
    setPortion(next);
    if (picked) setGrams(portionGrams(resolvePortionCategory(picked), next));
  }

  function changeGrams(next: number) {
    setGrams(next);
    setPortion(undefined);
  }

  // ---------------------------------------------------------------- 照片

  async function takePhoto() {
    if (capturing) return;
    setCapturing(true);
    setNotice(null);
    try {
      const draft = await capturePhoto();
      const photoId = crypto.randomUUID();

      let entry: DiaryEntry;
      if (target) {
        // 已经有这条记录：替换/补上照片即可
        const refs = await deletePhotoByEntry(target.id);
        for (const ref of refs) await deletePhotoFile(ref.relPath);
        entry = { ...target, photoId };
        await putEntry(entry);
      } else {
        entry = await addEntry({
          date,
          meal,
          foodCode: null,
          name: '',
          grams: 0,
          basis: 'edible',
          nutrients: emptyNutrients(),
          source: 'photo',
          photoId,
          pending: true,
        });
      }

      await addPhotoRef({ id: photoId, entryId: entry.id, ...draft, createdAt: Date.now() });
      setPendingEntry(entry);
      setPhotoPreview(await photoDataUrl(draft.relPath));
      setPhotoMeta({ width: draft.width, height: draft.height, bytes: draft.bytes });
      onSaved(t('entry.photoSaved'));
    } catch (error) {
      setNotice(
        t('entry.photoFailed', {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setCapturing(false);
    }
  }

  async function removePhoto() {
    if (!target) {
      setPhotoPreview(null);
      setPhotoMeta(null);
      return;
    }

    setBusy(true);
    try {
      const refs = await deletePhotoByEntry(target.id);
      for (const ref of refs) await deletePhotoFile(ref.relPath);

      if (target.pending) {
        // 照片是这条记录的全部内容，删图就等于删记录
        await deleteEntry(target.id);
        setPendingEntry(null);
        setPhotoPreview(null);
        setPhotoMeta(null);
        onSaved(t('entry.deleted'));
        onClose();
        return;
      }

      const updated: DiaryEntry = { ...target };
      delete updated.photoId;
      await putEntry(updated);
      setPhotoPreview(null);
      setPhotoMeta(null);
      onSaved(t('entry.photoRemoved'));
    } finally {
      setBusy(false);
    }
  }

  /** 拍照识别：有 Key 走真模型，没有就用示例结果把链路跑通 */
  async function runRecognition() {
    if (!index || !photoPreview || recognizing) return;
    setRecognizing(true);
    setAiNotice(null);
    try {
      const profile = await getAIProfile();
      const items = profile.apiKey
        ? await recognizePhoto(profile, photoPreview)
        : (setAiNotice(t('entry.noKey')), mockRecognition());

      const resolved = items.map((item) => resolveRecognized(index, item));
      if (resolved.length === 0) {
        setAiNotice(t('entry.recognizeEmpty'));
        return;
      }
      setRows(resolved);
      setMode('review');
    } catch (error) {
      setAiNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setRecognizing(false);
    }
  }

  // ---------------------------------------------------------------- 保存

  async function save() {
    if (!picked || busy) return;
    setBusy(true);
    try {
      const nutrients = scaleNutrients(picked.nut, grams, basis, picked.edible);

      if (target) {
        const updated: DiaryEntry = {
          ...target,
          foodCode: picked.code,
          name: picked.name,
          meal,
          grams,
          basis,
          nutrients,
          // 从「只有照片」补成正式记录时，来源保留 photo
          source: target.pending ? 'photo' : target.source,
        };
        if (portion) updated.portion = portion;
        else delete updated.portion;
        delete updated.pending;

        await putEntry(updated);
        await rememberFood({ foodCode: picked.code, name: picked.name, grams, portion });
        onSaved(t('entry.updated'));
      } else {
        await addEntry({
          date,
          meal,
          foodCode: picked.code,
          name: picked.name,
          grams,
          basis,
          portion,
          nutrients,
          source: 'search',
        });
        await rememberFood({ foodCode: picked.code, name: picked.name, grams, portion });
        onSaved(t('entry.saved'));
      }

      onClose();
    } finally {
      setBusy(false);
    }
  }

  /** 最近吃过：点一下直接记上，零操作 */
  async function quickAdd(foodKey: string, memoryGrams: number, memoryPortion?: Portion) {
    if (busy) return;
    const gramsFromMemory = Number(memoryGrams);
    if (!Number.isFinite(gramsFromMemory) || gramsFromMemory <= 0) return;

    const item = index?.byCode.get(foodKey);
    if (!item) return;

    setBusy(true);
    try {
      const nutrients = scaleNutrients(item.nut, gramsFromMemory, 'edible', item.edible);
      await addEntry({
        date,
        meal,
        foodCode: item.code,
        name: item.name,
        grams: gramsFromMemory,
        basis: 'edible',
        portion: memoryPortion,
        nutrients,
        source: 'memory',
      });
      await rememberFood({
        foodCode: item.code,
        name: item.name,
        grams: gramsFromMemory,
        portion: memoryPortion,
      });
      onSaved(t('entry.saved'));
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!target || busy) return;
    setBusy(true);
    try {
      const refs = await deletePhotoByEntry(target.id);
      for (const ref of refs) await deletePhotoFile(ref.relPath);
      await deleteEntry(target.id);
      setPendingEntry(null);
      onSaved(t('entry.deleted'));
      onClose();
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------- 打一句话

  function runParse() {
    if (!index || !sentence.trim()) return;
    setRows(parseSentence(sentence).map((parsed) => resolveParsed(index, parsed)));
  }

  function updateRowPortion(rowIndex: number, next: Portion) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex || !row.food) return row;
        const nextGrams = portionGrams(resolvePortionCategory(row.food), next);
        return {
          ...row,
          portion: next,
          grams: nextGrams,
          nutrients: scaleNutrients(row.food.nut, nextGrams, 'edible', row.food.edible),
        };
      }),
    );
  }

  function removeRow(rowIndex: number) {
    setRows((prev) => prev.filter((_, i) => i !== rowIndex));
  }

  function backToPick() {
    setMode('pick');
    setRows([]);
    setAiNotice(null);
  }

  async function saveAll() {
    if (busy) return;
    const valid = rows.filter((row) => row.food);
    if (valid.length === 0) return;

    setBusy(true);
    try {
      // 如果是从照片来的（pending 记录），第一样食物写进这条记录，保住那张照片
      const pendingTarget = target?.pending ? target : null;
      let first = true;

      for (const row of valid) {
        const food = row.food;
        if (!food) continue;
        const nutrients = scaleNutrients(food.nut, row.grams, 'edible', food.edible);

        if (first && pendingTarget) {
          const updated: DiaryEntry = {
            ...pendingTarget,
            foodCode: food.code,
            name: food.name,
            grams: row.grams,
            basis: 'edible',
            portion: row.portion,
            nutrients,
            source: 'photo',
          };
          delete updated.pending;
          await putEntry(updated);
        } else {
          await addEntry({
            date,
            meal,
            foodCode: food.code,
            name: food.name,
            grams: row.grams,
            basis: 'edible',
            portion: row.portion,
            nutrients,
            source: pendingTarget ? 'photo' : 'text',
          });
        }

        first = false;
        await rememberFood({
          foodCode: food.code,
          name: food.name,
          grams: row.grams,
          portion: row.portion,
        });
      }

      onSaved(t('entry.savedCount', { count: valid.length }));
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return {
    t,
    index,
    recent,
    // 状态
    query,
    setQuery,
    picked,
    setPicked,
    grams,
    portion,
    meal,
    setMeal,
    basis,
    setBasis,
    busy,
    mode,
    setMode,
    sentence,
    setSentence,
    rows,
    setRows,
    recognizing,
    aiNotice,
    photoPreview,
    photoMeta,
    capturing,
    notice,
    hasKey,
    target,
    // 派生
    hits,
    previewNutrients,
    portionLabels,
    // 动作
    pick,
    applyPortion,
    changeGrams,
    takePhoto,
    removePhoto,
    runRecognition,
    save,
    quickAdd,
    remove,
    runParse,
    updateRowPortion,
    removeRow,
    backToPick,
    saveAll,
  };
}

export type EntryForm = ReturnType<typeof useEntryForm>;
