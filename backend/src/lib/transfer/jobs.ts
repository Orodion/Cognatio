import { randomUUID } from 'node:crypto';
import { TransferError } from './format.js';
import { exclusive } from './oneAtATime.js';

/**
 * Steps of a long operation, in this order; the frontend names them ("waiting": for another operation, e.g. a
 * download; "download": an export or backup being sent)
 */
export type JobPhase = 'waiting' | 'check' | 'safetyBackup' | 'media' | 'database' | 'download';

export type JobState = 'running' | 'done' | 'failed' | 'cancelled';

/** An answer as the route would have sent it: status and JSON body */
export interface JobAnswer {
  status: number;
  body: unknown;
}

interface Job {
  id: string;
  operation: string;
  /** What the job works on, for the list of the page (e.g. the file name) */
  label: string;
  state: JobState;
  phase: JobPhase;
  /** Bytes (or steps) done and to do in the current phase; total 0: unknown */
  done: number;
  total: number;
  cancel: boolean;
  /** Can still be cancelled: before the database is changed */
  cancellable: boolean;
  answer?: JobAnswer;
  finishedAt?: number;
  /** Called at once when the user cancels (e.g. to break off a download that waits for the client) */
  onCancel?: () => void;
}

/** What a job may tell about itself while it runs */
export interface JobControl {
  phase: (phase: JobPhase, total?: number) => void;
  advance: (amount: number) => void;
  /** Throws CANCELLED if the user cancelled; with `last`, from here on the job runs to its end (the database is changed) */
  checkpoint: (last?: boolean) => void;
  /** The error CANCELLED if the user cancelled (for work that stops a stream instead of throwing) */
  cancelled: () => TransferError | undefined;
  /** Work to do at once when the user cancels */
  onCancel: (listener: () => void) => void;
}

/** Finished jobs are kept for a while, so the page can still fetch the result */
export const KEEP_FINISHED_MS = 10 * 60 * 1000;

const jobs = new Map<string, Job>();

function prune(now: number) {
  for (const job of [...jobs.values()]) {
    if (job.finishedAt && now - job.finishedAt > KEEP_FINISHED_MS) {
      jobs.delete(job.id);
    }
  }
}

/** An id the page chose for a download (it cannot read the answer of a download link) */
const PAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Runs a long operation (import, restore, a download) in the background: the page asks for the progress under the
 * id and finally gets the answer the route would have sent. `answer` turns the result or an error into that answer.
 * `options.id`: an id the page chose (a download link); used if it is a fresh UUID.
 */
export function startJob<T>(
  operation: string,
  run: (job: JobControl) => Promise<T>,
  answer: (outcome: { result: T } | { error: unknown }) => JobAnswer,
  options: { id?: unknown; label?: string } = {},
) {
  prune(Date.now());
  const id = typeof options.id === 'string' && PAGE_ID.test(options.id) && !jobs.has(options.id) ? options.id : randomUUID();
  const job: Job = { id, operation, label: options.label ?? '', state: 'running', phase: 'check', done: 0, total: 0, cancel: false, cancellable: true };
  jobs.set(job.id, job);
  const control: JobControl = {
    phase: (phase, total = 0) => Object.assign(job, { phase, total, done: 0 }),
    advance: (amount) => {
      job.done += amount;
    },
    checkpoint: (last = false) => {
      if (job.cancel) {
        throw new TransferError('CANCELLED');
      }
      if (last) {
        job.cancellable = false;
      }
    },
    cancelled: () => (job.cancel ? new TransferError('CANCELLED') : undefined),
    onCancel: (listener) => {
      job.onCancel = listener;
    },
  };
  const finished = run(control).then(
    (result) => {
      job.state = 'done';
      job.answer = answer({ result });
    },
    (error: unknown) => {
      job.state = error instanceof TransferError && error.reason === 'CANCELLED' ? 'cancelled' : 'failed';
      job.answer = answer({ error });
    },
  );
  void finished.then(() => {
    // A finished job cannot be cancelled any more
    job.cancellable = false;
    job.finishedAt = Date.now();
    job.onCancel = undefined;
  });
  return { id: job.id, finished };
}

/**
 * Runs the work of a job as soon as no other operation runs (see `exclusive`), e.g. after the download the page
 * started just before; meanwhile the job shows "waiting" and can be cancelled.
 */
export async function whenFree<T>(operation: string, control: JobControl, work: () => Promise<T>): Promise<T> {
  const release = await exclusive(
    operation,
    () => control.phase('waiting'),
    () => control.checkpoint(),
  );
  try {
    control.phase('check');
    return await work();
  } finally {
    release();
  }
}

/** State of a job for the page; null if it is unknown (never started or long finished) */
export function jobStatus(id: string) {
  const job = jobs.get(id);
  if (!job) {
    return null;
  }
  const { operation, label, state, phase, done, total, cancellable, answer } = job;
  return { id, operation, label, state, phase, done, total, cancellable, ...(answer ? { status: answer.status, result: answer.body } : {}) };
}

/** The jobs that are running, e.g. for the page after it was reloaded */
export function runningJobs() {
  return [...jobs.values()].filter((job) => job.state === 'running').map((job) => jobStatus(job.id)!);
}

/** Asks a job to stop; false if it is unknown or can no longer be cancelled */
export function cancelJob(id: string): boolean {
  const job = jobs.get(id);
  if (!job || job.state !== 'running' || !job.cancellable) {
    return false;
  }
  job.cancel = true;
  job.onCancel?.();
  return true;
}
