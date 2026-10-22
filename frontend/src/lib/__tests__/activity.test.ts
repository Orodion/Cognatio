import { afterEach, describe, expect, it, vi } from 'vitest';
import { activityError, cancelActivity, runningProgress, track } from '../activity';
import { useActivityStore } from '@/stores/activityStore';

afterEach(() => useActivityStore.setState({ activities: [] }));

const only = () => useActivityStore.getState().activities[0];

describe('track', () => {
  it('lists a running operation with its progress and keeps the result when it ends', async () => {
    let finish: (value: number) => void = () => undefined;
    const running = track(
      { kind: 'import', label: 'familie.zip', link: '/import-export' },
      (control) => {
        control.progress({ phase: 'media', done: 5, total: 10 });
        control.rename('familie-2.zip');
        return new Promise<number>((resolve) => (finish = resolve));
      },
      (value) => ({ created: value }),
    );
    expect(only()).toMatchObject({ kind: 'import', label: 'familie-2.zip', link: '/import-export', state: 'running', phase: 'media', done: 5, total: 10 });
    expect(runningProgress(only())).toEqual({ phase: 'media', done: 5, total: 10 });

    finish(3);
    expect(await running).toBe(3);
    expect(only()).toMatchObject({ state: 'done', result: { created: 3 }, seen: false });
    expect(only().finishedAt).toBeGreaterThan(0);
    expect(runningProgress(only())).toBeNull();
  });

  it('keeps the error of a failed operation and passes it on', async () => {
    const error = { reason: 'NOT_ENOUGH_SPACE', details: ['x'], params: { neededMb: 5 } };
    await expect(
      track({ kind: 'restore', label: 'b.zip' }, async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(only()).toMatchObject({ state: 'failed', error });
  });

  it('cancels through the way the operation gave, otherwise by aborting', async () => {
    const stop = vi.fn();
    const viaJob = track({ kind: 'import', label: 'a' }, (control) => {
      control.cancellable(stop);
      return new Promise((_, reject) => setTimeout(() => reject({ reason: 'CANCELLED' }), 10));
    });
    cancelActivity(only().id);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(only().cancelling).toBe(true);
    // A second click does nothing
    cancelActivity(only().id);
    expect(stop).toHaveBeenCalledTimes(1);
    await expect(viaJob).rejects.toEqual({ reason: 'CANCELLED' });
    expect(only().state).toBe('cancelled');

    let aborted = false;
    const viaSignal = track({ kind: 'media', label: 'b' }, (control) => {
      return new Promise((_, reject) =>
        control.signal.addEventListener('abort', () => {
          aborted = true;
          reject({ reason: 'CANCELLED' });
        }),
      );
    });
    cancelActivity(only().id);
    await expect(viaSignal).rejects.toEqual({ reason: 'CANCELLED' });
    expect(aborted).toBe(true);
  });

  it('can no longer be cancelled once the operation says so', async () => {
    let finish: () => void = () => undefined;
    const running = track({ kind: 'restore', label: 'b' }, (control) => {
      control.cancellable(undefined);
      return new Promise<void>((resolve) => (finish = resolve));
    });
    expect(only().cancel).toBeUndefined();
    finish();
    await running;
  });
});

describe('activityError', () => {
  it('takes errors with a reason and calls everything else unknown', () => {
    expect(activityError({ reason: 'X', details: ['d'] })).toEqual({ reason: 'X', details: ['d'], params: undefined });
    expect(activityError(new Error('boom'))).toEqual({ reason: 'UNKNOWN', details: [] });
    expect(activityError(null)).toEqual({ reason: 'UNKNOWN', details: [] });
  });
});

describe('the activity store', () => {
  it('removes single or all finished activities and marks them as seen', async () => {
    await track({ kind: 'export', label: 'a' }, async () => 1);
    const keep = track({ kind: 'export', label: 'b' }, () => new Promise(() => undefined));
    void keep;
    const store = useActivityStore.getState();
    expect(store.activities.map((a) => a.state)).toEqual(['running', 'done']);
    store.markSeen();
    expect(useActivityStore.getState().activities.map((a) => a.seen)).toEqual([false, true]);
    useActivityStore.getState().clearFinished();
    expect(useActivityStore.getState().activities.map((a) => a.label)).toEqual(['b']);
    useActivityStore.getState().remove(useActivityStore.getState().activities[0].id);
    expect(useActivityStore.getState().activities).toEqual([]);
  });
});
