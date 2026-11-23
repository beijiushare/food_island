import { Button, Card, Divider, Footer } from 'animal-island-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Toast } from '../../components/Toast/Toast';
import { listAll } from '../../data/dao/diary';
import { useTargets } from '../../features/diary/hooks';
import { exportDiaryCsv } from '../../services/export';
import './MePage.css';

export function MePage() {
  const { t } = useTranslation();
  const targets = useTargets();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
          <span className="me__value">{targets.kcal} kcal</span>
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

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
