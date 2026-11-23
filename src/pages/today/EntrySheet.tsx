import { Button, Input, Switch } from 'animal-island-ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Sheet } from '../../components/Sheet/Sheet';
import { SegmentedPortion } from '../../components/SegmentedPortion/SegmentedPortion';
import { Stepper } from '../../components/Stepper/Stepper';
import { addEntry, deleteEntry, putEntry } from '../../data/dao/diary';
import { searchFoods, type IndexedFood } from '../../data/foods';
import type { Basis, DiaryEntry, Meal, Portion } from '../../data/types';
import { useFoodIndex } from '../../data/useFoodIndex';
import { kcalOf, scaleNutrients } from '../../features/diary/calc';
import { portionGrams, resolvePortionCategory } from '../../features/diary/portion';
import { useRecentFoods } from '../../features/memory/hooks';
import { rememberFood } from '../../features/memory/memory';
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

    if (editing) {
      const item = editing.foodCode ? index?.byCode.get(editing.foodCode) : undefined;
      setPicked(item ?? null);
      setGrams(editing.grams);
      setPortion(editing.portion);
      setMeal(editing.meal);
      setBasis(editing.basis);
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
        // 用户改过的克数就是这次「修正」，回写记忆库
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
    if (!editing || busy) return;
    setBusy(true);
    try {
      await deleteEntry(editing.id);
      onSaved(t('entry.deleted'));
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const title = editing ? t('entry.editTitle') : t('entry.title');

  return (
    <Sheet open={open} onClose={onClose} title={title}>
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

          <p className="entry__label">{t('entry.portion')}</p>
          <SegmentedPortion value={portion} labels={portionLabels} onChange={applyPortion} />

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
      ) : (
        <div className="pick">
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
        </div>
      )}
    </Sheet>
  );
}
