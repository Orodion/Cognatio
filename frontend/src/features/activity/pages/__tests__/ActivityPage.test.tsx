import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ActivityPage } from '../ActivityPage';
import { useActivityStore, type Activity } from '@/stores/activityStore';

afterEach(() => useActivityStore.setState({ activities: [] }));

const activity = (change: Partial<Activity>): Activity => ({
  id: Math.random().toString(),
  kind: 'import',
  label: 'familie.zip',
  link: '/import-export',
  state: 'running',
  phase: 'media',
  done: 0,
  total: 0,
  startedAt: Date.now(),
  seen: false,
  ...change,
});

function setup(activities: Activity[]) {
  useActivityStore.setState({ activities });
  render(
    <MemoryRouter>
      <ActivityPage />
    </MemoryRouter>,
  );
}

// Tests run in cimode: texts are the keys themselves
describe('ActivityPage', () => {
  it('says so when nothing ran yet', () => {
    setup([]);
    expect(screen.getByText('activity.empty')).toBeInTheDocument();
  });

  it('shows running operations with their progress, a link to their page and "Cancel"', () => {
    const cancel = vi.fn();
    setup([activity({ id: 'a1', phase: 'media', done: 25, total: 100, cancel })]);
    const card = screen.getByTestId('activity-running');
    expect(within(card).getByText('activity.title')).toBeInTheDocument();
    expect(within(card).getByRole('progressbar', { name: 'transferProgress.phases.media' })).toHaveAttribute('aria-valuenow', '25');
    expect(within(card).getByRole('link', { name: /activity.open/ })).toHaveAttribute('href', '/import-export');
    fireEvent.click(within(card).getByRole('button', { name: 'transferProgress.cancel' }));
    expect(cancel).toHaveBeenCalled();
    expect(useActivityStore.getState().activities[0].cancelling).toBe(true);
  });

  it('lists finished ones with their result or error, marks them as seen and removes them', () => {
    setup([
      activity({ id: 'done', state: 'done', result: { created: 3, updated: 1, removed: 0, missing: 2 }, finishedAt: Date.now() }),
      activity({ id: 'failed', kind: 'restore', state: 'failed', error: { reason: 'NOT_ENOUGH_SPACE', details: [] }, finishedAt: Date.now() }),
      activity({ id: 'cancelled', kind: 'export', state: 'cancelled', finishedAt: Date.now() }),
    ]);
    const rows = screen.getAllByTestId('activity-finished');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('activity.results.import');
    expect(rows[0]).toHaveTextContent('activity.missingMedia');
    expect(within(rows[1]).getByRole('alert')).toHaveTextContent('importExport.errors.NOT_ENOUGH_SPACE');
    expect(rows[2]).toHaveTextContent('activity.cancelled');
    expect(useActivityStore.getState().activities.every((a) => a.seen)).toBe(true);

    fireEvent.click(within(rows[0]).getByRole('button', { name: 'activity.remove' }));
    expect(screen.getAllByTestId('activity-finished')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'activity.clearFinished' }));
    expect(screen.queryByTestId('activity-finished')).not.toBeInTheDocument();
    expect(screen.getByText('activity.empty')).toBeInTheDocument();
  });

  it('keeps running operations when the finished ones are removed', () => {
    setup([activity({ id: 'run' }), activity({ id: 'old', state: 'done', result: {} })]);
    fireEvent.click(screen.getByRole('button', { name: 'activity.clearFinished' }));
    expect(screen.getByTestId('activity-running')).toBeInTheDocument();
  });

  it('shows changes of AI assistants with what they did, refusals with the reason', () => {
    setup([
      activity({
        kind: 'mcp',
        label: 'Anna Kraft',
        state: 'done',
        result: { tool: 'add_event', client: 'claude-code', tree: 'Kraft' },
        finishedAt: Date.now(),
      }),
      activity({
        kind: 'mcp',
        label: '',
        state: 'failed',
        result: { tool: 'create_person', client: '', tree: 'Kraft', reason: 'NOT_ALLOWED' },
        finishedAt: Date.now(),
      }),
    ]);
    const [done, refused] = screen.getAllByTestId('activity-finished');
    expect(within(done).getByText('activity.title')).toBeInTheDocument();
    expect(within(done).getByText(/activity.results.mcp(?!Failed)/)).toBeInTheDocument();
    expect(within(refused).getByText(/activity.results.mcpFailed/)).toBeInTheDocument();
  });
});
