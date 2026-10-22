import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  GitFork,
  BarChart3,
  ListChecks,
  Printer,
  ArrowDownUp,
  Library,
  BookMarked,
  Settings,
  Trash2,
  CircleHelp,
  Power,
  Activity,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useActivityStore } from '@/stores/activityStore';
import { cn } from '@/lib/utils';
import { quitApp } from '@/lib/platform';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { useFamilyTrees, useSwitchTree } from '@/features/family-trees/lib/useFamilyTrees';
import { GET_DELETED_PERSONS } from '@/features/persons/graphql/personQueries';
import { GET_DELETED_FAMILY_TREES } from '@/features/family-trees/graphql/familyTreeQueries';
import { GET_DELETED_REPOSITORIES, GET_DELETED_SOURCES } from '@/features/sources/graphql/sourceQueries';
import { GET_OPEN_PLAUSIBILITY_ISSUES } from '@/features/plausibility/graphql/plausibilityQueries';
import { onDataChange } from '@/lib/dataChanges';

/** Several changes in a row (e.g. a relation with its derived ones) are counted once */
const RECOUNT_DELAY_MS = 300;

/** The areas, by what they are for: entering data, looking at it (the family tree too), managing whole family trees */
const navGroups = [
  {
    labelKey: 'record',
    items: [
      { to: '/persons', icon: Users, labelKey: 'nav.persons' },
      { to: '/sources', icon: BookMarked, labelKey: 'nav.sources' },
    ],
  },
  {
    labelKey: 'evaluate',
    items: [
      { to: '/tree', icon: GitFork, labelKey: 'nav.tree' },
      { to: '/statistics', icon: BarChart3, labelKey: 'nav.statistics' },
      { to: '/checks', icon: ListChecks, labelKey: 'nav.plausibility' },
      { to: '/reports', icon: Printer, labelKey: 'nav.reports' },
    ],
  },
  {
    labelKey: 'manage',
    items: [
      { to: '/family-trees', icon: Library, labelKey: 'nav.familyTrees' },
      { to: '/import-export', icon: ArrowDownUp, labelKey: 'nav.importExport' },
    ],
  },
] as const;

/** A number next to an entry (read out with its own text) */
function Badge({ count, label }: { count: number; label: string }) {
  return (
    <>
      <span aria-hidden="true" className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
        {count}
      </span>
      <span className="sr-only">{label}</span>
    </>
  );
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  );

