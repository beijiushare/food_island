import { Button, Card, Input, Modal } from 'animal-island-ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { searchFoods, type IndexedFood, type SearchHit } from '../../data/foods';
import { useFoodIndex } from '../../data/useFoodIndex';
import './SearchPage.css';

const NUT_ROWS: { key: keyof IndexedFood['nut']; label: string; unit: string }[] = [
  { key: 'kcal', label: '热量', unit: 'kcal' },
  { key: 'protein', label: '蛋白质', unit: 'g' },
  { key: 'fat', label: '脂肪', unit: 'g' },
  { key: 'carb', label: '碳水', unit: 'g' },
  { key: 'fiber', label: '膳食纤维', unit: 'g' },
  { key: 'na', label: '钠', unit: 'mg' },
  { key: 'ca', label: '钙', unit: 'mg' },
  { key: 'fe', label: '铁', unit: 'mg' },
];

/** 分类色点只用令牌里的颜色，不写裸色值 */
function catTone(cat1: string): string {
  if (cat1.startsWith('谷') || cat1.startsWith('薯')) return 'var(--c-warning)';
  if (cat1.startsWith('蔬菜') || cat1.startsWith('菌藻')) return 'var(--c-success)';
  if (cat1.startsWith('水果')) return 'var(--c-primary)';
  if (cat1.startsWith('畜肉') || cat1.startsWith('禽肉') || cat1.startsWith('鱼虾')) {
    return 'var(--c-error)';
  }
  return 'var(--c-text-secondary)';
}

function formatNut(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function SearchRow({ hit, onPick }: { hit: SearchHit; onPick: (item: IndexedFood) => void }) {
  const { item } = hit;
  const kcal = item.nut.kcal;

  return (
    <button type="button" className="search-row" onClick={() => onPick(item)}>
      <span className="search-row__dot" style={{ background: catTone(item.cat1) }} aria-hidden="true" />
      <span className="search-row__main">
        <span className="search-row__name">{item.name}</span>
        <span className="search-row__meta">
          {item.cat2 || item.cat1}
          {item.state ? <span className="search-row__tag">{item.state}</span> : null}
          {item.edible !== null && item.edible < 100 ? (
            <span className="search-row__tag search-row__tag--warn">可食部 {item.edible}%</span>
          ) : null}
        </span>
      </span>
      <span className="search-row__kcal">
        {kcal === null ? '—' : Math.round(kcal)}
        <span className="search-row__unit"> kcal</span>
      </span>
    </button>
  );
}

export function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { index, loading, error } = useFoodIndex();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<IndexedFood | null>(null);

  const hits = useMemo(() => (index ? searchFoods(index, query) : []), [index, query]);
  const total = index?.all.length ?? 0;

  return (
    <div className="page ac-fade-up">
      <header className="search__header">
        <Button type="text" size="small" onClick={() => navigate('/')}>
          ‹ {t('common.back')}
        </Button>
      </header>

      <h1 className="page__title">{t('search.title')}</h1>

      <Input
        size="large"
        allowClear
        value={query}
        placeholder={t('search.placeholder')}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery('')}
      />

      <p className="search__hint">
        {loading
          ? t('search.loading')
          : error
            ? error.message
            : query.trim()
              ? t('search.hint', { count: hits.length })
              : `共 ${total} 条 · 试试「米饭」「mifan」「西红柿」`}
      </p>

      {query.trim() && !loading && hits.length === 0 ? (
        <Card type="dashed">
          <p className="search__empty">{t('search.empty')}</p>
        </Card>
      ) : null}

      <ul className="search__list">
        {hits.map((hit) => (
          <li key={hit.item.code}>
            <SearchRow hit={hit} onPick={setPicked} />
          </li>
        ))}
      </ul>

      <Modal
        open={picked !== null}
        typewriter={false}
        title={picked?.name ?? ''}
        onClose={() => setPicked(null)}
        footer={
          <Button type="default" onClick={() => setPicked(null)}>
            {t('common.back')}
          </Button>
        }
      >
        {picked ? (
          <div className="search-detail">
            <p className="search-detail__sub">
              {picked.cat1} · {picked.cat2} · 每 100 g 可食部
            </p>
            <dl className="search-detail__grid">
              {NUT_ROWS.map(({ key, label, unit }) => (
                <div key={key} className="search-detail__cell">
                  <dt>{label}</dt>
                  <dd>
                    {formatNut(picked.nut[key])}
                    <span className="search-detail__unit">{unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="search-detail__foot">
              可食部 {picked.edible ?? '—'}% · {picked.code}
              {picked.calc?.length ? ' · 含计算值' : ''}
              {picked.quality === 'suspect' ? ' · 原表数据存疑' : ''}
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
