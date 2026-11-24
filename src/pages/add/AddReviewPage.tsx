import { Button } from 'animal-island-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Stepper } from '../../components/Stepper/Stepper';
import { SegmentedPortion } from '../../components/SegmentedPortion/SegmentedPortion';
import { addEntry } from '../../data/dao/diary';
import { addPhotoRef } from '../../data/dao/photos';
import type { EntryComponent, Meal, Portion } from '../../data/types';
import { kcalOf } from '../../features/diary/calc';
import { useDraft, type DraftRow } from '../../features/entry/draft';
import { rememberFood } from '../../features/memory/memory';
import { deletePhotoFile } from '../../services/photo';
import { todayISO } from '../../lib/date';
import { AddHeader } from './AddHeader';

const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function AddReviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const date = useDraft((state) => state.date);
  const meal = useDraft((state) => state.meal);
  const rows = useDraft((state) => state.rows);
  const photos = useDraft((state) => state.photos);
  const setRowName = useDraft((state) => state.setRowName);
  const setRowGrams = useDraft((state) => state.setRowGrams);
  const setRowPortion = useDraft((state) => state.setRowPortion);
  const setComponentGrams = useDraft((state) => state.setComponentGrams);
  const removeRow = useDraft((state) => state.removeRow);
  const setRowNutrients = useDraft((state) => state.setRowNutrients);
  const resetRowNutrients = useDraft((state) => state.resetRowNutrients);
  const setContext = useDraft((state) => state.setContext);
  const reset = useDraft((state) => state.reset);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const portionLabels: Record<Portion, string> = {
    small: t('entry.small'),
    medium: t('entry.medium'),
    large: t('entry.large'),
  };

  const totalKcal = rows.reduce((sum, row) => sum + kcalOf(row.nutrients), 0);

  async function save() {
    if (busy) return;
    if (rows.length === 0) return;

    const invalid = rows.find((row) => row.grams <= 0);
    if (invalid) {
      setNotice(t('add.needGrams', { name: invalid.name }));
      return;
    }
    const noKcal = rows.find((row) => row.unresolved && kcalOf(row.nutrients) <= 0);
    if (noKcal) {
      setNotice(t('add.needKcal', { name: noKcal.name }));
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const firstPhoto = photos[0];

      for (const [index, row] of rows.entries()) {
        const components: EntryComponent[] | undefined = row.components?.map((component) => ({
          name: component.name,
          grams: component.grams,
          foodCode: component.foodCode,
          nutrients: component.nutrients,
        }));

        const entry = await addEntry({
          date,
          meal,
          foodCode: row.foodCode,
          name: row.name,
          grams: Math.round(row.grams),
          basis: row.basis,
          portion: row.portion,
          nutrients: row.nutrients,
          components,
          nutrientsManual: row.nutrientsManual,
          source: row.source,
          photoId: index === 0 && firstPhoto ? firstPhoto.id : undefined,
        });

        if (index === 0 && firstPhoto) {
          await addPhotoRef({
            id: firstPhoto.id,
            entryId: entry.id,
            relPath: firstPhoto.relPath,
            width: firstPhoto.width,
            height: firstPhoto.height,
            bytes: firstPhoto.bytes,
            createdAt: Date.now(),
          });
        }

        await rememberFood({
          foodCode: row.foodCode,
          name: row.name,
          grams: row.grams,
          portion: row.portion,
        });
      }

      // 多出来的照片只用于识别，记完就真删，不留尸体
      for (const photo of photos.slice(1)) {
        await deletePhotoFile(photo.relPath);
      }

      await reset(false);
      navigate('/', { replace: true, state: { toast: t('entry.savedCount', { count: rows.length }) } });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  function renderComponents(row: DraftRow) {
    if (!row.components?.length) return null;
    if (!expanded[row.id]) return null;
    return (
      <ul className="rv__parts">
        {row.components.map((component, index) => (
          <li className="rv__part" key={`${component.name}-${index}`}>
            <span className="rv__part-name">{component.name}</span>
            <Stepper
              value={component.grams}
              min={1}
              max={2000}
              step={component.grams <= 30 ? 1 : 10}
              onChange={(next) => setComponentGrams(row.id, index, next)}
            />
            <span className="rv__part-kcal">{kcalOf(component.nutrients)} kcal</span>
          </li>
        ))}
      </ul>
    );
  }

  function renderRow(row: DraftRow) {
    const canEditNutrition = row.unresolved || editing[row.id];

    return (
      <li className="rv__row" key={row.id}>
        <div className="rv__head">
          <input
            className="rv__name"
            value={row.name}
            onChange={(event) => setRowName(row.id, event.target.value)}
            aria-label={t('add.rowName')}
          />
          <span className="rv__kcal">{kcalOf(row.nutrients)} kcal</span>
          <button
            type="button"
            className="rv__del"
            aria-label={t('add.removeRow')}
            onClick={() => removeRow(row.id)}
          >
            ×
          </button>
        </div>

        {row.components?.length ? (
          <button
            type="button"
            className="rv__toggle"
            onClick={() => setExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
          >
            {t('add.parts', { count: row.components.length })}
            <span className="rv__toggle-mark" aria-hidden="true">
              {expanded[row.id] ? '▴' : '▾'}
            </span>
          </button>
        ) : null}

        {renderComponents(row)}

        {!row.components?.length && row.category ? (
          <SegmentedPortion
            value={row.portion}
            labels={portionLabels}
            onChange={(next) => setRowPortion(row.id, next)}
          />
        ) : null}

        <div className="rv__grams">
          <Stepper
            value={Math.round(row.grams)}
            min={1}
            max={3000}
            step={row.grams <= 50 ? 5 : 10}
            onChange={(next) => setRowGrams(row.id, next)}
          />
          {row.unresolved ? (
            <span className="rv__warn">{t('add.unresolved')}</span>
          ) : (
            <button
              type="button"
              className="rv__nutrition-toggle"
              onClick={() => setEditing((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
            >
              {t('add.editNutrition')}
            </button>
          )}
        </div>

        {canEditNutrition ? (
          <div className="rv__nutrition">
            {(
              [
                ['kcal', t('add.kcal'), 'kcal'],
                ['protein', t('add.protein'), 'g'],
                ['carb', t('add.carb'), 'g'],
                ['fat', t('add.fat'), 'g'],
              ] as const
            ).map(([key, label, unit]) => (
              <label className="rv__field" key={key}>
                <span className="rv__field-label">{label}</span>
                <input
                  className="rv__field-input"
                  type="number"
                  inputMode="decimal"
                  value={row.nutrients[key] ?? 0}
                  onChange={(event) =>
                    setRowNutrients(row.id, { [key]: Number(event.target.value) || 0 })
                  }
                />
                <span className="rv__field-unit">{unit}</span>
              </label>
            ))}
            {row.nutrientsManual ? (
              <button
                type="button"
                className="rv__restore"
                onClick={() => resetRowNutrients(row.id)}
              >
                {t('add.restoreNutrition')}
              </button>
            ) : null}
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <div className="add__page">
      <AddHeader
        title={t('entry.editTitle')}
        subtitle={t('add.reviewHint', { count: rows.length, kcal: totalKcal })}
      />

      <ul className="rv__list">{rows.map(renderRow)}</ul>

      <div className="rv__meta">
        <label className="rv__date">
          <span>{t('add.date')}</span>
          <input
            type="date"
            value={date || todayISO()}
            max={todayISO()}
            onChange={(event) => setContext(event.target.value, meal)}
          />
        </label>

        <div className="rv__meals">
          {MEALS.map((key) => (
            <button
              key={key}
              type="button"
              className={`rv__meal${meal === key ? ' rv__meal--active' : ''}`}
              onClick={() => setContext(date, key)}
            >
              {t(`today.${key}`)}
            </button>
          ))}
        </div>

        {photos.length > 0 ? (
          <p className="rv__photo-note">{t('add.photoNote', { count: photos.length })}</p>
        ) : null}
      </div>

      {notice ? <p className="add__notice">{notice}</p> : null}

      <div className="add__footer">
        <Button type="primary" block loading={busy} disabled={rows.length === 0} onClick={save}>
          {t('add.saveAll', { count: rows.length })}
        </Button>
      </div>
    </div>
  );
}
