import { Input } from 'animal-island-ui';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { dishPer100, loadDishes, searchDishes, type DishItem } from '../../data/dishes';
import { searchFoods } from '../../data/foods';
import { useFoodIndex } from '../../data/useFoodIndex';
import { rowsFromRecipe, rowsFromSearch, useDraft } from '../../features/entry/draft';
import { AddHeader } from './AddHeader';

type Tab = 'dish' | 'food';

export function AddSearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { index, loading, error } = useFoodIndex();
  const setRows = useDraft((state) => state.setRows);
  const [query, setQuery] = useState('');
  const [dishes, setDishes] = useState<DishItem[]>([]);
  const [tab, setTab] = useState<Tab>('food');

  useEffect(() => {
    let alive = true;
    void loadDishes().then((list) => {
      if (alive) setDishes(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const hits = useMemo(() => (index && query.trim() ? searchFoods(index, query, 30) : []), [index, query]);
  const dishHits = useMemo(() => searchDishes(dishes, query), [dishes, query]);
  const hasQuery = query.trim().length > 0;

  function pick(code: string) {
    const item = index?.byCode.get(code);
    if (!item) return;
    setRows(rowsFromSearch(item, 'search'));
    navigate('/add/review');
  }

  function pickDish(dish: DishItem) {
    if (!index) return;
    setRows(rowsFromRecipe(index, dish));
    navigate('/add/review');
  }

  const otherCount = tab === 'food' ? dishHits.length : hits.length;

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

      {hasQuery ? (
        <div className="add__tabs">
          <button
            type="button"
            className={`add__tab${tab === 'dish' ? ' add__tab--active' : ''}`}
            onClick={() => setTab('dish')}
          >
            {t('add.dishSection')}
            <span className="add__tab-count">{dishHits.length}</span>
          </button>
          <button
            type="button"
            className={`add__tab${tab === 'food' ? ' add__tab--active' : ''}`}
            onClick={() => setTab('food')}
          >
            {t('add.tabFood')}
            <span className="add__tab-count">{hits.length}</span>
          </button>
        </div>
      ) : (
        <p className="add__hint">{t('add.searchTip')}</p>
      )}

      {hasQuery && tab === 'dish' ? (
        dishHits.length > 0 ? (
          <ul className="add__list">
            {dishHits.map((dish) => (
              <li key={dish.id}>
                <button type="button" className="add__row" onClick={() => pickDish(dish)}>
                  <span className="add__row-main">
                    <span className="add__row-name">
                      {dish.name}
                      <span className="add__badge">{t('add.dishBadge')}</span>
                    </span>
                    <span className="add__row-meta">
                      {dish.category} · {t('add.dishMeta', { kcal: Math.round(dishPer100(dish).kcal) })}
                    </span>
                  </span>
                  <span className="add__row-kcal">
                    {t('add.dishPortion', { grams: dish.servingGrams })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="add__empty">
            {t('add.tabEmpty', { count: otherCount })}
          </p>
        )
      ) : null}

      {hasQuery && tab === 'food' ? (
        hits.length > 0 ? (
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
        ) : (
          <p className="add__empty">{t('search.empty')}</p>
        )
      ) : null}
    </div>
  );
}
