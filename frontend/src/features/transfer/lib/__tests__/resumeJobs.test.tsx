import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import type { ReactNode } from 'react';
import { useActivityStore } from '@/stores/activityStore';

const reloadAllData = vi.fn(async () => undefined);
vi.mock('@/features/family-trees/lib/useFamilyTrees', () => ({ useReloadAllData: () => reloadAllData }));

import { useResumeJobs } from '../resumeJobs';

afterEach(() => {
  vi.unstubAllGlobals();
  useActivityStore.setState({ activities: [] });
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const wrapper = ({ children }: { children: ReactNode }) => <MockedProvider>{children}</MockedProvider>;

describe('useResumeJobs', () => {
  it('shows the jobs that still run on the backend again and reloads the data when a restore ends', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url === '/api/v1/jobs'
          ? json([
              { id: 'j1', operation: 'restore', label: 'sicherung.zip', state: 'running', phase: 'media', done: 1, total: 2, cancellable: true },
              { id: 'j2', operation: 'unknown', label: 'x', state: 'running', phase: 'check', done: 0, total: 0, cancellable: true },
            ])
          : json({ state: 'done', result: {} }),
      ),
    );
    renderHook(() => useResumeJobs(), { wrapper });
    await waitFor(() => expect(useActivityStore.getState().activities).toHaveLength(1));
    expect(useActivityStore.getState().activities[0]).toMatchObject({ id: 'j1', kind: 'restore', label: 'sicherung.zip', link: '/settings#data' });
    await waitFor(() => expect(useActivityStore.getState().activities[0].state).toBe('done'));
    expect(reloadAllData).toHaveBeenCalled();
  });

  it('shows nothing when the backend cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    renderHook(() => useResumeJobs(), { wrapper });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(useActivityStore.getState().activities).toEqual([]);
  });
});
