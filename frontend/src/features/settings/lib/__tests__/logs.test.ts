import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { clearClientLog, logClient } from '@/lib/clientLog';
import { browserLog, exportLogs, fetchServerLog, filterLog, parseLogLine, type LogEntry } from '../logs';
import * as platform from '@/lib/platform';

const entry = (level: string): LogEntry => ({ time: null, level, component: null, msg: level, details: '' });

beforeEach(() => clearClientLog());
afterEach(() => vi.restoreAllMocks());

describe('parseLogLine', () => {
  it('splits a JSON line into time, level, component, message and the other fields', () => {
    const parsed = parseLogLine(JSON.stringify({ time: '2026-09-30T10:00:00.000Z', level: 'warn', msg: 'Slow', component: 'http', status: 200, ms: 1500 }));
    expect(parsed).toEqual({ time: '2026-09-30T10:00:00.000Z', level: 'warn', component: 'http', msg: 'Slow', details: '{"status":200,"ms":1500}' });
  });

  it('shows lines that are not JSON as they are', () => {
    expect(parseLogLine('plain text')).toEqual({ time: null, level: 'info', component: null, msg: 'plain text', details: '' });
  });
});

describe('filterLog', () => {
  const all = ['debug', 'info', 'warn', 'error'].map(entry);
  it('keeps entries at least as severe as the filter', () => {
    expect(filterLog(all, 'all')).toHaveLength(4);
    expect(filterLog(all, 'warn').map((e) => e.level)).toEqual(['warn', 'error']);
    expect(filterLog(all, 'error').map((e) => e.level)).toEqual(['error']);
  });

  it('keeps only the entries of AI assistants', () => {
    const mcp = { ...entry('info'), component: 'mcp' };
    expect(filterLog([...all, mcp], 'mcp')).toEqual([mcp]);
  });
});

describe('fetchServerLog / browserLog', () => {
  it('asks the server for the newest lines', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ file: 'cognatio.log', level: 'info', lines: [JSON.stringify({ level: 'error', msg: 'x' })] })));
    vi.stubGlobal('fetch', fetchMock);
    const log = await fetchServerLog(200);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/logs?lines=200');
    expect(log).toMatchObject({ file: 'cognatio.log', level: 'info' });
    expect(log.entries[0]).toMatchObject({ level: 'error', msg: 'x' });
  });

  it('shows the log of this browser session', () => {
    logClient('error', 'browser problem');
    expect(browserLog()).toEqual([expect.objectContaining({ level: 'error', msg: 'browser problem', component: null })]);
  });
});

describe('exportLogs', () => {
  let saved: Blob | null;
  beforeEach(() => {
    saved = null;
    vi.spyOn(platform, 'saveFile').mockImplementation(async (blob) => {
      saved = blob;
      return true;
    });
  });
  const unpack = async () => {
    const buffer = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(saved!);
    });
    return unzipSync(new Uint8Array(buffer));
  };

  it('adds the browser log and a description of the browser to the ZIP of the server', async () => {
    const serverZip = zipSync({ 'backend/cognatio.log': strToU8('server line'), 'system.json': strToU8('{}') });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(serverZip, { headers: { 'Content-Disposition': 'attachment; filename="cognatio_logs_20260930_120000.zip"' } })),
    );
    logClient('error', 'browser problem');

    const result = await exportLogs();

    expect(result).toEqual({ filename: 'cognatio_logs_20260930_120000.zip', backendIncluded: true });
    const files = await unpack();
    expect(Object.keys(files).sort()).toEqual(['backend/cognatio.log', 'frontend/browser.json', 'frontend/frontend.log', 'system.json']);
    expect(strFromU8(files['frontend/frontend.log'])).toContain('browser problem');
    const browser = JSON.parse(strFromU8(files['frontend/browser.json']));
    expect(browser).toMatchObject({ appVersion: expect.stringMatching(/^\d+\.\d+\.\d+/), userAgent: expect.any(String) });
    // Only the path of the page, no query
    expect(browser.page).toBe(window.location.pathname);
  });

  it('still exports the browser log if the server cannot be reached and says so', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    logClient('warn', 'still here');

    const result = await exportLogs();

    expect(result.backendIncluded).toBe(false);
    expect(result.filename).toMatch(/^cognatio_logs_\d{8}_\d{6}\.zip$/);
    const files = await unpack();
    expect(Object.keys(files).sort()).toEqual(['backend/export-failed.txt', 'frontend/browser.json', 'frontend/frontend.log']);
    expect(strFromU8(files['frontend/frontend.log'])).toContain('still here');
    expect(strFromU8(files['backend/export-failed.txt'])).toContain('could not be exported');
  });
});
