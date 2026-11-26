import { Button } from 'animal-island-ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { getEntry, updateEntry } from '../../data/dao/diary';
import { getPhotoByEntry } from '../../data/dao/photos';
import { useFoodIndex } from '../../data/useFoodIndex';
import { analyzeEntry } from '../../features/entry/analyze';
import { rowsFromEntry, useDraft, type DraftPhoto } from '../../features/entry/draft';
import { photoDataUrl } from '../../services/photo';
import { AddHeader } from './AddHeader';
import { AddReviewPage } from './AddReviewPage';

/**
 * 一条已有记录：
 * - 识别中 → 自动补完（照片 → AI → 本地查表）
 * - 失败 → 显示原因 + 重试
 * - 就绪 → 结果卡
 */
export function EntryEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { index, loading } = useFoodIndex();
  const startEdit = useDraft((state) => state.startEdit);

  const entry = useLiveQuery(() => (id ? getEntry(id) : Promise.resolve(undefined)), [id]);
  const [ready, setReady] = useState(false);
  const analyzing = useRef(false);
  const loadedFor = useRef<string | null>(null);

  // 识别中的记录：进入页面就补一次
  useEffect(() => {
    if (!entry || entry.status !== 'recognizing' || analyzing.current) return;
    analyzing.current = true;
    void analyzeEntry(entry.id).finally(() => {
      analyzing.current = false;
    });
  }, [entry]);

  // 就绪后把记录读进草稿，复用结果卡
  useEffect(() => {
    if (!entry || entry.status === 'recognizing' || entry.status === 'failed') return;
    if (loading || !index || loadedFor.current === entry.id) return;
    loadedFor.current = entry.id;

    void (async () => {
      let photo: DraftPhoto | null = null;
      const ref = await getPhotoByEntry(entry.id);
      if (ref) {
        try {
          photo = {
            id: ref.id,
            relPath: ref.relPath,
            dataUrl: await photoDataUrl(ref.relPath),
            width: ref.width,
            height: ref.height,
            bytes: ref.bytes,
          };
        } catch {
          /* 文件可能已被系统清理 */
        }
      }
      startEdit(entry, rowsFromEntry(entry, index), photo);
      setReady(true);
    })();
  }, [entry, index, loading, startEdit]);

  if (!entry) return <div className="add__page" />;

  if (entry.status === 'recognizing') {
    return (
      <div className="add__page">
        <AddHeader title={t('add.recognizing')} />
        <div className="add__state">
          <span className="add__spinner" aria-hidden="true" />
          <p className="add__state-text">{t('add.recognizingHint')}</p>
        </div>
      </div>
    );
  }

  if (entry.status === 'failed') {
    return (
      <div className="add__page">
        <AddHeader title={t('add.recognizeFailed')} />
        <div className="add__state">
          <p className="add__state-text">
            {entry.errorCode ? t(`errors.${entry.errorCode}`) : entry.error || t('add.recognizeFailedHint')}
          </p>
          <p className="add__hint">{t('add.recordKept')}</p>
          <Button
            type="primary"
            block
            onClick={() => void updateEntry(entry.id, { status: 'recognizing', error: undefined })}
          >
            {t('add.retry')}
          </Button>
          <Button type="text" block onClick={() => navigate('/', { replace: true })}>
            {t('add.backHome')}
          </Button>
        </div>
      </div>
    );
  }

  if (!ready) return <div className="add__page" />;
  return <AddReviewPage />;
}
