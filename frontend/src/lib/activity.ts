import { useActivityStore, type Activity, type ActivityError, type ActivityKind } from '@/stores/activityStore';

/** Progress of a step: transferProgress.phases.<phase>, bytes done and in total (0: unknown) */
export interface StepProgress {
  phase: string;
  done: number;
  total: number;
}

/** What a tracked operation tells its activity */
export interface ActivityControl {
  id: string;
  progress: (progress: StepProgress) => void;
  /** How the user stops it from now on; undefined: no longer possible (e.g. the database is being changed) */
  cancellable: (cancel: (() => void) | undefined) => void;
  /** Aborted when the user cancels and no other way was given (e.g. an upload of the browser) */
  signal: AbortSignal;
  /** Names what it works on once that is known (e.g. the file name of a download) */
  rename: (label: string) => void;
}

/** An error with a reason (TransferApiError and the answers of the backend), others as UNKNOWN */
export function activityError(err: unknown): ActivityError {
  const e = err as Partial<ActivityError> | null;
  return typeof e?.reason === 'string' ? { reason: e.reason, details: e.details ?? [], params: e.params } : { reason: 'UNKNOWN', details: [] };
}

/** Asks an activity to stop (button "Cancel" on its page or on the page "Activity") */
export function cancelActivity(id: string) {
  const activity = useActivityStore.getState().activities.find((a) => a.id === id);
  if (activity?.cancel && !activity.cancelling) {
    useActivityStore.getState().update(id, { cancelling: true });
    activity.cancel();
  }
}

/** The progress of a running activity for a progress bar; null if it is not running */
export const runningProgress = (activity: Activity | undefined): StepProgress | null =>
  activity?.state === 'running' ? { phase: activity.phase, done: activity.done, total: activity.total } : null;

let counter = 0;
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `activity-${Date.now()}-${++counter}`);

/**
 * Runs a long operation as an activity: it appears on the page "Activity" with its progress, can be cancelled there
 * and keeps its result when the page that started it is left. Resolves or rejects like `run`. `result` turns the
 * result into the values of the line about it.
 */
export async function track<T>(
  info: { kind: ActivityKind; label: string; link?: string; id?: string },
  run: (control: ActivityControl) => Promise<T>,
  result?: (value: T) => Activity['result'],
): Promise<T> {
  const store = useActivityStore.getState();
  const id = info.id ?? newId();
  const abort = new AbortController();
  store.add({ id, kind: info.kind, label: info.label, link: info.link });
  const update = (change: Partial<Activity>) => useActivityStore.getState().update(id, change);
  update({ cancel: () => abort.abort() });
  try {
    const value = await run({
      id,
      signal: abort.signal,
      progress: ({ phase, done, total }) => update({ phase, done, total }),
      cancellable: (cancel) => update({ cancel }),
      rename: (label) => update({ label }),
    });
    update({ state: 'done', cancel: undefined, finishedAt: Date.now(), result: result?.(value) });
    return value;
  } catch (err) {
    const error = activityError(err);
    update({ state: error.reason === 'CANCELLED' ? 'cancelled' : 'failed', cancel: undefined, finishedAt: Date.now(), error });
    throw err;
  }
}
