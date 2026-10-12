import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { clearClientLog, logClient } from '@/lib/clientLog';
import * as logs from '../../lib/logs';
import { LogViewerDialog } from '../LogViewerDialog';

const line = (level: string, msg: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ time: '2026-09-30T10:00:00.000Z', level, msg, component: 'http', ...extra });

function mockServer(lines: string[], file: string | null = 'cognatio.log') {
  const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ file, level: 'info', lines })));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => clearClientLog());
afterEach(() => vi.restoreAllMocks());

const setup = () => render(<LogViewerDialog open onClose={() => undefined} />);
const log = () => screen.getByRole('log');

describe('LogViewerDialog', () => {
  it('shows the entries of the server log with level, component, message and details', async () => {
    mockServer([line('info', 'Server ready'), line('error', 'Import failed', { status: 500 })]);
    setup();
    expect(await within(log()).findByText('Server ready')).toBeInTheDocument();
    const rows = within(log()).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent('error');
    expect(rows[1]).toHaveTextContent('[http]');
    expect(rows[1]).toHaveTextContent('{"status":500}');
    expect(log()).toHaveAccessibleName('settings.logs.title: settings.system.backend');
  });

  it('switches to the log of this browser', async () => {
    mockServer([line('info', 'Server ready')]);
    logClient('error', 'Network error in GetPersons');
    setup();
    await within(log()).findByText('Server ready');

    fireEvent.click(screen.getByRole('button', { name: 'settings.system.frontend' }));

    expect(screen.getByRole('button', { name: 'settings.system.frontend' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(log()).getByText('Network error in GetPersons')).toBeInTheDocument();
    expect(within(log()).queryByText('Server ready')).not.toBeInTheDocument();
  });

  it('filters by level', async () => {
    mockServer([line('debug', 'd'), line('info', 'i'), line('warn', 'w'), line('error', 'e')]);
    setup();
    await within(log()).findByText('d');
    expect(within(log()).getAllByRole('listitem')).toHaveLength(4);

    fireEvent.change(screen.getByLabelText('settings.logs.filter'), { target: { value: 'warn' } });
    expect(
      within(log())
        .getAllByRole('listitem')
        .map((r) => r.textContent),
    ).toEqual([expect.stringContaining('w'), expect.stringContaining('e')]);

    fireEvent.change(screen.getByLabelText('settings.logs.filter'), { target: { value: 'error' } });
    expect(within(log()).getAllByRole('listitem')).toHaveLength(1);
  });

  it('reloads on request', async () => {
    const fetchMock = mockServer([line('info', 'first')]);
    setup();
    await within(log()).findByText('first');
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ file: 'cognatio.log', level: 'info', lines: [line('info', 'second')] })));

    fireEvent.click(screen.getByRole('button', { name: 'settings.logs.refresh' }));

    expect(await within(log()).findByText('second')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('explains an empty log and a server without log file', async () => {
    mockServer([]);
    const { unmount } = setup();
    expect(await within(log()).findByText('settings.logs.empty')).toBeInTheDocument();
    unmount();

    mockServer([], null);
    setup();
    expect(await within(log()).findByText('settings.logs.noFile')).toBeInTheDocument();
  });

  it('shows an error if the log cannot be loaded, the browser log stays available', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    logClient('warn', 'browser side');
    setup();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'settings.system.frontend' }));
    expect(within(log()).getByText('browser side')).toBeInTheDocument();
  });

  it('exports the logs and reports the file name', async () => {
    mockServer([line('info', 'x')]);
    const exportLogs = vi.spyOn(logs, 'exportLogs').mockResolvedValue({ filename: 'cognatio_logs_1.zip', backendIncluded: true });
    setup();
    await within(log()).findByText('x');

    fireEvent.click(screen.getByRole('button', { name: 'settings.logs.export' }));

    await waitFor(() => expect(exportLogs).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('status')).toHaveTextContent('settings.backup.downloaded');
    expect(screen.getByRole('status')).not.toHaveTextContent('settings.logs.exportPartial');
  });

  it('says so if the server log could not be included in the export', async () => {
    mockServer([]);
    vi.spyOn(logs, 'exportLogs').mockResolvedValue({ filename: 'cognatio_logs_2.zip', backendIncluded: false });
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'settings.logs.export' }));
    expect(await screen.findByRole('status')).toHaveTextContent('settings.logs.exportPartial');
  });
});
