import { Outlet, useLocation } from 'react-router-dom';

import './Shell.css';
import { BottomNav } from '../components/BottomNav/BottomNav';

export function Shell() {
  const { pathname } = useLocation();

  return (
    <>
      <main className="shell__main" data-route={pathname}>
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}
