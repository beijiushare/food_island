import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Meal } from '../../data/types';
import { useDraft } from '../../features/entry/draft';
import { todayISO } from '../../lib/date';
import { AddHeader } from './AddHeader';

const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function defaultMeal(): Meal {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

const ENTRIES = [
  {
    key: 'input',
    path: 'input',
    titleKey: 'add.menuInput',
    descKey: 'add.menuInputDesc',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="13" r="3.6" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 6 10 3.8h4L15.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'search',
    path: 'search',
    titleKey: 'add.menuSearch',
    descKey: 'add.menuSearchDesc',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'recent',
    path: 'recent',
    titleKey: 'add.menuRecent',
    descKey: 'add.menuRecentDesc',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function AddMenuPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setContext = useDraft((state) => state.setContext);
  const reset = useDraft((state) => state.reset);

  const date = params.get('date') ?? todayISO();
  const mealParam = params.get('meal');
  const meal: Meal = MEALS.includes(mealParam as Meal) ? (mealParam as Meal) : defaultMeal();

  useEffect(() => {
    setContext(date, meal);
    // 从今天页进来就是一次全新记录，上一次的草稿（含照片文件）清掉
    void reset(true);
  }, [date, meal, setContext, reset]);

  const query = `?date=${date}&meal=${meal}`;

  return (
    <div className="add__page">
      <AddHeader
        title={t('add.title')}
        subtitle={t('add.context', {
          meal: t(`today.${meal}`),
          date: date.slice(5).replace('-', '月') + '日',
        })}
      />

      <div className="add__menu">
        {ENTRIES.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className="add__menu-card"
            onClick={() => navigate(`/add/${entry.path}${query}`)}
          >
            <span className="add__menu-icon">{entry.icon}</span>
            <span className="add__menu-text">
              <span className="add__menu-title">{t(entry.titleKey)}</span>
              <span className="add__menu-desc">{t(entry.descKey)}</span>
            </span>
            <span className="add__menu-arrow" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
