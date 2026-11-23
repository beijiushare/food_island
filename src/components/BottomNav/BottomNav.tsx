import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import './BottomNav.css';
import { BowlIcon, ChartIcon, PersonIcon } from '../icons/NavIcons';

type NavKey = 'today' | 'stats' | 'me';

const ITEMS: { key: NavKey; to: string; Icon: typeof BowlIcon }[] = [
  { key: 'today', to: '/', Icon: BowlIcon },
  { key: 'stats', to: '/stats', Icon: ChartIcon },
  { key: 'me', to: '/me', Icon: PersonIcon },
];

export function BottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <nav className="bottom-nav" aria-label={t('app.name')}>
      {ITEMS.map(({ key, to, Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={key}
            to={to}
            className={`bottom-nav__item${active ? ' bottom-nav__item--active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="bottom-nav__dot" aria-hidden="true" />
            <Icon />
            <span className="bottom-nav__label">{t(`nav.${key}`)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
