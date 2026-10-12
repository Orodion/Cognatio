import { NavLink } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Users, GitFork, BarChart3, ArrowDownUp, Library, Settings, Trash2, CircleHelp, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { quitApp } from '@/lib/platform';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { useFamilyTrees, useSwitchTree } from '@/features/family-trees/lib/useFamilyTrees';
import { GET_DELETED_PERSONS } from '@/features/persons/graphql/personQueries';
import { GET_DELETED_FAMILY_TREES } from '@/features/family-trees/graphql/familyTreeQueries';

const navItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', end: true },
  { to: '/persons', icon: Users, labelKey: 'nav.persons' },
  { to: '/tree', icon: GitFork, labelKey: 'nav.tree' },
  { to: '/statistics', icon: BarChart3, labelKey: 'nav.statistics' },
  { to: '/import-export', icon: ArrowDownUp, labelKey: 'nav.importExport' },
  { to: '/family-trees', icon: Library, labelKey: 'nav.familyTrees' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
] as const;

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
  const trashCount = deletedPersons + (deletedTrees?.deletedFamilyTrees.length ?? 0);

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
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ to, icon: Icon, labelKey, ...rest }) => (
          <NavLink key={to} to={to} end={'end' in rest ? rest.end : false} className={linkClass}>
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </NavLink>
        ))}
        {/* Rarely needed and not part of any area: recycle bin and help set apart at the end */}
        <div className="mt-auto space-y-1 border-t pt-3">
          <NavLink to="/trash" className={linkClass}>
            <Trash2 className="h-4 w-4" />
            <span className="flex-1">{t('nav.trash')}</span>
            {trashCount > 0 && (
              <>
                <span aria-hidden="true" className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                  {trashCount}
                </span>
                <span className="sr-only">{t('nav.trashCount', { count: trashCount })}</span>
              </>
            )}
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
