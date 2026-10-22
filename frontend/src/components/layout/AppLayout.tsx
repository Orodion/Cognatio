import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ErrorBoundary } from './ErrorBoundary';
import { useFamilyTrees } from '@/features/family-trees/lib/useFamilyTrees';
import { NoFamilyTree } from '@/features/family-trees/components/NoFamilyTree';
import { useResumeJobs } from '@/features/transfer/lib/resumeJobs';
import { useMcpActivity } from '@/features/activity/lib/mcpActivity';
import { ActivityNotice } from './ActivityNotice';

/** Pages that also work without a family tree: manage them, import one, the recycle bin, settings, help, activity */
const WITHOUT_TREE = ['/family-trees', '/import-export', '/trash', '/settings', '/help', '/activity'];

export function AppLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  // Show pages only once it is clear which family tree the app works in – otherwise they would load foreign data
  const { active, none, error } = useFamilyTrees();
  // Operations that still run on the backend after reloading the page appear under "Activity" again
  useResumeJobs();
  // Changes of AI assistants (MCP) appear under "Activity" as well
  useMcpActivity();
  return (
    // Fixed window height: only the content scrolls, pages like the family tree can fill the height exactly
    <div className="flex h-screen bg-background">
      {/* First tab stop: skip navigation and header (only appears with keyboard focus) */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t('app.skipToContent')}
      </a>
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header />
        <main id="main" tabIndex={-1} className="flex-1 overflow-auto p-6 outline-hidden">
          {/* An error of a page: navigation stays usable, another page shows again */}
          <ErrorBoundary resetKey={pathname}>
            {/* Lazily loaded pages: header and navigation stay, only the content waits */}
            <Suspense
              fallback={
                <p role="status" className="text-sm text-muted-foreground">
                  {t('common.loading')}
                </p>
              }
            >
              {active || (none && WITHOUT_TREE.includes(pathname)) ? (
                <Outlet />
              ) : none ? (
                <NoFamilyTree />
              ) : error ? (
                <p role="alert" className="text-sm text-destructive">
                  {t('familyTrees.loadError')}
                </p>
              ) : (
                <p role="status" className="text-sm text-muted-foreground">
                  {t('common.loading')}
                </p>
              )}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <ActivityNotice />
    </div>
  );
}
