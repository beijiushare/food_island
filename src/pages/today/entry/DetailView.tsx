import { Button, Switch } from 'animal-island-ui';

import { SegmentedPortion } from '../../../components/SegmentedPortion/SegmentedPortion';
import { Stepper } from '../../../components/Stepper/Stepper';
import { kcalOf } from '../../../features/diary/calc';
import type { Meal } from '../../../data/types';
import type { EntryForm } from './useEntryForm';

const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function DetailView({ form }: { form: EntryForm }) {
  const { t, picked, target, previewNutrients, photoPreview } = form;
  if (!picked) return null;

  return (
    <div className="entry">
      <div className="entry__head">
        <div>
          <p className="entry__name">{target?.name || picked.name}</p>
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

      <p className="entry__label">{t('entry.portion')}</p>
      <SegmentedPortion
        value={form.portion}
        labels={form.portionLabels}
        onChange={form.applyPortion}
      />

      <div className="entry__stepper">
        <Stepper value={form.grams} onChange={form.changeGrams} />
      </div>

      {picked.edible !== null && picked.edible < 100 ? (
        <div className="entry__row">
          <span className="entry__row-label">{t('entry.asPurchased')}</span>
          <Switch
            checked={form.basis === 'as_purchased'}
            onChange={(checked) => form.setBasis(checked ? 'as_purchased' : 'edible')}
          />
        </div>
      ) : null}

      <p className="entry__label">{t('entry.meal')}</p>
      <div className="entry__meals">
        {MEALS.map((key) => (
          <button
            key={key}
            type="button"
            className={`entry__meal${form.meal === key ? ' entry__meal--active' : ''}`}
            onClick={() => form.setMeal(key)}
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
        {target ? (
          <Button type="default" danger onClick={form.remove} loading={form.busy}>
            {t('entry.delete')}
          </Button>
        ) : (
          <Button type="text" onClick={() => form.setPicked(null)}>
            {t('entry.reselect')}
          </Button>
        )}
        <Button type="primary" onClick={form.save} loading={form.busy}>
          {target ? t('entry.update') : t('entry.save')}
        </Button>
      </div>
    </div>
  );
}
