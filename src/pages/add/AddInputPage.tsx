import { Button } from 'animal-island-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { getAIProfile } from '../../data/dao/settings';
import { useFoodIndex } from '../../data/useFoodIndex';
import {
  mockRecognition,
  recognizePhotos,
  recognizeText,
} from '../../features/ai/recognize';
import {
  rowsFromRecognized,
  rowsFromSentence,
  useDraft,
} from '../../features/entry/draft';
import { capturePhoto, photoDataUrl } from '../../services/photo';
import { AddHeader } from './AddHeader';

const MAX_PHOTOS = 4;

export function AddInputPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { index } = useFoodIndex();

  const photos = useDraft((state) => state.photos);
  const text = useDraft((state) => state.text);
  const addPhoto = useDraft((state) => state.addPhoto);
  const removePhoto = useDraft((state) => state.removePhoto);
  const setText = useDraft((state) => state.setText);
  const setRows = useDraft((state) => state.setRows);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function takePhoto() {
    if (busy || photos.length >= MAX_PHOTOS) return;
    setBusy(true);
    setNotice(null);
    try {
      const draft = await capturePhoto('prompt');
      const dataUrl = await photoDataUrl(draft.relPath);
      addPhoto({ id: crypto.randomUUID(), ...draft, dataUrl });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // 用户主动取消不算错误
      if (!/取消|没有选图|cancel/i.test(message)) {
        setNotice(t('entry.photoFailed', { message }));
      }
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!index || busy) return;
    if (photos.length === 0 && !text.trim()) return;

    setBusy(true);
    setNotice(null);
    try {
      const profile = await getAIProfile();
      let rows;

      if (profile.apiKey) {
        const items = photos.length
          ? await recognizePhotos(
              profile,
              photos.map((photo) => photo.dataUrl),
              text,
            )
          : await recognizeText(profile, text);
        rows = rowsFromRecognized(index, items);
      } else {
        setNotice(t('entry.noKey'));
        rows = photos.length
          ? rowsFromRecognized(index, mockRecognition())
          : rowsFromSentence(index, text);
      }

      if (rows.length === 0) {
        setNotice(t('entry.recognizeEmpty'));
        return;
      }
      setRows(rows);
      navigate('/add/review');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = photos.length > 0 || text.trim().length > 0;

  return (
    <div className="add__page">
      <AddHeader title={t('add.menuInput')} subtitle={t('add.inputHint')} />

      <div className="add__photos">
        {photos.map((photo) => (
          <div className="add__photo" key={photo.id}>
            <img className="add__photo-img" src={photo.dataUrl} alt="" />
            <button
              type="button"
              className="add__photo-del"
              aria-label={t('entry.removePhoto')}
              onClick={() => void removePhoto(photo.id)}
            >
              ×
            </button>
          </div>
        ))}

        {photos.length < MAX_PHOTOS ? (
          <button type="button" className="add__photo-add" onClick={takePhoto} disabled={busy}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>{t('add.addPhoto')}</span>
          </button>
        ) : null}
      </div>

      <p className="add__hint">
        {photos.length > 0
          ? t('add.photoCount', { count: photos.length, max: MAX_PHOTOS })
          : t('add.photoTip')}
      </p>

      <textarea
        className="add__textarea"
        rows={3}
        value={text}
        placeholder={t('add.textPlaceholder')}
        onChange={(event) => setText(event.target.value)}
      />

      {notice ? <p className="add__notice">{notice}</p> : null}

      <div className="add__footer">
        <Button type="primary" block loading={busy} disabled={!canSubmit} onClick={submit}>
          {t('add.askAi')}
        </Button>
      </div>
    </div>
  );
}
