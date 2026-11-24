import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMarkedDates } from '../../features/diary/hooks';
import {
  addDays,
  dayList,
  endOfMonthISO,
  monthLabel,
  startOfMonthISO,
  todayISO,
  weekdayHeaders,
} from '../../lib/date';
import { Sheet } from '../Sheet/Sheet';
import './MonthCalendar.css';

interface MonthCalendarProps {
  open: boolean;
  selected: string;
  onClose: () => void;
  onSelect: (date: string) => void;
}

/** YYYY-MM → 该月 1 号 */
function monthKey(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function MonthCalendar({ open, selected, onClose, onSelect }: MonthCalendarProps) {
  const { t } = useTranslation();
  const today = todayISO();
  const [month, setMonth] = useState(() => monthKey(selected));

  // 每次打开都回到当前选中月
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setLastOpen(true);
    setMonth(monthKey(selected));
  } else if (!open && lastOpen) {
    setLastOpen(false);
  }

  const from = startOfMonthISO(month);
  const to = endOfMonthISO(month);
  const marked = useMarkedDates(from, to);
  const headers = useMemo(() => weekdayHeaders(), []);

  const days = dayList(from, to);
  const leading = (new Date(from).getDay() + 6) % 7; // 周一为 0
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...days,
  ];

  const canNext = month < monthKey(today);

  return (
    <Sheet open={open} onClose={onClose} title={t('date.pick')}>
      <div className="cal">
        <div className="cal__nav">
          <button
            type="button"
            className="cal__arrow"
            onClick={() => setMonth(addDays(month, -1))}
            aria-label={t('date.prevMonth')}
          >
            ‹
          </button>
          <span className="cal__month">{monthLabel(month)}</span>
          <button
            type="button"
            className="cal__arrow"
            onClick={() => setMonth(startOfMonthISO(addDays(to, 1)))}
            disabled={!canNext}
            aria-label={t('date.nextMonth')}
          >
            ›
          </button>
        </div>

        <div className="cal__grid cal__grid--head">
          {headers.map((h) => (
            <span key={h} className="cal__head">
              {h}
            </span>
          ))}
        </div>

        <div className="cal__grid">
          {cells.map((date, index) => {
            if (!date) return <span key={`blank-${index}`} />;
            const isSelected = date === selected;
            const isToday = date === today;
            return (
              <button
                key={date}
                type="button"
                className={`cal__day${isSelected ? ' cal__day--selected' : ''}${
                  isToday ? ' cal__day--today' : ''
                }`}
                onClick={() => {
                  onSelect(date);
                  onClose();
                }}
              >
                {Number(date.slice(8))}
                {marked.has(date) ? <span className="cal__dot" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
