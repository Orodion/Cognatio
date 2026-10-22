import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { ReactFlowProvider } from '@xyflow/react';
import { FamilyTree } from '@/features/tree/components/FamilyTree';
import { TreeExportButtons } from '@/features/tree/components/TreeExportButtons';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { GET_TREE_DATA } from '@/features/tree/graphql/treeQueries';
import type { Person } from '@/features/persons/types/person';
import { comparePersonNames, formatPersonName, formatPersonOption } from '@/features/persons/lib/personUtils';
import {
  DEPTH_OPTIONS,
  TREE_VIEWS,
  buildFamilyIndex,
  needsFocus,
  selectPersons,
  type Depth,
  type TreeRelation,
  type TreeView,
} from '@/features/tree/lib/treeUtils';
import { focusIdOf, useSettingsStore } from '@/stores/settingsStore';
import { useHomePerson } from '@/features/family-trees/lib/useFamilyTrees';
import { useAppearanceStore } from '@/stores/appearanceStore';
import { genderColor } from '@/lib/appearance';
import { useActiveTreeStore } from '@/stores/activeTreeStore';

// View and generations are part of the URL so views can be linked and reloaded (?view=ancestors&generations=2)
const ALL_DEPTHS = 'all';
/**
 * From this number of persons on the graph is no longer drawn automatically (layout and rendering
 * take many seconds with several thousand nodes) – instead a hint about focus person/generations.
 */
export const TREE_NODE_LIMIT = 400;

/** View from the URL; if missing, the default view from the settings applies */
function parseView(value: string | null, fallback: TreeView): TreeView {
  return TREE_VIEWS.find((v) => v === value) ?? fallback;
}

/** Depth from the URL ("all" explicitly); if missing, the default depth from the settings applies */
function parseDepth(value: string | null, fallback: Depth): Depth {
  if (value === null) {
    return fallback;
  }
  const n = Number(value);
  return (DEPTH_OPTIONS as readonly number[]).includes(n) ? n : null;
}

