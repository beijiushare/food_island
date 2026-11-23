import { Card, Divider, Footer, Time, Typewriter } from 'animal-island-ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CalorieRing } from '../../components/CalorieRing/CalorieRing';
import { DateStrip } from '../../components/DateStrip/DateStrip';
import { Fab } from '../../components/Fab/Fab';
import { ListItem } from '../../components/ListItem/ListItem';
import { MacroBar } from '../../components/MacroBar/MacroBar';
import { Toast } from '../../components/Toast/Toast';
import type { DiaryEntry, Meal } from '../../data/types';
import { kcalOf, sumNutrients } from '../../features/diary/calc';
import { useDayEntries, useMarkedDates, useTargets } from '../../features/diary/hooks';
import { addDays, monthDayLabel, todayISO } from '../../lib/date';
import { EntrySheet } from './EntrySheet';
import './TodayPage.css';

const MEAL_ORDER: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MEAL_COLOR = {
  breakfast: 'app-yellow',
  lunch: 'app-orange',
  dinner: 'app-teal',
  snack: 'purple',
} as const;

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
  const today = todayISO();
  const [date, setDate] = useState(today);
  const entries = useDayEntries(date);
  const targets = useTargets();
  const marked = useMarkedDates(addDays(today, -13), today);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMeal, setSheetMeal] = useState<Meal>(defaultMeal());
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  function openAdd(meal: Meal) {
    setEditing(null);
    setSheetMeal(meal);
    setSheetOpen(true);
  }

  function openEdit(entry: DiaryEntry) {
    setEditing(entry);
    setSheetMeal(entry.meal);
    setSheetOpen(true);
  }

  return (
    <div className="page ac-fade-up">
      <header className="today__header">
        <Time />
        <span className="today__date">
          {monthDayLabel(date)}
          {date === today ? ` · ${t('today.today')}` : ''}
        </span>
      </header>

      <p className="today__greeting">
        <Typewriter trigger={date}>{t(greeting)}</Typewriter>
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
            {list.map((entry) => (
              <ListItem
                key={entry.id}
                name={entry.name}
                sub={entry.portion ? t(`entry.${entry.portion}`) : t('entry.manual')}
                grams={entry.grams}
                kcal={kcalOf(entry.nutrients)}
                onClick={() => openEdit(entry)}
              />
            ))}
          </Card>
        );
      })}

      <Divider />
      <Footer type="tree" />

      <Fab onClick={() => openAdd(defaultMeal())} label={t('today.emptyAction')} />

      <Toast message={toast} onDone={() => setToast(null)} />

      <EntrySheet
        open={sheetOpen}
        date={date}
        defaultMeal={sheetMeal}
        editing={editing}
        onClose={() => setSheetOpen(false)}
        onSaved={setToast}
      />
    </div>
  );
}
