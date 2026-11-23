import { Outlet, useLocation } from 'react-router-dom';

import './Shell.css';
import { BottomNav } from '../components/BottomNav/BottomNav';
import { Fab } from '../components/Fab/Fab';

export function Shell() {
  const { pathname } = useLocation();
  const showFab = pathname === '/';

  return (
    <>
      <main className="shell__main">
        <Outlet />
      </main>
      <BottomNav />
      {showFab && <Fab onClick={() => undefined} />}
    </>
  );
}