export function TreePage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const treeRef = useRef<HTMLDivElement>(null);
  const defaults = useSettingsStore();
  const appearance = useAppearanceStore();
  const activeTreeId = useActiveTreeStore((s) => s.treeId) ?? '';
  const view = parseView(searchParams.get('view'), defaults.treeView);
  const depth = parseDepth(searchParams.get('generations'), defaults.treeDepth);

  const { data, loading, error } = useQuery<{ getPersons: Person[]; getRelations: TreeRelation[] }>(GET_TREE_DATA, {
    // The family tree must show new persons/relations from other views
    fetchPolicy: 'cache-and-network',
  });

  const persons = useMemo(() => [...(data?.getPersons ?? [])].sort(comparePersonNames), [data]);
  const relations = useMemo(() => data?.getRelations ?? [], [data]);
  // The person of the address, else the focus person chosen last in this family tree (also "none"), else the home person
  const { homePerson } = useHomePerson();
  const storedFocus = activeTreeId in defaults.treeFocusIds ? focusIdOf(defaults.treeFocusIds, activeTreeId) : (homePerson?.id ?? null);
  const requestedFocus = searchParams.get('person') ?? storedFocus;
  const focusPerson = persons.find((p) => p.id === requestedFocus) ?? null;
  const focusId = focusPerson?.id ?? null;

  // Selection by view, focus person and depth
  const visibleIds = useMemo(() => {
    const allIds = new Set(persons.map((p) => p.id));
    return selectPersons(view, focusId, depth, buildFamilyIndex(relations, allIds), allIds);
  }, [persons, relations, view, focusId, depth]);

  // setSearchParams has no queue: two quick changes would both build on the old state
  // and overwrite each other. So build on the change that has not been applied yet.
  const pendingParams = useRef<URLSearchParams | null>(null);
  useEffect(() => {
    pendingParams.current = null;
  }, [searchParams]);
  const updateParams = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(pendingParams.current ?? searchParams);
      for (const [key, value] of Object.entries(changes)) {
        if (value === null) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      pendingParams.current = next;
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );
  const updateParam = useCallback((key: string, value: string | null) => updateParams({ [key]: value }), [updateParams]);
  // Every change is also stored so the family tree opens like this next time
  const { setTreeFocusId, setTreeView, setTreeDepth } = defaults;
  const setFocus = useCallback(
    (id: string) => {
      setTreeFocusId(activeTreeId, id || null);
      updateParam('person', id || null);
    },
    [updateParam, setTreeFocusId, activeTreeId],
  );
  const setView = (v: TreeView) => {
    setTreeView(v);
    updateParam('view', v);
  };
  const setDepth = (value: string) => {
    setTreeDepth(value === ALL_DEPTHS ? null : Number(value));
    updateParam('generations', value);
  };

  const viewLabel = t(`tree.views.${view}`);
  const exportTitle = focusPerson ? `${viewLabel} – ${formatPersonName(focusPerson)}` : viewLabel;

  // "Show all anyway" only applies to the current selection
  const selection = `${view}|${focusId}|${depth}`;
  const [showAllFor, setShowAllFor] = useState<string | null>(null);
  const tooMany = visibleIds.size > TREE_NODE_LIMIT && showAllFor !== selection;

  let content;
  let showsTree = false;
  if (loading && !data) {
    content = (
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  } else if (error) {
    content = <div className="flex min-h-0 w-full flex-1 items-center justify-center text-destructive">{t('persons.error')}</div>;
  } else if (persons.length === 0) {
    content = <Hint>{t('tree.empty')}</Hint>;
  } else if (needsFocus(view) && !focusPerson) {
    content = <Hint>{t('tree.needsFocus', { view: viewLabel })}</Hint>;
  } else if (tooMany) {
    content = (
      <Hint>
        <div className="max-w-xl space-y-4">
          <p>{t('tree.tooMany', { count: visibleIds.size, limit: TREE_NODE_LIMIT })}</p>
          <Button variant="outline" onClick={() => setShowAllFor(selection)}>
            {t('tree.showAll', { count: visibleIds.size })}
          </Button>
        </div>
      </Hint>
    );
  } else {
    showsTree = true;
    content = (
      <FamilyTree persons={persons} relations={relations} view={view} focusId={focusId} visibleIds={visibleIds} onFocus={setFocus} containerRef={treeRef} />
    );
  }

  return (
    // Shared React Flow context so the export in the toolbar can access the graph
    <ReactFlowProvider>
      {/* Fills the height of the content area so the family tree fits without scrolling the page;
          only for very small windows (minimum height) does the scrollbar appear */}
      <div className="flex h-full min-h-[560px] flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.tree')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('tree.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-end gap-4" role="toolbar" aria-label={t('tree.toolbar')}>
          <div className="space-y-1.5">
            <Label htmlFor="tree-view">{t('tree.view')}</Label>
            <Select id="tree-view" className="w-52" value={view} onChange={(e) => setView(e.target.value as TreeView)}>
              {TREE_VIEWS.map((v) => (
                <option key={v} value={v}>
                  {t(`tree.views.${v}`)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tree-focus">{t('tree.focus.label')}</Label>
            <Select id="tree-focus" className="w-56" value={focusPerson?.id ?? ''} onChange={(e) => setFocus(e.target.value)}>
              <option value="">{t('tree.focus.none')}</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatPersonOption(p)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tree-depth">{t('tree.depth.label')}</Label>
            <Select
              id="tree-depth"
              className="w-32"
              value={depth ?? ALL_DEPTHS}
              // Without a focus person the family tree and network show all persons anyway
              disabled={!focusPerson}
              title={focusPerson ? undefined : t('tree.depth.needsFocus')}
              onChange={(e) => setDepth(e.target.value)}
            >
              {DEPTH_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value={ALL_DEPTHS}>{t('tree.depth.all')}</option>
            </Select>
          </div>

          {showsTree && (
            <div className="ml-auto">
              <TreeExportButtons containerRef={treeRef} title={exportTitle} fileBase={`family-tree-${view}`} />
            </div>
          )}
        </div>

        {content}

        {showsTree && (
          <p className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>{t('tree.legend.label')}</span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm border-2" style={{ borderColor: genderColor(appearance, 'MALE') }} aria-hidden="true" />
              {t('gender.MALE')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm border-2" style={{ borderColor: genderColor(appearance, 'FEMALE') }} aria-hidden="true" />
              {t('gender.FEMALE')}
            </span>
          </p>
        )}
      </div>
    </ReactFlowProvider>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <div className="flex h-[400px] w-full items-center justify-center rounded-xl border bg-card p-6 text-center text-muted-foreground">{children}</div>;
}
