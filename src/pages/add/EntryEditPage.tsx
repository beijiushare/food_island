import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { getEntry } from '../../data/dao/diary';
import { getPhotoByEntry } from '../../data/dao/photos';
import { useFoodIndex } from '../../data/useFoodIndex';
import { rowsFromEntry, useDraft, type DraftPhoto } from '../../features/entry/draft';
import { photoDataUrl } from '../../services/photo';
import { AddReviewPage } from './AddReviewPage';

/** 点首页已有记录：把记录读进草稿，复用同一张结果卡 */
export function EntryEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { index, loading } = useFoodIndex();
  const startEdit = useDraft((state) => state.startEdit);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!id || loading) return;
    let alive = true;

    void (async () => {
      const entry = await getEntry(id);
      if (!alive) return;
      if (!entry) {
        navigate('/', { replace: true });
        return;
      }

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
          /* 文件可能已被系统清理，忽略 */
        }
      }

      if (!alive) return;
      startEdit(entry, rowsFromEntry(entry, index ?? null), photo);
      setReady(true);
    })();

    return () => {
      alive = false;
    };
  }, [id, loading, index, startEdit, navigate]);

  if (!ready) return <div className="add__page" />;
  return <AddReviewPage />;
}
