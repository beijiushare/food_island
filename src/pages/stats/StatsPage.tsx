import { Card, Footer, Tabs } from 'animal-island-ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { MacroBar } from '../../components/MacroBar/MacroBar';
import { WeekBarChart, type ChartBar } from '../../components/WeekBarChart/WeekBarChart';
import { useTargets } from '../../features/diary/hooks';
import { useRangeEntries } from '../../features/stats/hooks';
import { bucketByWeek, buildSummary, type RangeSummary } from '../../features/stats/summary';
import {
  addDays,
  endOfMonthISO,
  endOfWeekISO,
  monthLabel,
  startOfMonthISO,
  startOfWeekISO,
  todayISO,
  weekRangeLabel,
  weekdayShort,
} from '../../lib/date';
import './StatsPage.css';

type Period = 'week' | 'month';

function SummaryCard({ summary }: { summary: RangeSummary }) {
  const { t } = useTranslation();

  return (
    <Card className="stats__card">
      <div className="stats__row">
        <span className="stats__label">{t('stats.average')}</span>
        <span className="stats__value stats__value--big">{summary.averageKcal} kcal</span>
      </div>
      <div className="stats__row">
        <span className="stats__label">{t('stats.recordedDays')}</span>
        <span className="stats__value">
          {summary.recordedDays} / {summary.totalDays}
        </span>
      </div>
      <div className="stats__row">
        <span className="stats__label">{t('stats.highest')}</span>
        <span className="stats__value">
          {summary.maxDay
            ? `${Math.round(summary.maxDay.kcal)} kcal（${weekdayShort(summary.maxDay.date)}）`
            : '—'}
        </span>
      </div>
    </Card>
  );
}

/** 周：每根柱子是一天；月：每根是那一周的日均 */
function buildBars(summary: RangeSummary, period: Period): ChartBar[] {
  if (period === 'week') {
    return summary.days.map((day) => ({
      label: weekdayShort(day.date),
      value: day.kcal,
      hasData: day.entries > 0,
    }));
  }

  return bucketByWeek(summary.days).map((bucket) => ({
    label: bucket.label,
    value: bucket.days > 0 ? bucket.kcal / bucket.days : 0,
    hasData: bucket.days > 0,
  }));
}

interface PeriodPanelProps {
  summary: RangeSummary;
  period: Period;
  from: string;
  canNext: boolean;
  isCurrent: boolean;
  onShift: (delta: number) => void;
  onBackToCurrent: () => void;
}

function PeriodPanel({
  summary,
  period,
  from,
  canNext,
  isCurrent,
  onShift,
  onBackToCurrent,
}: PeriodPanelProps) {
  const { t } = useTranslation();
  const targets = useTargets();

  return (
    <>
      <div className="stats__nav">
        <button
          type="button"
          className="stats__arrow"
          onClick={() => onShift(-1)}
          aria-label={period === 'week' ? t('date.prevWeek') : t('date.prevMonth')}
        >
          ‹
        </button>
        <span className="stats__range">
          {period === 'week' ? weekRangeLabel(from) : monthLabel(from)}
        </span>
        <button
          type="button"
          className="stats__arrow"
          onClick={() => onShift(1)}
          disabled={!canNext}
          aria-label={period === 'week' ? t('date.nextWeek') : t('date.nextMonth')}
        >
          ›
        </button>
      </div>

      {!isCurrent ? (
        <button type="button" className="stats__back" onClick={onBackToCurrent}>
          {t('stats.backToCurrent', { period: t(`stats.${period}`) })}
        </button>
      ) : null}

      {summary.recordedDays === 0 ? (
        <Card type="dashed" className="stats__hint">
          <p>{t('stats.empty')}</p>
        </Card>
      ) : (
        <>
          <SummaryCard summary={summary} />

          <Card className="stats__card">
            <div className="stats__card-title">{t('stats.kcalTrend')}</div>
            <WeekBarChart
              bars={buildBars(summary, period)}
              target={targets.kcal}
              caption={period === 'month' ? t('stats.monthCaption') : t('stats.weekCaption')}
            />
          </Card>

          <Card className="stats__card">
            <div className="stats__card-title">{t('stats.macroShare')}</div>
            <div className="stats__macros">
              <MacroBar
                label={t('today.protein')}
                value={summary.macroShare.protein}
                target={100}
                tone="protein"
                unit="%"
                showTarget={false}
              />
              <MacroBar
                label={t('today.carb')}
                value={summary.macroShare.carb}
                target={100}
                tone="carb"
                unit="%"
                showTarget={false}
              />
              <MacroBar
                label={t('today.fat')}
                value={summary.macroShare.fat}
                target={100}
                tone="fat"
                unit="%"
                showTarget={false}
              />
            </div>
          </Card>
        </>
      )}
    </>
  );
}

export function StatsPage() {
  const { t } = useTranslation();
  const today = todayISO();
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState(today);

  const from = period === 'week' ? startOfWeekISO(anchor) : startOfMonthISO(anchor);
  const to = period === 'week' ? endOfWeekISO(anchor) : endOfMonthISO(anchor);
  const currentFrom = period === 'week' ? startOfWeekISO(today) : startOfMonthISO(today);

  const entries = useRangeEntries(from, to);
  const summary = useMemo(() => buildSummary(entries, from, to), [entries, from, to]);

  const canNext = from < currentFrom;
  const isCurrent = from === currentFrom;

  function shift(delta: number) {
    if (delta > 0 && !canNext) return;
    setAnchor(
      period === 'week'
        ? addDays(anchor, delta * 7)
        : delta > 0
          ? addDays(to, 1)
          : addDays(from, -1),
    );
  }

  const panel = (
    <PeriodPanel
      summary={summary}
      period={period}
      from={from}
      canNext={canNext}
      isCurrent={isCurrent}
      onShift={shift}
      onBackToCurrent={() => setAnchor(today)}
    />
  );

  return (
    <div className="page ac-fade-up">
      <h1 className="page__title">{t('stats.title')}</h1>

      <Tabs
        items={[
          { key: 'week', label: t('stats.week'), children: panel },
          { key: 'month', label: t('stats.month'), children: panel },
        ]}
        activeKey={period}
        onChange={(key) => setPeriod(key === 'month' ? 'month' : 'week')}
      />

      <Footer type="sea" />
    </div>
  );
}
