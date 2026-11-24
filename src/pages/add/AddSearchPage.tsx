import { Input } from 'animal-island-ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { searchFoods } from '../../data/foods';
import { useFoodIndex } from '../../data/useFoodIndex';
import { rowsFromSearch, useDraft } from '../../features/entry/draft';
import { AddHeader } from './AddHeader';

export function AddSearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { index, loading, error } = useFoodIndex();
  const setRows = useDraft((state) => state.setRows);
  const [query, setQuery] = useState('');

  const hits = useMemo(() => (index && query.trim() ? searchFoods(index, query, 30) : []), [index, query]);

  function pick(code: string) {
    const item = index?.byCode.get(code);
    if (!item) return;
    setRows(rowsFromSearch(item, 'search'));
    navigate('/add/review');
  }

  return (
    <div className="add__page">
      <AddHeader title={t('add.menuSearch')} subtitle={t('add.searchHint')} />

      <div className="add__searchbar">
        <Input
          size="large"
          allowClear
          autoFocus
          value={query}
          placeholder={t('add.searchPlaceholder')}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
        />
      </div>

      {loading ? <p className="add__hint">{t('add.loading')}</p> : null}
      {error ? <p className="add__hint add__hint--error">{error.message}</p> : null}

      {query.trim() ? (
        <p className="add__hint">{t('search.hint', { count: hits.length })}</p>
      ) : (
        <p className="add__hint">{t('add.searchTip')}</p>
      )}

      <ul className="add__list">
        {hits.map((hit) => (
          <li key={hit.item.code}>
            <button type="button" className="add__row" onClick={() => pick(hit.item.code)}>
              <span className="add__row-main">
                <span className="add__row-name">{hit.item.name}</span>
                <span className="add__row-meta">
                  {hit.item.cat2 || hit.item.cat1}
                  {hit.item.state ? ` · ${hit.item.state}` : ''}
                  {hit.item.edible !== null && hit.item.edible < 100
                    ? ` · 可食部 ${hit.item.edible}%`
                    : ''}
                </span>
              </span>
              <span className="add__row-kcal">
                {hit.item.nut.kcal === null ? '—' : Math.round(hit.item.nut.kcal)}
                <span className="add__row-unit">/100g</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {query.trim() && !loading && hits.length === 0 ? (
        <p className="add__empty">{t('search.empty')}</p>
      ) : null}
    </div>
  );
}
