import { Card, Divider, Footer, Time, Typewriter } from 'animal-island-ui';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { CalorieRing } from '../../components/CalorieRing/CalorieRing';
import { DateStrip } from '../../components/DateStrip/DateStrip';
import { Fab } from '../../components/Fab/Fab';
import { ListItem } from '../../components/ListItem/ListItem';
import { MacroBar } from '../../components/MacroBar/MacroBar';
import { MonthCalendar } from '../../components/MonthCalendar/MonthCalendar';
import { Toast } from '../../components/Toast/Toast';
import type { DiaryEntry, Meal } from '../../data/types';
import { failStaleRecognitions } from '../../data/dao/diary';
import { kcalOf, sumNutrients } from '../../features/diary/calc';
import { useDayEntries, useMarkedDates, useTargets } from '../../features/diary/hooks';
import { addDays, monthDayLabel, todayISO } from '../../lib/date';
import './TodayPage.css';

const MEAL_ORDER: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MEAL_COLOR = {
  breakfast: 'app-yellow',
  lunch: 'app-orange',
  dinner: 'app-teal',
  snack: 'purple',
} as const;

const PORTION_LABEL = {
  small: 'entry.portionSmall',
  medium: 'entry.portionMedium',
  large: 'entry.portionLarge',
} as const;

const SOURCE_LABEL: Record<DiaryEntry['source'], string> = {
  photo: 'entry.source.photo',
  memory: 'entry.source.memory',
  text: 'entry.source.text',
  search: 'entry.source.search',
  manual: 'entry.source.manual',
  recipe: 'entry.source.recipe',
};

function greetingKey(hour: number): string {
  if (hour < 5) return 'today.greetingNight';
  if (hour < 11) return 'today.greetingMorning';
  if (hour < 14) return 'today.greetingNoon';
  if (hour < 18) return 'today.greetingAfternoon';
  if (hour < 22) return 'today.greetingEvening';
  return 'today.greetingNight';
}

function defaultMeal(): Meal {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

export function TodayPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const entries = useDayEntries(date);
  const targets = useTargets();
  const marked = useMarkedDates(addDays(today, -365), today);

  const [toast, setToast] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const totals = useMemo(
    () => sumNutrients(entries.map((entry) => entry.nutrients)),
    [entries],
  );

  const byMeal = useMemo(() => {
    const groups: Record<Meal, DiaryEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const entry of entries) groups[entry.meal].push(entry);
    return groups;
  }, [entries]);

  const greeting = useMemo(() => greetingKey(new Date().getHours()), []);

  // 录入流程记完会带着一句提示回来
  useEffect(() => {
    const state = location.state as { toast?: string } | null;
    if (!state?.toast) return;
    setToast(state.toast);
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  // 上次识别中卡住的记录（App 被杀、断网）→ 标失败，允许重试
  useEffect(() => {
    void failStaleRecognitions();
  }, []);

  function openAdd(meal: Meal) {
    navigate(`/add?date=${date}&meal=${meal}`);
  }

  function openEdit(entry: DiaryEntry) {
    navigate(`/add/entry/${entry.id}`);
  }

  return (
    <div className="page ac-fade-up">
      <header className="today__header">
        <Time />
        <button
          type="button"
          className="today__date-btn"
          onClick={() => setCalendarOpen(true)}
        >
          {monthDayLabel(date)}
        </button>
      </header>

      <p className="today__greeting">
        <Typewriter>{t(greeting)}</Typewriter>
      </p>

      <Card className="today__summary">
        <CalorieRing value={kcalOf(totals)} target={targets.kcal} />
        <div className="today__macros">
          <MacroBar
            label={t('today.protein')}
            value={totals.protein ?? 0}
            target={targets.protein}
            tone="protein"
          />
          <MacroBar
            label={t('today.carb')}
            value={totals.carb ?? 0}
            target={targets.carb}
            tone="carb"
          />
          <MacroBar
            label={t('today.fat')}
            value={totals.fat ?? 0}
            target={targets.fat}
            tone="fat"
          />
        </div>
      </Card>

      <DateStrip selected={date} marked={marked} onSelect={setDate} />
      {MEAL_ORDER.map((meal) => {
        const list = byMeal[meal];
        if (list.length === 0) {
          return (
            <Card key={meal} type="dashed" className="today__add">
              <button type="button" className="today__add-btn" onClick={() => openAdd(meal)}>
                ＋ {t('today.addMeal', { meal: t(`today.${meal}`) })}
              </button>
            </Card>
          );
        }

        const mealKcal = kcalOf(sumNutrients(list.map((entry) => entry.nutrients)));

        return (
          <Card key={meal} color={MEAL_COLOR[meal]} className="today__meal">
            <div className="today__meal-head">
              <span className="today__meal-title">{t(`today.${meal}`)}</span>
              <span className="today__meal-kcal">{mealKcal} kcal</span>
            </div>
            <div className="today__meal-list">
              {list.map((entry) => {
                const status = entry.status;
                return (
                  <ListItem
                    key={entry.id}
                    name={
                      status === 'recognizing'
                        ? t('add.recognizing')
                        : status === 'failed'
                          ? t('add.recognizeFailed')
                          : entry.pending
                            ? t('entry.pendingName')
                            : entry.name
                    }
                    sub={
                      status === 'recognizing'
                        ? t('add.recognizingShort')
                        : status === 'failed'
                          ? t('add.retryShort')
                          : entry.pending
                            ? t('entry.pendingShort')
                            : entry.portion
                              ? t(PORTION_LABEL[entry.portion])
                              : t(SOURCE_LABEL[entry.source])
                    }
                    grams={entry.grams}
                    kcal={kcalOf(entry.nutrients)}
                    hideNumbers={Boolean(status) || entry.pending}
                    onClick={() => openEdit(entry)}
                  />
                );
              })}
              <button type="button" className="today__meal-add" onClick={() => openAdd(meal)}>
                ＋ {t('today.addOne')}
              </button>
            </div>
          </Card>
        );
      })}

      <Divider />
      <Footer type="tree" />

      <Fab onClick={() => openAdd(defaultMeal())} label={t('today.emptyAction')} />

      <Toast message={toast} onDone={() => setToast(null)} />

      <MonthCalendar
        open={calendarOpen}
        selected={date}
        onClose={() => setCalendarOpen(false)}
        onSelect={setDate}
      />
    </div>
  );
}
