import { Input } from 'animal-island-ui';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useFoodIndex } from '../../data/useFoodIndex';
import { rowsFromMemory, useDraft } from '../../features/entry/draft';
import { useRankedFoods } from '../../features/memory/hooks';
import { AddHeader } from './AddHeader';

export function AddRecentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { index } = useFoodIndex();
  const memories = useRankedFoods(120);
  const setRows = useDraft((state) => state.setRows);
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return memories;
    return memories.filter((memory) => memory.name.toLowerCase().includes(keyword));
  }, [memories, query]);

  function pick(foodKey: string) {
    const memory = memories.find((item) => item.foodKey === foodKey);
    if (!memory) return;
    const rows = rowsFromMemory(memory, index);
    if (rows.length === 0) return;
    setRows(rows);
    navigate('/add/review');
  }

  return (
    <div className="add__page">
      <AddHeader title={t('add.menuRecent')} subtitle={t('add.recentHint')} />

      <div className="add__searchbar">
        <Input
          size="large"
          allowClear
          value={query}
          placeholder={t('add.recentSearch')}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
        />
      </div>

      {items.length === 0 ? (
        <p className="add__empty">
          {memories.length === 0 ? t('add.recentEmpty') : t('search.empty')}
        </p>
      ) : null}

      <ul className="add__list">
        {items.map((memory) => (
          <li key={memory.foodKey}>
            <button type="button" className="add__row" onClick={() => pick(memory.foodKey)}>
              <span className="add__row-main">
                <span className="add__row-name">{memory.name}</span>
                <span className="add__row-meta">
                  {t('add.recentMeta', {
                    count: memory.usedCount,
                    date: dayjs(memory.lastUsedAt).format('M月D日'),
                  })}
                </span>
              </span>
              <span className="add__row-kcal">
                {Math.round(memory.grams)}
                <span className="add__row-unit"> g</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
