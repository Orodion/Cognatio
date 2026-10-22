import { afterEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MCP_ACTIVITY, MCP_SETTINGS } from '@/features/settings/graphql/mcpQueries';
import { useActivityStore } from '@/stores/activityStore';
import { recordMcpActivity, useMcpActivity } from '../mcpActivity';

afterEach(() => useActivityStore.setState({ activities: [] }));

const settings = (enabled: boolean): MockedResponse => ({
  request: { query: MCP_SETTINGS },
  result: {
    data: { mcpSettings: { __typename: 'McpSettings', enabled, address: null, portChanged: false, permissions: [], excludedTrees: [] } },
  },
  maxUsageCount: Infinity,
});

const entry = (seq: number, ok = true) => ({
  __typename: 'McpActivity',
  seq,
  at: '2026-10-21T10:00:00.000Z',
  tool: 'add_note',
  client: 'claude-code',
  tree: 'Kraft',
  target: 'Anna Kraft',
  ok,
  reason: ok ? null : 'NOT_ALLOWED',
});

const activity = (entries: Array<ReturnType<typeof entry>>): MockedResponse => ({
  request: { query: MCP_ACTIVITY, variables: { after: 0 } },
  result: { data: { mcpActivity: { __typename: 'McpActivityPage', last: entries.length, entries } } },
  maxUsageCount: Infinity,
});

const wrapper =
  (mocks: MockedResponse[]) =>
  ({ children }: { children: ReactNode }) => <MockedProvider mocks={mocks}>{children}</MockedProvider>;

describe('useMcpActivity', () => {
  it('lists the changes of assistants under "Activity" while MCP is on', async () => {
    renderHook(() => useMcpActivity(), { wrapper: wrapper([settings(true), activity([entry(1), entry(2, false)])]) });
    await waitFor(() => expect(useActivityStore.getState().activities).toHaveLength(2));
    const [refused, added] = useActivityStore.getState().activities;
    expect(added).toMatchObject({ kind: 'mcp', label: 'Anna Kraft', state: 'done', result: { tool: 'add_note', client: 'claude-code' }, seen: false });
    expect(refused).toMatchObject({ state: 'failed', result: { reason: 'NOT_ALLOWED' } });
  });

  it('asks nothing while MCP is off', async () => {
    renderHook(() => useMcpActivity(), { wrapper: wrapper([settings(false)]) });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(useActivityStore.getState().activities).toEqual([]);
  });

  it('records an entry only once', () => {
    recordMcpActivity(entry(5));
    recordMcpActivity(entry(5));
    expect(useActivityStore.getState().activities).toHaveLength(1);
  });
});
