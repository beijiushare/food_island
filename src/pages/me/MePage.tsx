import { Button, Card, Divider, Footer, Input, Modal } from 'animal-island-ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Stepper } from '../../components/Stepper/Stepper';
import { Toast } from '../../components/Toast/Toast';
import { listAll } from '../../data/dao/diary';
import {
  clearAPIKey,
  getAIProfile,
  getAISettings,
  getAPIKey,
  setAISettings,
  setAPIKey,
  setTargets,
} from '../../data/dao/settings';
import type { Targets } from '../../data/types';
import { useTargets } from '../../features/diary/hooks';
import { exportDiaryCsv } from '../../services/export';
import { testProfile } from '../../services/ai-client';
import './MePage.css';

const TARGET_FIELDS: { key: keyof Targets; label: string; step: number; unit: string }[] = [
  { key: 'kcal', label: 'targetKcal', step: 50, unit: 'kcal' },
  { key: 'protein', label: 'targetProtein', step: 5, unit: 'g' },
  { key: 'carb', label: 'targetCarb', step: 10, unit: 'g' },
  { key: 'fat', label: 'targetFat', step: 5, unit: 'g' },
];

interface AIDraft {
  baseUrl: string;
  model: string;
  extraHeader: string;
}

export function MePage() {
  const { t } = useTranslation();
  const targets = useTargets();
  const [draft, setDraft] = useState<Targets>(targets);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [ai, setAi] = useState<AIDraft>({ baseUrl: '', model: '', extraHeader: '' });
  const [keyInput, setKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const settings = await getAISettings();
      if (!alive) return;
      setAi({
        baseUrl: settings.baseUrl,
        model: settings.model,
        extraHeader: settings.extraHeader ?? '',
      });
      setHasKey((await getAPIKey()).length > 0);
    })();
    return () => {
      alive = false;
    };
  }, []);

  function openEdit() {
    setDraft(targets);
    setEditing(true);
  }

  async function saveTargets() {
    await setTargets(draft);
    setEditing(false);
    setToast(t('me.targetSaved'));
  }

  async function saveAI() {
    if (aiBusy) return;
    setAiBusy(true);
    setAiStatus(null);
    try {
      await setAISettings({
        baseUrl: ai.baseUrl.trim(),
        model: ai.model.trim(),
        extraHeader: ai.extraHeader.trim() || undefined,
      });
      if (keyInput.trim()) {
        await setAPIKey(keyInput);
        setKeyInput('');
        setHasKey(true);
      }
      setAiStatus(t('me.ai.saved'));
    } catch (error) {
      setAiStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setAiBusy(false);
    }
  }

  async function clearKey() {
    await clearAPIKey();
    setHasKey(false);
    setAiStatus(t('me.ai.keyCleared'));
  }

  async function testConnection() {
    if (aiBusy) return;
    setAiBusy(true);
    setAiStatus(t('me.ai.testing'));
    try {
      const typedKey = keyInput.trim();
      const profile = typedKey
        ? { baseUrl: ai.baseUrl.trim(), model: ai.model.trim(), extraHeader: ai.extraHeader.trim(), apiKey: typedKey }
        : await getAIProfile();
      await testProfile(profile);
      setAiStatus(t('me.ai.testOk'));
    } catch (error) {
      setAiStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setAiBusy(false);
    }
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

      <h2 className="me__section">{t('me.ai.title')}</h2>
      <Card className="me__card">
        <div className="me__field">
          <span className="me__label">{t('me.ai.baseUrl')}</span>
          <Input
            size="large"
            allowClear
            value={ai.baseUrl}
            placeholder="https://api.deepseek.com"
            onChange={(e) => setAi({ ...ai, baseUrl: e.target.value })}
          />
        </div>

        <div className="me__field">
          <span className="me__label">{t('me.ai.model')}</span>
          <Input
            size="large"
            allowClear
            value={ai.model}
            placeholder="deepseek-flash"
            onChange={(e) => setAi({ ...ai, model: e.target.value })}
          />
        </div>

        <div className="me__field">
          <span className="me__label">
            {t('me.ai.apiKey')} {hasKey ? t('me.ai.keyStored') : ''}
          </span>
          <Input
            size="large"
            allowClear
            value={keyInput}
            placeholder={hasKey ? '••••••••' : t('me.ai.keyPlaceholder')}
            onChange={(e) => setKeyInput(e.target.value)}
          />
        </div>

        <div className="me__field">
          <span className="me__label">{t('me.ai.extraHeader')}</span>
          <Input
            size="large"
            allowClear
            value={ai.extraHeader}
            placeholder="x-opencode-session: 你的会话标识"
            onChange={(e) => setAi({ ...ai, extraHeader: e.target.value })}
          />
          <p className="me__hint">{t('me.ai.extraHeaderHint')}</p>
        </div>

        <div className="me__actions">
          <Button type="primary" onClick={saveAI} loading={aiBusy}>
            {t('me.ai.save')}
          </Button>
          <Button type="default" onClick={testConnection} loading={aiBusy}>
            {t('me.ai.test')}
          </Button>
          {hasKey ? (
            <Button type="text" danger onClick={clearKey}>
              {t('me.ai.clearKey')}
            </Button>
          ) : null}
        </div>

        {aiStatus ? <p className="me__status">{aiStatus}</p> : null}
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
