import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PersonListPage } from '@/features/persons/pages/PersonListPage';
import { PersonDetailPage } from '@/features/persons/pages/PersonDetailPage';
import { TrashPage } from '@/features/trash/pages/TrashPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { FamilyTreesPage } from '@/features/family-trees/pages/FamilyTreesPage';
import { lazyPage } from '@/lib/lazyPage';

// Large pages (family tree with React Flow and image export, import/export, statistics) are loaded only when opened
const TreePage = lazyPage(() => import('@/features/tree/pages/TreePage').then((m) => m.TreePage));
const StatisticsPage = lazyPage(() => import('@/features/statistics/pages/StatisticsPage').then((m) => m.StatisticsPage));
const PlausibilityPage = lazyPage(() => import('@/features/plausibility/pages/PlausibilityPage').then((m) => m.PlausibilityPage));
const ImportExportPage = lazyPage(() => import('@/features/transfer/pages/ImportExportPage').then((m) => m.ImportExportPage));
// Help texts in several languages – loaded only when the help is opened
const HelpPage = lazyPage(() => import('@/features/help/pages/HelpPage').then((m) => m.HelpPage));
const ActivityPage = lazyPage(() => import('@/features/activity/pages/ActivityPage').then((m) => m.ActivityPage));
const SourcesPage = lazyPage(() => import('@/features/sources/pages/SourcesPage').then((m) => m.SourcesPage));
const ReportsPage = lazyPage(() => import('@/features/reports/pages/ReportsPage').then((m) => m.ReportsPage));
const SourceDetailPage = lazyPage(() => import('@/features/sources/pages/SourceDetailPage').then((m) => m.SourceDetailPage));

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="persons" element={<PersonListPage />} />
        <Route path="persons/:id" element={<PersonDetailPage />} />
        <Route path="tree" element={<TreePage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="sources/:id" element={<SourceDetailPage />} />
        <Route path="statistics" element={<StatisticsPage />} />
        <Route path="checks" element={<PlausibilityPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="import-export" element={<ImportExportPage />} />
        <Route path="family-trees" element={<FamilyTreesPage />} />
        <Route path="trash" element={<TrashPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="activity" element={<ActivityPage />} />
        {/* An unknown address (old link, typed by hand) leads to the overview instead of an empty page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
