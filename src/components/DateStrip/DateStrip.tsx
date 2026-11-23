import { useEffect, useRef } from 'react';

import { dayOfMonth, recentDays, todayISO, weekdayShort } from '../../lib/date';
import './DateStrip.css';

interface DateStripProps {
  selected: string;
  marked: Set<string>;
  onSelect: (date: string) => void;
  days?: number;
}

export function DateStrip({ selected, marked, onSelect, days = 7 }: DateStripProps) {
  const dates = recentDays(days);
  const today = todayISO();
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // 锚定今天（最右）
    el.scrollLeft = el.scrollWidth;
  }, []);

  return (
    <div className={`date-strip${days <= 7 ? ' date-strip--fit' : ''}`} ref={scrollerRef}>
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
  );
}
