import { Outlet } from 'react-router-dom';

import './Shell.css';
import { BottomNav } from '../components/BottomNav/BottomNav';
import { useAndroidBackButton } from './backButton';

export function Shell() {
  useAndroidBackButton();

  return (
    <>
      <main className="shell__main">
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}
