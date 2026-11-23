import { Button, Input, Switch } from 'animal-island-ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Sheet } from '../../components/Sheet/Sheet';
import { CameraIcon, PencilIcon } from '../../components/icons/ActionIcons';
import { SegmentedPortion } from '../../components/SegmentedPortion/SegmentedPortion';
import { Stepper } from '../../components/Stepper/Stepper';
import { addEntry, deleteEntry, putEntry } from '../../data/dao/diary';
import {
  addPhotoRef,
  deletePhotoByEntry,
  getPhotoByEntry,
} from '../../data/dao/photos';
import { searchFoods, type IndexedFood } from '../../data/foods';
import type { Basis, DiaryEntry, Meal, Portion } from '../../data/types';
import { useFoodIndex } from '../../data/useFoodIndex';
import { kcalOf, scaleNutrients } from '../../features/diary/calc';import { portionGrams, resolvePortionCategory } from '../../features/diary/portion';
import { useRecentFoods } from '../../features/memory/hooks';
import { rememberFood } from '../../features/memory/memory';
import {
  parseSentence,
  resolveParsed,
  type ResolvedItem,
} from '../../features/parse/sentence';
import {
  capturePhoto,
  deletePhotoFile,
  photoDataUrl,
  type PhotoDraft,
} from '../../services/photo';
import './EntrySheet.css';

