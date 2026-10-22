import { useEffect, useRef } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { MCP_ACTIVITY, MCP_SETTINGS } from '@/features/settings/graphql/mcpQueries';
import type { McpSettings } from '@/features/settings/lib/mcp';
import { useActivityStore } from '@/stores/activityStore';

/** How often the app asks for changes of assistants while MCP is switched on */
export const MCP_POLL_MS = 5000;

interface McpActivityEntry {
  seq: number;
  at: string;
  tool: string;
  client: string;
  tree: string | null;
  target: string | null;
  ok: boolean;
  reason: string | null;
}

/** An entry of the backend as an ended activity of the page "Activity" */
export function recordMcpActivity(entry: McpActivityEntry) {
  const at = new Date(entry.at).getTime();
  useActivityStore.getState().record({
    id: `mcp-${entry.seq}-${entry.at}`,
    kind: 'mcp',
    label: entry.target ?? entry.tree ?? '',
    state: entry.ok ? 'done' : 'failed',
    result: { tool: entry.tool, client: entry.client, tree: entry.tree ?? '', ...(entry.reason ? { reason: entry.reason } : {}) },
    startedAt: at,
    finishedAt: at,
  });
}

/**
 * Changes of AI assistants appear under "Activity", one entry per tool call, and the pages show the changed data:
 * while MCP is switched on the app asks the backend every few seconds for new entries.
 */
export function useMcpActivity() {
  const client = useApolloClient();
  const { data: settings } = useQuery<{ mcpSettings: McpSettings }>(MCP_SETTINGS);
  const enabled = !!settings?.mcpSettings.enabled;
  const last = useRef(0);
  const { data, startPolling, stopPolling } = useQuery<{ mcpActivity: { last: number; entries: McpActivityEntry[] } }>(MCP_ACTIVITY, {
    // The backend keeps the newest 200 entries; the ones already shown are skipped here
    variables: { after: 0 },
    skip: !enabled,
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: false,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    startPolling(MCP_POLL_MS);
    return () => stopPolling();
  }, [enabled, startPolling, stopPolling]);

  useEffect(() => {
    const page = data?.mcpActivity;
    if (!page) {
      return;
    }
    // The backend started again: its numbering begins anew
    if (page.last < last.current) {
      last.current = 0;
    }
    const fresh = page.entries.filter((entry) => entry.seq > last.current);
    if (!fresh.length) {
      return;
    }
    last.current = Math.max(...fresh.map((entry) => entry.seq));
    fresh.forEach(recordMcpActivity);
    if (fresh.some((entry) => entry.ok)) {
      // The pages show what the assistant changed
      void client.refetchQueries({ include: 'active' });
    }
  }, [data, client]);
}
