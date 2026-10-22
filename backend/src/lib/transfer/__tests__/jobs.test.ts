import { TransferError } from '../format.js';
import { KEEP_FINISHED_MS, cancelJob, jobStatus, runningJobs, startJob, type JobControl } from '../jobs.js';

const answer = (outcome: { result: unknown } | { error: unknown }) =>
  'result' in outcome ? { status: 200, body: outcome.result } : { status: 400, body: { reason: (outcome.error as TransferError).reason } };

/** A job that waits until the test lets it go on */
function controlledJob() {
  let go: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => (go = resolve));
  let control: JobControl | undefined;
  const job = startJob(
    'import',
    async (c) => {
      control = c;
      c.phase('media', 100);
      c.advance(40);
      await gate;
      c.checkpoint(true);
      c.phase('database');
      return { done: true };
    },
    answer,
  );
  return { job, go, control: () => control! };
}

describe('jobs', () => {
  it('report phase and progress while running and the answer at the end', async () => {
    const { job, go } = controlledJob();
    expect(jobStatus(job.id)).toMatchObject({ operation: 'import', state: 'running', phase: 'media', done: 40, total: 100, cancellable: true });
    go();
    await job.finished;
    expect(jobStatus(job.id)).toMatchObject({ state: 'done', phase: 'database', status: 200, result: { done: true }, cancellable: false });
  });

  it('can be cancelled before the database step', async () => {
    const { job, go, control } = controlledJob();
    expect(control().cancelled()).toBeUndefined();
    expect(cancelJob(job.id)).toBe(true);
    expect(control().cancelled()).toMatchObject({ reason: 'CANCELLED' });
    go();
    await job.finished;
    expect(jobStatus(job.id)).toMatchObject({ state: 'cancelled', status: 400, result: { reason: 'CANCELLED' }, cancellable: false });
    // Finished: nothing to cancel any more
    expect(cancelJob(job.id)).toBe(false);
  });

  it('can no longer be cancelled once the database is changed', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const job = startJob(
      'restore',
      async (c) => {
        c.checkpoint(true);
        await gate;
        return 'fertig';
      },
      answer,
    );
    await Promise.resolve();
    expect(jobStatus(job.id)).toMatchObject({ cancellable: false });
    expect(cancelJob(job.id)).toBe(false);
    release();
    await job.finished;
    expect(jobStatus(job.id)).toMatchObject({ state: 'done', result: 'fertig' });
  });

  it('turn an error into the answer of the route', async () => {
    const job = startJob(
      'import',
      async () => {
        throw new TransferError('NOT_ENOUGH_SPACE');
      },
      answer,
    );
    await job.finished;
    expect(jobStatus(job.id)).toMatchObject({ state: 'failed', status: 400, result: { reason: 'NOT_ENOUGH_SPACE' } });
  });

  it('forget finished jobs after a while', async () => {
    const job = startJob('import', async () => 1, answer);
    await job.finished;
    await Promise.resolve();
    const now = Date.now();
    const spy = jest.spyOn(Date, 'now').mockReturnValue(now + KEEP_FINISHED_MS + 1);
    try {
      // Starting another job prunes the old ones
      await startJob('import', async () => 2, answer).finished;
      expect(jobStatus(job.id)).toBeNull();
    } finally {
      spy.mockRestore();
    }
    expect(jobStatus('unbekannt')).toBeNull();
    expect(cancelJob('unbekannt')).toBe(false);
  });

  it('take an id the page chose (a download link) if it is a fresh UUID, and a label', async () => {
    const id = '2f2e2d2c-2b2a-4928-8726-252423222120';
    const first = startJob('export', async () => 1, answer, { id, label: 'a.zip' });
    expect(first.id).toBe(id);
    expect(jobStatus(id)).toMatchObject({ operation: 'export', label: 'a.zip' });
    // Taken already or no UUID: a new id
    expect(startJob('export', async () => 1, answer, { id }).id).not.toBe(id);
    expect(startJob('export', async () => 1, answer, { id: '../x' }).id).toMatch(/^[0-9a-f-]{36}$/);
    await first.finished;
  });

  it('list the running ones and tell a cancel listener at once', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const stopped = jest.fn();
    const job = startJob(
      'backup',
      async (control) => {
        control.onCancel(stopped);
        await gate;
        throw control.cancelled();
      },
      answer,
    );
    expect(runningJobs()).toEqual(expect.arrayContaining([expect.objectContaining({ id: job.id, operation: 'backup', state: 'running' })]));
    expect(cancelJob(job.id)).toBe(true);
    expect(stopped).toHaveBeenCalledTimes(1);
    release();
    await job.finished;
    expect(runningJobs().some((j) => j.id === job.id)).toBe(false);
    expect(jobStatus(job.id)).toMatchObject({ state: 'cancelled' });
  });
});
