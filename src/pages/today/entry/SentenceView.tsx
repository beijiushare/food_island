import { Button, Input } from 'animal-island-ui';

import { SegmentedPortion } from '../../../components/SegmentedPortion/SegmentedPortion';
import { Stepper } from '../../../components/Stepper/Stepper';
import { kcalOf } from '../../../features/diary/calc';
import type { EntryForm } from './useEntryForm';

/** 「打一句话」与「识别确认」共用同一套结果列表 */
export function SentenceView({ form }: { form: EntryForm }) {
  const { t, mode, rows } = form;

  return (
    <div className="sentence">
      {mode === 'sentence' ? (
        <>
          <Input
            size="large"
            allowClear
            value={form.sentence}
            placeholder={t('entry.sentencePlaceholder')}
            onChange={(e) => form.setSentence(e.target.value)}
            onClear={() => {
              form.setSentence('');
              form.setRows([]);
            }}
          />
          <p className="pick__hint">{t('entry.sentenceHint')}</p>

          <Button
            type="default"
            block
            onClick={form.runParse}
            disabled={!form.sentence.trim()}
          >
            {t('entry.parse')}
          </Button>
        </>
      ) : (
        <>
          {form.aiNotice ? <p className="photo__notice">{form.aiNotice}</p> : null}
          <p className="pick__hint">{t('entry.reviewHint')}</p>
        </>
      )}

      {rows.length > 0 ? (
        <ul className="parsed">
          {rows.map((row, i) => (
            <li className="parsed__row" key={`${row.raw}-${i}`}>
              <div className="parsed__head">
                <span className="parsed__name">{row.food ? row.food.name : row.name}</span>
                <span className="parsed__grams">{row.food ? `${Math.round(row.grams)} g` : '—'}</span>
                <button
                  type="button"
                  className="parsed__del"
                  onClick={() => form.removeRow(i)}
                  aria-label={t('entry.removeRow')}
                >
                  ×
                </button>
              </div>

              {row.food ? (
                <div className="parsed__body">
                  {row.unit === 'tbsp' ? (
                    <>
                      <span className="parsed__spoon">{row.quantity} 汤匙</span>
                      <Stepper
                        value={row.grams}
                        min={1}
                        max={200}
                        step={row.grams <= 20 ? 1 : 5}
                        onChange={(next) => form.setRowGrams(i, next)}
                      />
                    </>
                  ) : (
                    <SegmentedPortion
                      value={row.portion}
                      labels={form.portionLabels}
                      onChange={(next) => form.updateRowPortion(i, next)}
                    />
                  )}
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
        <Button type="text" onClick={form.backToPick}>
          {t('common.cancel')}
        </Button>
        <Button
          type="primary"
          onClick={form.saveAll}
          loading={form.busy}
          disabled={rows.every((row) => !row.food)}
        >
          {t('entry.saveAll')}
        </Button>
      </div>
    </div>
  );
}
