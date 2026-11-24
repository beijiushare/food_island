import { Navigate, Route, Routes } from 'react-router-dom';

import { AddInputPage } from '../pages/add/AddInputPage';
import { AddLayout } from '../pages/add/AddLayout';
import { AddMenuPage } from '../pages/add/AddMenuPage';
import { AddRecentPage } from '../pages/add/AddRecentPage';
import { AddReviewPage } from '../pages/add/AddReviewPage';
import { AddSearchPage } from '../pages/add/AddSearchPage';
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
      </Route>

      {/* 录入流程：独立页面，没有底部导航 */}
      <Route path="add" element={<AddLayout />}>
        <Route index element={<AddMenuPage />} />
        <Route path="input" element={<AddInputPage />} />
        <Route path="search" element={<AddSearchPage />} />
        <Route path="recent" element={<AddRecentPage />} />
        <Route path="review" element={<AddReviewPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