interface EntrySheetProps {
  open: boolean;
  date: string;
  defaultMeal: Meal;
  editing: DiaryEntry | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function EntrySheet({
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

  // 「打一句话」模式
  const [mode, setMode] = useState<'pick' | 'sentence'>('pick');
  const [sentence, setSentence] = useState('');
  const [rows, setRows] = useState<ResolvedItem[]>([]);

  // 照片（P5 第一步：只存图，识别还没接）
  const [photo, setPhoto] = useState<PhotoDraft | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const savedRef = useRef(false);

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
    setPhoto(null);
    setPhotoPreview(null);
    setNotice(null);
    savedRef.current = false;

    if (editing) {
      const item = editing.foodCode ? index?.byCode.get(editing.foodCode) : undefined;
      setPicked(item ?? null);
      setGrams(editing.grams);
      setPortion(editing.portion);
      setMeal(editing.meal);
      setBasis(editing.basis);

      // 编辑已有记录时把照片读回来做缩略图
      void getPhotoByEntry(editing.id).then(async (ref) => {
        if (!ref) return;
        try {
          setPhotoPreview(await photoDataUrl(ref.relPath));
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

  // ---------------------------------------------------------------- 照片

  async function takePhoto() {
    if (capturing) return;
    setCapturing(true);
    setNotice(null);
    try {
      const draft = await capturePhoto();
      setPhoto(draft);
      setPhotoPreview(await photoDataUrl(draft.relPath));
    } catch (error) {
      setNotice(t('entry.photoFailed', { message: error instanceof Error ? error.message : String(error) }));
    } finally {
      setCapturing(false);
    }
  }

  async function removePhoto() {
    if (photo) void deletePhotoFile(photo.relPath);
    setPhoto(null);
    setPhotoPreview(null);
  }

  /** 关弹窗：没保存就把刚才拍的图删掉，不留孤儿文件 */
  function closeSheet() {
    if (!savedRef.current && photo) void deletePhotoFile(photo.relPath);
    savedRef.current = false;
    onClose();
  }

  async function attachPhoto(entryId: string, existingId?: string): Promise<string | undefined> {
    if (!photo) return existingId;
    if (existingId) return existingId;
    const id = crypto.randomUUID();
    await addPhotoRef({ id, entryId, ...photo, createdAt: Date.now() });
    return id;
  }

  async function save() {
    if (!picked || busy) return;
    setBusy(true);
    try {
      const nutrients = scaleNutrients(picked.nut, grams, basis, picked.edible);
      if (editing) {
        const updated: DiaryEntry = { ...editing, meal, grams, basis, nutrients };
        if (portion) updated.portion = portion;
        else delete updated.portion;
        await putEntry(updated);

        const photoId = await attachPhoto(editing.id, editing.photoId);
        if (photoId && photoId !== editing.photoId) {
          await putEntry({ ...updated, photoId });
        }

        // 用户改过的克数就是这次「修正」，回写记忆库
        await rememberFood({ foodCode: picked.code, name: picked.name, grams, portion });
        onSaved(t('entry.updated'));
      } else {
        const photoId = photo ? crypto.randomUUID() : undefined;
        const entry = await addEntry({
          date,
          meal,
          foodCode: picked.code,
          name: picked.name,
          grams,
          basis,
          portion,
          nutrients,
          source: 'search',
          photoId,
        });
        if (photoId) {
          await addPhotoRef({ id: photoId, entryId: entry.id, ...photo!, createdAt: Date.now() });
        }
        await rememberFood({ foodCode: picked.code, name: picked.name, grams, portion });
        onSaved(t('entry.saved'));
      }
      savedRef.current = true;
      onClose();
    } finally {
      setBusy(false);
    }
  }

  /** 最近吃过：点一下直接记上，零操作（技术文档 §7.2 路径 ①） */
  async function quickAdd(foodKey: string, memoryGrams: number, memoryPortion?: Portion) {
    if (busy) return;
    const gramsFromMemory = Number(memoryGrams);
    if (!Number.isFinite(gramsFromMemory) || gramsFromMemory <= 0) return;

    const item = index?.byCode.get(foodKey);
    if (!item) return;

    setBusy(true);
    try {
      const nutrients = scaleNutrients(item.nut, gramsFromMemory, 'edible', item.edible);
      const photoId = photo ? crypto.randomUUID() : undefined;
      const entry = await addEntry({
        date,
        meal,
        foodCode: item.code,
        name: item.name,
        grams: gramsFromMemory,
        basis: 'edible',
        portion: memoryPortion,
        nutrients,
        source: 'memory',
        photoId,
      });
      if (photoId) {
        await addPhotoRef({ id: photoId, entryId: entry.id, ...photo!, createdAt: Date.now() });
      }
      await rememberFood({
        foodCode: item.code,
        name: item.name,
        grams: gramsFromMemory,
        portion: memoryPortion,
      });
      onSaved(t('entry.saved'));
      savedRef.current = true;
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing || busy) return;
    setBusy(true);
    try {
      // 先清图片引用和文件，再删记录
      const refs = await deletePhotoByEntry(editing.id);
      for (const ref of refs) await deletePhotoFile(ref.relPath);
      await deleteEntry(editing.id);
      onSaved(t('entry.deleted'));
      savedRef.current = true;
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

  function updateRowPortion(index: number, next: Portion) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index || !row.food) return row;
        const grams = portionGrams(resolvePortionCategory(row.food), next);
        return {
          ...row,
          portion: next,
          grams,
          nutrients: scaleNutrients(row.food.nut, grams, 'edible', row.food.edible),
        };
      }),
    );
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveAll() {
    if (busy) return;
    const valid = rows.filter((row) => row.food);
    if (valid.length === 0) return;

    setBusy(true);
    try {
      let first = true;
      for (const row of valid) {
        const food = row.food;
        if (!food) continue;
        const nutrients = scaleNutrients(food.nut, row.grams, 'edible', food.edible);
        const photoId = first && photo ? crypto.randomUUID() : undefined;
        const entry = await addEntry({
          date,
          meal,
          foodCode: food.code,
          name: food.name,
          grams: row.grams,
          basis: 'edible',
          portion: row.portion,
          nutrients,
          source: 'text',
          photoId,
        });
        // 一张照片只挂第一条，多条记录共用一张图反而混乱
        if (photoId && photo) {
          await addPhotoRef({ id: photoId, entryId: entry.id, ...photo, createdAt: Date.now() });
        }
        first = false;
        await rememberFood({ foodCode: food.code, name: food.name, grams: row.grams, portion: row.portion });
      }
      onSaved(t('entry.savedCount', { count: valid.length }));
      savedRef.current = true;
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const title = editing ? t('entry.editTitle') : t('entry.title');

  return (
    <Sheet open={open} onClose={closeSheet} title={title}>
      {picked ? (
        <div className="entry">
          <div className="entry__head">
            <div>
              <p className="entry__name">{editing ? editing.name : picked.name}</p>
              <p className="entry__cat">
                {picked.cat1} · {picked.cat2} · 每 100 g 可食部
              </p>
            </div>
            <span className="entry__kcal">
              {previewNutrients ? kcalOf(previewNutrients) : 0}
              <span className="entry__kcal-unit"> kcal</span>
            </span>
          </div>

          {photoPreview ? <img className="entry__photo" src={photoPreview} alt="" /> : null}

          <p className="entry__label">{t('entry.portion')}</p>          <SegmentedPortion value={portion} labels={portionLabels} onChange={applyPortion} />

          <div className="entry__stepper">
            <Stepper
              value={grams}
              onChange={(next) => {
                setGrams(next);
                setPortion(undefined);
              }}
            />
          </div>

          {picked.edible !== null && picked.edible < 100 ? (
            <div className="entry__row">
              <span className="entry__row-label">{t('entry.asPurchased')}</span>
              <Switch
                checked={basis === 'as_purchased'}
                onChange={(checked) => setBasis(checked ? 'as_purchased' : 'edible')}
              />
            </div>
          ) : null}

          <p className="entry__label">{t('entry.meal')}</p>
          <div className="entry__meals">
            {MEALS.map((key) => (
              <button
                key={key}
                type="button"
                className={`entry__meal${meal === key ? ' entry__meal--active' : ''}`}
                onClick={() => setMeal(key)}
              >
                {t(`today.${key}`)}
              </button>
            ))}
          </div>

          {previewNutrients ? (
            <p className="entry__macros">
              蛋白 {previewNutrients.protein?.toFixed(1)} g · 碳水{' '}
              {previewNutrients.carb?.toFixed(1)} g · 脂肪 {previewNutrients.fat?.toFixed(1)} g
            </p>
          ) : null}

          <div className="entry__actions">
            {editing ? (
              <Button type="text" danger onClick={remove} loading={busy}>
                {t('entry.delete')}
              </Button>
            ) : (
              <Button type="text" onClick={() => setPicked(null)}>
                {t('entry.reselect')}
              </Button>
            )}
            <Button type="primary" onClick={save} loading={busy}>
              {editing ? t('entry.update') : t('entry.save')}
            </Button>
          </div>
        </div>
      ) : mode === 'sentence' ? (
        <div className="sentence">
          <Input
            size="large"
            allowClear
            value={sentence}
            placeholder={t('entry.sentencePlaceholder')}
            onChange={(e) => setSentence(e.target.value)}
            onClear={() => {
              setSentence('');
              setRows([]);
            }}
          />
          <p className="pick__hint">{t('entry.sentenceHint')}</p>

          <Button type="default" block onClick={runParse} disabled={!sentence.trim()}>
            {t('entry.parse')}
          </Button>

          {rows.length > 0 ? (
            <ul className="parsed">
              {rows.map((row, i) => (
                <li className="parsed__row" key={`${row.raw}-${i}`}>
                  <div className="parsed__head">
                    <span className="parsed__name">
                      {row.food ? row.food.name : row.name}
                    </span>
                    <span className="parsed__grams">
                      {row.food ? `${Math.round(row.grams)} g` : '—'}
                    </span>
                    <button
                      type="button"
                      className="parsed__del"
                      onClick={() => removeRow(i)}
                      aria-label={t('entry.removeRow')}
                    >
                      ×
                    </button>
                  </div>

                  {row.food ? (
                    <div className="parsed__body">
                      <SegmentedPortion
                        value={row.portion}
                        labels={portionLabels}
                        onChange={(next) => updateRowPortion(i, next)}
                      />
                      <span className="parsed__kcal">
                        {row.nutrients ? kcalOf(row.nutrients) : 0} kcal
                      </span>
                    </div>
                  ) : (
                    <p className="parsed__miss">{t('entry.unresolvedShort')}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="entry__actions">
            <Button type="text" onClick={() => setMode('pick')}>
              {t('common.cancel')}
            </Button>
            <Button
              type="primary"
              onClick={saveAll}
              loading={busy}
              disabled={rows.every((row) => !row.food)}
            >
              {t('entry.saveAll')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="pick">
          <Button
            type="default"
            block
            loading={capturing}
            icon={<CameraIcon />}
            onClick={takePhoto}
          >
            {t('entry.photo')}
          </Button>

          {photoPreview ? (
            <div className="photo">
              <img className="photo__img" src={photoPreview} alt="" />
              <div className="photo__side">
                <span className="photo__meta">
                  {photo ? `${photo.width}×${photo.height} · ${Math.round(photo.bytes / 1024)} KB` : ''}
                </span>
                <button type="button" className="photo__remove" onClick={removePhoto}>
                  {t('entry.removePhoto')}
                </button>
              </div>
            </div>
          ) : null}

          {photoPreview ? <p className="photo__hint">{t('entry.photoNotReady')}</p> : null}
          {notice ? <p className="photo__notice">{notice}</p> : null}

          {!query.trim() && recent.length > 0 ? (
            <>
              <p className="pick__section">{t('entry.recent')}</p>
              <div className="recent">
                {recent.map((memory) => (
                  <button
                    key={memory.id}
                    type="button"
                    className="recent__chip"
                    disabled={busy}
                    onClick={() => quickAdd(memory.foodKey, memory.grams, memory.portion)}
                  >
                    <span className="recent__name">{memory.name}</span>
                    <span className="recent__grams">{Math.round(memory.grams)} g</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <Input
            size="large"
            allowClear
            autoFocus={recent.length === 0}
            value={query}
            placeholder={t('entry.searchPlaceholder')}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery('')}
          />
          <p className="pick__hint">
            {query.trim() ? t('search.hint', { count: hits.length }) : t('entry.pickHint')}
          </p>
          <ul className="pick__list">
            {hits.map((hit) => (
              <li key={hit.item.code}>
                <button type="button" className="pick__row" onClick={() => pick(hit.item)}>
                  <span className="pick__main">
                    <span className="pick__name">{hit.item.name}</span>
                    <span className="pick__meta">
                      {hit.item.cat2 || hit.item.cat1}
                      {hit.item.state ? ` · ${hit.item.state}` : ''}
                    </span>
                  </span>
                  <span className="pick__kcal">
                    {Math.round(hit.item.nut.kcal ?? 0)}
                    <span className="pick__unit">/100g</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {query.trim() && hits.length === 0 ? (
            <p className="pick__empty">{t('search.empty')}</p>
          ) : null}

          {!query.trim() ? (
            <Button type="text" block icon={<PencilIcon />} onClick={() => setMode('sentence')}>
              {t('entry.sentence')}
            </Button>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}
