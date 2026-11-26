import { Button } from 'animal-island-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { addEntry } from '../../data/dao/diary';
import { addPhotoRef } from '../../data/dao/photos';
import { getAIProfile } from '../../data/dao/settings';
import { useFoodIndex } from '../../data/useFoodIndex';
import { analyzeDish } from '../../features/ai/recognize';
import { AIError } from '../../services/ai-client';
import { emptyNutrients } from '../../features/diary/calc';
import { rowsFromDish, rowsFromSentence, useDraft } from '../../features/entry/draft';
import { capturePhoto } from '../../services/photo';
import { AddHeader } from './AddHeader';

export function AddInputPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { index } = useFoodIndex();

  const date = useDraft((state) => state.date);
  const meal = useDraft((state) => state.meal);
  const text = useDraft((state) => state.text);
  const setText = useDraft((state) => state.setText);
  const setRows = useDraft((state) => state.setRows);
  const reset = useDraft((state) => state.reset);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /** 拍照 → 立刻建档（识别在记录内部完成，失败也留得住） */
  async function takePhoto() {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const draft = await capturePhoto('prompt');
      const photoId = crypto.randomUUID();

      const entry = await addEntry({
        date,
        meal,
        foodCode: null,
        name: '',
        grams: 0,
        basis: 'edible',
        nutrients: emptyNutrients(),
        source: 'photo',
        photoId,
        status: 'recognizing',
      });

      await addPhotoRef({
        id: photoId,
        entryId: entry.id,
        relPath: draft.relPath,
        width: draft.width,
        height: draft.height,
        bytes: draft.bytes,
        createdAt: Date.now(),
      });

      await reset(false);
      navigate(`/add/entry/${entry.id}`, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/取消|没有选图|cancel/i.test(message)) {
        setNotice(t('entry.photoFailed', { message }));
      }
    } finally {
      setBusy(false);
    }
  }

  /** 只有文字时走「描述 → 拆组成」 */
  async function submitText() {
    if (!index || busy || !text.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const profile = await getAIProfile();
      if (profile.apiKey) {
        const dish = await analyzeDish(profile, { text });
        if (!dish) {
          setNotice(t('entry.recognizeEmpty'));
          return;
        }
        setRows(rowsFromDish(index, dish));
      } else {
        setRows(rowsFromSentence(index, text));
      }
      navigate('/add/review');
    } catch (error) {
      setNotice(
        error instanceof AIError ? t(`errors.${error.code}`) : error instanceof Error ? error.message : String(error),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="add__page">
      <AddHeader title={t('add.menuInput')} subtitle={t('add.photoFirstHint')} />

      <button type="button" className="add__shoot" onClick={takePhoto} disabled={busy}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="6" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="13" r="3.6" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8.5 6 10 3.8h4L15.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        <span>{t('add.shoot')}</span>
      </button>

      <p className="add__hint">{t('add.shootHint')}</p>

      <textarea
        className="add__textarea"
        rows={3}
        value={text}
        placeholder={t('add.textPlaceholder')}
        onChange={(event) => setText(event.target.value)}
      />

      {notice ? <p className="add__notice">{notice}</p> : null}

      <div className="add__footer">
        <Button
          type="primary"
          block
          loading={busy}
          disabled={!text.trim()}
          onClick={submitText}
        >
          {t('add.askAi')}
        </Button>
      </div>
    </div>
  );
}
