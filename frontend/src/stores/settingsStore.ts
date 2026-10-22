import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Depth, TreeView } from '@/features/tree/lib/treeUtils';
import type { EventOrder } from '@/features/persons/lib/eventOrder';

/** Generation depth the family tree opens with by default */
export const DEFAULT_TREE_DEPTH = 3;

export type MediaView = 'grid' | 'list';

/** Paper of the reports; AUTO: Letter in the USA, Canada, Mexico and the Philippines, else A4 */
export type ReportPaper = 'AUTO' | 'A4' | 'LETTER';

/** What the reports contain */
export interface ReportOptions {
  photos: boolean;
  notes: boolean;
  sources: boolean;
  contact: boolean;
  /** Living persons only with name and year of birth */
  hideLiving: boolean;
  paper: ReportPaper;
}

export const DEFAULT_REPORT_OPTIONS: ReportOptions = { photos: true, notes: true, sources: true, contact: false, hideLiving: false, paper: 'AUTO' };

/** Life events of a person: as a timeline or as a table */
export type TimelineView = 'timeline' | 'table';

/**
 * Settings of this device (stored in the browser). The family tree settings are taken over with every change
 * in the family tree view – it opens next time the way it was left.
 */
interface SettingsState {
  /** View the family tree opens with */
  treeView: TreeView;
  /** Generation depth the family tree opens with; null = all */
  treeDepth: Depth;
  /** Last chosen focus person per family tree – the family tree opens with it again */
  treeFocusIds: Record<string, string>;
  /** Export only the visible area */
  treeExportVisibleOnly: boolean;
  /** Layout of the media of a person: tiles or list */
  mediaView: MediaView;
  /** Relations of a person: show the graph above the list */
  showRelationGraph: boolean;
  /** Life events of a person: timeline or table */
  timelineView: TimelineView;
  /** Life events: oldest first (asc) or newest first (desc, the default) */
  timelineOrder: EventOrder;
  /** Ids of the opened blocks on the settings page */
  openSections: string[];
  /** Contents and paper of the reports */
  reportOptions: ReportOptions;
  /** Last scope of the statistics per family tree (its URL parameters) – the page opens with it again */
  statisticsScopes: Record<string, string>;
  setStatisticsScope: (treeId: string, search: string) => void;
  setReportOptions: (options: Partial<ReportOptions>) => void;
  setTreeView: (view: TreeView) => void;
  setSectionOpen: (id: string, open: boolean) => void;
  setSectionsOpen: (ids: string[], open: boolean) => void;
  setMediaView: (view: MediaView) => void;
  setShowRelationGraph: (show: boolean) => void;
  setTimelineView: (view: TimelineView) => void;
  setTimelineOrder: (order: EventOrder) => void;
  setTreeDepth: (depth: Depth) => void;
  setTreeFocusId: (treeId: string, personId: string | null) => void;
  setTreeExportVisibleOnly: (visibleOnly: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      treeView: 'tree',
      treeDepth: DEFAULT_TREE_DEPTH,
      treeFocusIds: {},
      treeExportVisibleOnly: false,
      mediaView: 'grid',
      showRelationGraph: true,
      timelineView: 'timeline',
      timelineOrder: 'desc',
      openSections: [],
      reportOptions: DEFAULT_REPORT_OPTIONS,
      statisticsScopes: {},
      setStatisticsScope: (treeId, search) => set(({ statisticsScopes }) => ({ statisticsScopes: { ...statisticsScopes, [treeId]: search } })),
      setReportOptions: (options) => set(({ reportOptions }) => ({ reportOptions: { ...reportOptions, ...options } })),
      setTreeView: (treeView) => set({ treeView }),
      setTreeDepth: (treeDepth) => set({ treeDepth }),
      // "" = explicitly no focus person
      setTreeFocusId: (treeId, personId) => set(({ treeFocusIds }) => ({ treeFocusIds: { ...treeFocusIds, [treeId]: personId ?? '' } })),
      setTreeExportVisibleOnly: (treeExportVisibleOnly) => set({ treeExportVisibleOnly }),
      setMediaView: (mediaView) => set({ mediaView }),
      setShowRelationGraph: (showRelationGraph) => set({ showRelationGraph }),
      setTimelineView: (timelineView) => set({ timelineView }),
      setTimelineOrder: (timelineOrder) => set({ timelineOrder }),
      setSectionOpen: (id, open) =>
        set(({ openSections }) => ({ openSections: open ? [...new Set([...openSections, id])] : openSections.filter((s) => s !== id) })),
      setSectionsOpen: (ids, open) =>
        set(({ openSections }) => ({ openSections: open ? [...new Set([...openSections, ...ids])] : openSections.filter((s) => !ids.includes(s)) })),
    }),
    {
      name: 'cognatio-settings',
    },
  ),
);

/** Stored focus person of a family tree */
export const focusIdOf = (treeFocusIds: Record<string, string>, treeId: string | null | undefined): string | null =>
  (treeId ? treeFocusIds[treeId] : undefined) || null;
