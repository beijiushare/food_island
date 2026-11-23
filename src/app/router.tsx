import { Navigate, Route, Routes } from 'react-router-dom';

import { SearchPage } from '../pages/search/SearchPage';
import { MePage } from '../pages/me/MePage';
import { StatsPage } from '../pages/stats/StatsPage';
import { TodayPage } from '../pages/today/TodayPage';
import { Shell } from './Shell';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<TodayPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="me" element={<MePage />} />
        <Route path="search" element={<SearchPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
