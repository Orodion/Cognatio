import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ActivityNotice, NOTICE_MS } from '../ActivityNotice';
import { useActivityStore, type Activity } from '@/stores/activityStore';

afterEach(() => {
  useActivityStore.setState({ activities: [] });
  delete window.cognatioPlatform;
  vi.useRealTimers();
});

const activity = (change: Partial<Activity>): Activity => ({
  id: 'a1',
  kind: 'import',
  label: 'familie.zip',
  link: '/import-export',
  state: 'running',
  phase: 'media',
  done: 0,
  total: 0,
  startedAt: 0,
  seen: false,
  ...change,
});

const setup = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ActivityNotice />
    </MemoryRouter>,
  );

// Tests run in cimode: texts are the keys themselves
describe('ActivityNotice', () => {
  it('tells about an operation that ended while the user was on another page, for a while', () => {
    vi.useFakeTimers();
    useActivityStore.setState({ activities: [activity({})] });
    setup('/persons');
    expect(screen.queryByTestId('activity-notice')).not.toBeInTheDocument();

    act(() => useActivityStore.getState().update('a1', { state: 'done' }));
    expect(screen.getByTestId('activity-notice')).toHaveTextContent('activity.notice.done');
    expect(screen.getByRole('link', { name: 'activity.show' })).toHaveAttribute('href', '/activity');

    act(() => vi.advanceTimersByTime(NOTICE_MS + 1));
    expect(screen.queryByTestId('activity-notice')).not.toBeInTheDocument();
  });

  it('says nothing on the page of the operation – that page shows the end – and counts it as seen', () => {
    useActivityStore.setState({ activities: [activity({})] });
    setup('/import-export');
    act(() => useActivityStore.getState().update('a1', { state: 'failed' }));
    expect(screen.queryByTestId('activity-notice')).not.toBeInTheDocument();
    expect(useActivityStore.getState().activities[0].seen).toBe(true);
  });

  it('can be closed', () => {
    useActivityStore.setState({ activities: [activity({})] });
    setup('/');
    act(() => useActivityStore.getState().update('a1', { state: 'failed' }));
    expect(screen.getByTestId('activity-notice')).toHaveTextContent('activity.notice.failed');
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }));
    expect(screen.queryByTestId('activity-notice')).not.toBeInTheDocument();
  });

  it('asks before the tab is closed while a file is uploaded from the browser, not in the desktop app', () => {
    useActivityStore.setState({ activities: [activity({ phase: 'upload' })] });
    const { unmount } = setup('/');
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    unmount();

    window.cognatioPlatform = { downloadTo: vi.fn() };
    setup('/');
    const again = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(again);
    expect(again.defaultPrevented).toBe(false);
  });
});
