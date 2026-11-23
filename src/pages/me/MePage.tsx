import { Button, Card, Divider, Footer, Modal } from 'animal-island-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Stepper } from '../../components/Stepper/Stepper';
import { Toast } from '../../components/Toast/Toast';
import { listAll } from '../../data/dao/diary';
import { setTargets } from '../../data/dao/settings';
import type { Targets } from '../../data/types';
import { useTargets } from '../../features/diary/hooks';
import { exportDiaryCsv } from '../../services/export';
import './MePage.css';

const TARGET_FIELDS: { key: keyof Targets; label: string; step: number; unit: string }[] = [
  { key: 'kcal', label: 'targetKcal', step: 50, unit: 'kcal' },
  { key: 'protein', label: 'targetProtein', step: 5, unit: 'g' },
  { key: 'carb', label: 'targetCarb', step: 10, unit: 'g' },
  { key: 'fat', label: 'targetFat', step: 5, unit: 'g' },
];

export function MePage() {
  const { t } = useTranslation();
  const targets = useTargets();
  const [draft, setDraft] = useState<Targets>(targets);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function openEdit() {
    setDraft(targets);
    setEditing(true);
  }

  async function saveTargets() {
    await setTargets(draft);
    setEditing(false);
    setToast(t('me.targetSaved'));
  }

  async function handleExport() {
    if (busy) return;
    setBusy(true);
    try {
      const entries = await listAll();
      if (entries.length === 0) {
        setToast(t('me.noData'));
        return;
      }
      await exportDiaryCsv(entries);
      setToast(t('me.exported', { count: entries.length }));
    } catch (error) {
      setToast(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page ac-fade-up">
      <h1 className="page__title">{t('me.title')}</h1>

      <Card className="me__card">
        <div className="me__row">
          <span className="me__label">{t('me.targetKcal')}</span>
          <span className="me__value">
            {targets.kcal} kcal
            <button type="button" className="me__edit" onClick={openEdit}>
              {t('me.edit')}
            </button>
          </span>
        </div>
        <div className="me__row">
          <span className="me__label">{t('me.macros')}</span>
          <span className="me__value">
            {targets.protein} / {targets.carb} / {targets.fat} g
          </span>
        </div>
      </Card>

      <h2 className="me__section">{t('me.data')}</h2>
      <Card className="me__card">
        <p className="me__hint">{t('me.exportHint')}</p>
        <Button type="primary" block loading={busy} onClick={handleExport}>
          {busy ? t('me.exporting') : t('me.exportCsv')}
        </Button>
      </Card>

      <Divider />
      <p className="me__about">{t('me.about')}</p>
      <Footer type="tree" />

      <Modal
        open={editing}
        title={t('me.editTargets')}
        typewriter={false}
        onClose={() => setEditing(false)}
        onOk={saveTargets}
      >
        <div className="targets">
          {TARGET_FIELDS.map((field) => (
            <div className="targets__row" key={field.key}>
              <span className="targets__label">{t(`me.${field.label}`)}</span>
              <Stepper
                value={draft[field.key]}
                min={field.key === 'kcal' ? 500 : 0}
                max={field.key === 'kcal' ? 6000 : 500}
                step={field.step}
                unit={field.unit}
                onChange={(value) => setDraft({ ...draft, [field.key]: value })}
              />
            </div>
          ))}
        </div>
      </Modal>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
