import { Button, Card, Divider, Footer, Time, Typewriter } from 'animal-island-ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import './TodayPage.css';

function greetingKey(hour: number): string {
  if (hour < 5) return 'today.greetingNight';
  if (hour < 11) return 'today.greetingMorning';
  if (hour < 14) return 'today.greetingNoon';
  if (hour < 18) return 'today.greetingAfternoon';
  if (hour < 22) return 'today.greetingEvening';
  return 'today.greetingNight';
}

export function TodayPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const greeting = useMemo(() => greetingKey(new Date().getHours()), []);

  return (
    <div className="page ac-fade-up">
      <header className="today__header">
        <Time />
      </header>

      <p className="today__greeting">
        <Typewriter>{t(greeting)}</Typewriter>
      </p>

      <Card type="dashed" className="today__empty">
        <svg
          className="today__empty-art"
          width="120"
          height="120"
          viewBox="0 0 120 120"
          fill="none"
          aria-hidden="true"
        >
          <ellipse cx="60" cy="96" rx="40" ry="7" fill="#e7ddc6" />
          <path
            d="M20 62h80a40 40 0 0 1-80 0Z"
            fill="#f7f3df"
            stroke="#794f27"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path d="M30 72h60" stroke="#c4b89e" strokeWidth="4" strokeLinecap="round" />
          <path
            d="M44 52c0-8 6-11 6-20M60 52c0-8 6-11 6-20M76 52c0-8 6-11 6-20"
            stroke="#9f927d"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="97" cy="34" r="9" fill="#f7cd67" stroke="#794f27" strokeWidth="3.5" />
        </svg>
        <p className="today__empty-text">{t('today.empty')}</p>
        <Button type="primary" size="large" onClick={() => navigate('/search')}>
          {t('today.emptyAction')}
        </Button>
      </Card>

      <Divider />

      <Button type="dashed" block size="large" onClick={() => navigate('/search')}>
        搜索成分表 ›
      </Button>

      <Footer type="tree" />
    </div>
  );
}