export function Sidebar() {
  const { t } = useTranslation();
  const { trees, active, none } = useFamilyTrees();
  const switchTree = useSwitchTree();
  // Content of the recycle bin: deleted persons of the open family tree and deleted family trees.
  // Only queried once the family tree is known (without any: only the family trees); deleting and restoring refetch these queries.
  const { data: persons } = useQuery<{ getDeletedPersons: Array<{ id: string }> }>(GET_DELETED_PERSONS, { skip: !active });
  const { data: deletedTrees } = useQuery<{ deletedFamilyTrees: Array<{ id: string }> }>(GET_DELETED_FAMILY_TREES, { skip: !active && !none });
  const deletedPersons = active ? (persons?.getDeletedPersons.length ?? 0) : 0;
  const quit = quitApp();
  // Sources and archives in the recycle bin belong to all family trees
  const { data: deletedSources } = useQuery<{ deletedSources: Array<{ id: string }> }>(GET_DELETED_SOURCES, { skip: !active });
  const { data: deletedRepositories } = useQuery<{ deletedRepositories: Array<{ id: string }> }>(GET_DELETED_REPOSITORIES, { skip: !active });
  const trashCount =
    deletedPersons +
    (deletedTrees?.deletedFamilyTrees.length ?? 0) +
    (deletedSources?.deletedSources.length ?? 0) +
    (deletedRepositories?.deletedRepositories.length ?? 0);
  // Long operations of this session: the number of running ones, a warning for one that failed and was not seen yet
  const running = useActivityStore((state) => state.activities.filter((a) => a.state === 'running').length);
  const failedUnseen = useActivityStore((state) => state.activities.some((a) => a.state === 'failed' && !a.seen));
  // Possible errors not marked as right. Any change of data may alter them, so they are counted again after every change
  // (a dialog on the same page too), when a long operation ends, on a change of page and when the window gets the focus
  // again (an AI assistant may have changed something meanwhile)
  const { pathname } = useLocation();
  const { data: openIssues, refetch: countIssues } = useQuery<{ openPlausibilityIssues: number }>(GET_OPEN_PLAUSIBILITY_ISSUES, { skip: !active });
  useEffect(() => {
    if (!active) {
      return undefined;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const recount = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void countIssues().catch(() => undefined), RECOUNT_DELAY_MS);
    };
    recount();
    const stop = onDataChange(recount);
    window.addEventListener('focus', recount);
    return () => {
      clearTimeout(timer);
      stop();
      window.removeEventListener('focus', recount);
    };
  }, [pathname, active, running, countIssues]);
  const issueCount = active ? (openIssues?.openPlausibilityIssues ?? 0) : 0;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        {/* Logo = icon of the application (public/logo-192.png); the name is next to it */}
        <img src="/logo-192.png" alt="" className="h-11 w-11 shrink-0" />
        <p className="min-w-0 text-xl font-bold text-primary">{t('app.name')}</p>
      </div>
      {/* Active family tree: all pages show only its persons */}
      <div className="space-y-1.5 border-b px-3 py-3">
        <Label htmlFor="active-tree" className="px-1 text-xs text-muted-foreground">
          {t('familyTrees.active')}
        </Label>
        <Select id="active-tree" value={active?.id ?? ''} disabled={!active} onChange={(e) => switchTree(e.target.value)}>
          {none && <option value="">{t('familyTrees.none.option')}</option>}
          {trees.map((tree) => (
            <option key={tree.id} value={tree.id}>
              {tree.name}
            </option>
          ))}
        </Select>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <NavLink to="/" end className={linkClass}>
          <LayoutDashboard className="h-4 w-4" />
          {t('nav.dashboard')}
        </NavLink>
        {navGroups.map((group) => (
          <div key={group.labelKey} role="group" aria-labelledby={`nav-${group.labelKey}`} className="space-y-1 pt-3">
            <p id={`nav-${group.labelKey}`} className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t(`nav.groups.${group.labelKey}`)}
            </p>
            {group.items.map(({ to, icon: Icon, labelKey }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon className="h-4 w-4" />
                <span className="flex-1">{t(labelKey)}</span>
                {to === '/checks' && issueCount > 0 && <Badge count={issueCount} label={t('nav.plausibilityOpen', { count: issueCount })} />}
              </NavLink>
            ))}
          </div>
        ))}
        {/* Not part of any area: activity, recycle bin, settings and help set apart at the end */}
        <div className="mt-auto space-y-1 border-t pt-3">
          <NavLink to="/activity" className={linkClass}>
            {running > 0 ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Activity className="h-4 w-4" aria-hidden="true" />}
            <span className="flex-1">{t('nav.activity')}</span>
            {failedUnseen && (
              <>
                <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
                <span className="sr-only">{t('nav.activityFailed')}</span>
              </>
            )}
            {running > 0 && <Badge count={running} label={t('nav.activityRunning', { count: running })} />}
          </NavLink>
          <NavLink to="/trash" className={linkClass}>
            <Trash2 className="h-4 w-4" />
            <span className="flex-1">{t('nav.trash')}</span>
            {trashCount > 0 && <Badge count={trashCount} label={t('nav.trashCount', { count: trashCount })} />}
          </NavLink>
          <NavLink to="/settings" className={linkClass}>
            <Settings className="h-4 w-4" />
            {t('nav.settings')}
          </NavLink>
          <NavLink to="/help" className={linkClass}>
            <CircleHelp className="h-4 w-4" />
            {t('nav.help')}
          </NavLink>
          {/* Only in the Windows app: it has no browser tab that could be closed */}
          {quit && (
            <button type="button" onClick={() => void quit()} className={cn(linkClass({ isActive: false }), 'w-full')}>
              <Power className="h-4 w-4" />
              {t('nav.quit')}
            </button>
          )}
        </div>
      </nav>
    </aside>
  );
}
