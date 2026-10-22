import { create } from 'zustand';

/** Kinds of long operations the page "Activity" lists */
export type ActivityKind = 'importCheck' | 'import' | 'restoreCheck' | 'restore' | 'export' | 'backup' | 'media' | 'mcp';

export type ActivityState = 'running' | 'done' | 'failed' | 'cancelled';

/** Error of an activity, as shown by the ErrorBox (reason under importExport.errors.*) */
export interface ActivityError {
  reason: string;
  details: string[];
  params?: Record<string, number>;
}

export interface Activity {
  id: string;
  kind: ActivityKind;
  /** What it works on, shown as it is (a file name) */
  label: string;
  /** Page that belongs to it */
  link?: string;
  state: ActivityState;
  /** Current step (transferProgress.phases.*) with bytes done and in total (0: unknown) */
  phase: string;
  done: number;
  total: number;
  /** Stops it; only set while that is still possible */
  cancel?: () => void;
  /** The user asked to stop it; it ends soon (the backend finishes the step it is in) */
  cancelling?: boolean;
  /** Line about the result (activity.results.<kind> with these values) */
  result?: Record<string, string | number>;
  error?: ActivityError;
  startedAt: number;
  finishedAt?: number;
  /** The user has seen the end (on the page "Activity" or on the page of the operation) */
  seen: boolean;
}

interface ActivityStore {
  activities: Activity[];
  add: (activity: Pick<Activity, 'id' | 'kind' | 'label' | 'link'>) => void;
  /** Adds one that has ended already (a change of an AI assistant); an id that is known is skipped */
  record: (activity: Omit<Activity, 'phase' | 'done' | 'total' | 'seen'>) => void;
  update: (id: string, change: Partial<Omit<Activity, 'id'>>) => void;
  remove: (id: string) => void;
  /** Removes everything that has ended */
  clearFinished: () => void;
  markSeen: () => void;
}

/**
 * Long operations of this session (uploads, checks, import, restore, export and backup downloads), newest first.
 * Kept only in memory: closing the app or the tab discards them; operations that still run on the server are shown
 * again after reloading the page (see useResumeJobs).
 */
export const useActivityStore = create<ActivityStore>()((set) => ({
  activities: [],
  add: (activity) =>
    set((state) => ({
      activities: [{ ...activity, state: 'running', phase: 'check', done: 0, total: 0, startedAt: Date.now(), seen: false }, ...state.activities],
    })),
  record: (activity) =>
    set((state) =>
      state.activities.some((a) => a.id === activity.id)
        ? state
        : { activities: [{ ...activity, phase: 'check', done: 0, total: 0, seen: false }, ...state.activities] },
    ),
  update: (id, change) => set((state) => ({ activities: state.activities.map((a) => (a.id === id ? { ...a, ...change } : a)) })),
  remove: (id) => set((state) => ({ activities: state.activities.filter((a) => a.id !== id) })),
  clearFinished: () => set((state) => ({ activities: state.activities.filter((a) => a.state === 'running') })),
  markSeen: () => set((state) => ({ activities: state.activities.map((a) => (a.state === 'running' || a.seen ? a : { ...a, seen: true })) })),
}));

/** The newest activity of a kind (e.g. the import a page started), or undefined */
export const latestActivity = (activities: Activity[], kind: ActivityKind) => activities.find((a) => a.kind === kind);
