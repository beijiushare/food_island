import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  addDays,
  dayList,
  dayOfMonth,
  startOfWeekISO,
  todayISO,
  weekRangeLabel,
  weekdayShort,
} from '../../lib/date';
import './DateStrip.css';

interface DateStripProps {
  selected: string;
  marked: Set<string>;
  onSelect: (date: string) => void;
}

const SWIPE_THRESHOLD = 40;

export function DateStrip({ selected, marked, onSelect }: DateStripProps) {
  const { t } = useTranslation();
  const today = todayISO();
  const currentWeek = startOfWeekISO(today);

  const [viewWeek, setViewWeek] = useState(() => startOfWeekISO(selected));
  const touchStartX = useRef<number | null>(null);

  // 外部改了选中日期（比如日历跳转）→ 视图跟着走
  useEffect(() => {
    setViewWeek(startOfWeekISO(selected));
  }, [selected]);

  const dates = dayList(viewWeek, addDays(viewWeek, 6));
  const canGoNext = viewWeek < currentWeek;

  function shiftWeek(delta: number) {
    const next = addDays(viewWeek, delta * 7);
    if (delta > 0 && next > currentWeek) return;
    setViewWeek(next);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? startX) - startX;
    if (dx <= -SWIPE_THRESHOLD) shiftWeek(1); // 手指左滑 → 下一周
    else if (dx >= SWIPE_THRESHOLD) shiftWeek(-1); // 右滑 → 上一周
  }

  return (
    <div className="date-strip">
      <div className="date-strip__nav">
        <button
          type="button"
          className="date-strip__arrow"
          onClick={() => shiftWeek(-1)}
          aria-label={t('date.prevWeek')}
        >
          ‹
        </button>
        <span className="date-strip__range">{weekRangeLabel(viewWeek)}</span>
        <button
          type="button"
          className="date-strip__arrow"
          onClick={() => shiftWeek(1)}
          disabled={!canGoNext}
          aria-label={t('date.nextWeek')}
        >
          ›
        </button>
      </div>

      <div className="date-strip__row" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {dates.map((date) => {
          const active = date === selected;
          const isToday = date === today;
          return (
            <button
              key={date}
              type="button"
              className={`date-strip__item${active ? ' date-strip__item--active' : ''}${
                isToday ? ' date-strip__item--today' : ''
              }`}
              onClick={() => onSelect(date)}
              aria-pressed={active}
            >
              <span className="date-strip__week">{weekdayShort(date)}</span>
              <span className="date-strip__day">{dayOfMonth(date)}</span>
              <span
                className={`date-strip__dot${marked.has(date) ? ' date-strip__dot--on' : ''}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
