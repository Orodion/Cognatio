import { useEffect } from 'react';
import { useApolloClient } from '@apollo/client';
import { track } from '@/lib/activity';
import { useActivityStore, type ActivityKind } from '@/stores/activityStore';
import { useReloadAllData } from '@/features/family-trees/lib/useFamilyTrees';
import { followJob, runningJobs } from './transfer';

const KINDS: Record<string, ActivityKind> = { import: 'import', restore: 'restore', export: 'export', backup: 'backup' };

/**
 * After the page was reloaded (or opened in a second tab): the jobs that still run on the backend appear under
 * "Activity" again with their progress. When an import or a restore ends, the views are reloaded.
 */
export function useResumeJobs() {
  const client = useApolloClient();
  const reloadAllData = useReloadAllData();
  useEffect(() => {
    let active = true;
    void runningJobs()
      .then((jobs) => {
        const known = new Set(useActivityStore.getState().activities.map((a) => a.id));
        for (const job of jobs) {
          const kind = KINDS[job.operation];
          if (!active || !kind || known.has(job.id)) {
            continue;
          }
          void track({ id: job.id, kind, label: job.label, link: kind === 'import' || kind === 'export' ? '/import-export' : '/settings#data' }, (control) =>
            followJob(job.id, control),
          )
            .then(async () => {
              if (kind === 'restore') {
                await reloadAllData();
              } else if (kind === 'import') {
                await client.resetStore();
              }
            })
            .catch(() => undefined);
        }
      })
      // Without an answer there is nothing to show again
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [client, reloadAllData]);
}
