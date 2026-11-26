import { Button, Card, Divider, Footer, Input } from 'animal-island-ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Sheet } from '../../components/Sheet/Sheet';
import { Stepper } from '../../components/Stepper/Stepper';
import { Toast } from '../../components/Toast/Toast';
import { listAll } from '../../data/dao/diary';
import i18n, { SUPPORTED_LANGS, setLanguage } from '../../i18n';import {
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
import { testProfile } from '../../services/ai-client';
import { exportDiaryCsv } from '../../services/export';
import './MePage.css';

type TargetField = keyof Targets;

const TARGET_FIELDS = [
  { key: 'kcal' as TargetField, label: 'targetKcal', step: 50, min: 500, max: 6000, unit: 'kcal' },
  { key: 'protein' as TargetField, label: 'targetProtein', step: 5, min: 0, max: 500, unit: 'g' },
  { key: 'carb' as TargetField, label: 'targetCarb', step: 10, min: 0, max: 500, unit: 'g' },
  { key: 'fat' as TargetField, label: 'targetFat', step: 5, min: 0, max: 500, unit: 'g' },
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

  function openTargets() {
    setDraft(targets);
    setEditing(true);
  }

  async function saveTargetsDraft() {
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
        ? {
            baseUrl: ai.baseUrl.trim(),
            model: ai.model.trim(),
            extraHeader: ai.extraHeader.trim(),
            apiKey: typedKey,
          }
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

      <Card
        className="me__card me__targets"
        role="button"
        tabIndex={0}
        onClick={openTargets}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openTargets();
          }
        }}
      >
        <div className="me__row">
          <span className="me__label">{t('me.targetKcal')}</span>
          <span className="me__value">
            {targets.kcal} kcal
            <span className="me__chevron" aria-hidden="true">
              ›
            </span>
          </span>
        </div>
        <div className="me__row">
          <span className="me__label">{t('me.macros')}</span>
          <span className="me__value">
            {targets.protein} / {targets.carb} / {targets.fat} g
            <span className="me__chevron" aria-hidden="true">
              ›
            </span>
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
            {t('me.ai.apiKey')}
            {hasKey ? <span className="me__badge">{t('me.ai.keyStored')}</span> : null}
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
          <Button type="primary" className="me__action" onClick={saveAI} loading={aiBusy}>
            {t('me.ai.save')}
          </Button>
          <Button type="default" className="me__action" onClick={testConnection} loading={aiBusy}>
            {t('me.ai.test')}
          </Button>
        </div>
        {hasKey ? (
          <div className="me__actions me__actions--minor">
            <Button type="text" danger onClick={clearKey}>
              {t('me.ai.clearKey')}
            </Button>
          </div>
        ) : null}

        {aiStatus ? <p className="me__status">{aiStatus}</p> : null}
      </Card>

      <h2 className="me__section">{t('me.language')}</h2>
      <Card className="me__card">
        <div className="me__langs">
          {SUPPORTED_LANGS.map((lang) => (
            <button
              key={lang}
              type="button"
              className={`me__lang${i18n.language.startsWith(lang) ? ' me__lang--active' : ''}`}
              onClick={() => setLanguage(lang)}
            >
              {t(lang === 'zh' ? 'me.langZh' : 'me.langEn')}
            </button>
          ))}
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

      <Sheet open={editing} onClose={() => setEditing(false)} title={t('me.editTargets')}>
        <div className="targets">
          {TARGET_FIELDS.map((field) => (
            <div className="targets__row" key={field.key}>
              <span className="targets__label">{t(`me.${field.label}`)}</span>
              <Stepper
                value={draft[field.key]}
                min={field.min}
                max={field.max}
                step={field.step}
                unit={field.unit}
                onChange={(value) => setDraft({ ...draft, [field.key]: value })}
              />
            </div>
          ))}
        </div>

        <div className="me__actions me__actions--sheet">
          <Button type="text" onClick={() => setEditing(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="primary" onClick={saveTargetsDraft}>
            {t('me.ai.save')}
          </Button>
        </div>
      </Sheet>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
