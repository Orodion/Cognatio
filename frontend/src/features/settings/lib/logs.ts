/** Logs of the server and of this browser for the settings page: viewing and the export for the error analysis */
import { strToU8, unzipSync, zipSync } from 'fflate';
import { request, filenameFrom } from '@/features/transfer/lib/transfer';
import { saveFile } from '@/lib/platform';
import { clearClientLog, formatClientLog, getClientLog, logClient } from '@/lib/clientLog';

export type LogLevelFilter = 'all' | 'warn' | 'error';

export interface LogEntry {
  time: string | null;
  level: string;
  component: string | null;
  msg: string;
  /** Other fields of the entry (request, error …) as JSON – empty if there are none */
  details: string;
}

/** An entry of the log file (one JSON line); other lines are shown as they are */
export function parseLogLine(line: string): LogEntry {
  try {
    const { time, level, msg, component, ...rest } = JSON.parse(line) as Record<string, unknown>;
    return {
      time: typeof time === 'string' ? time : null,
      level: typeof level === 'string' ? level : 'info',
      component: typeof component === 'string' ? component : null,
      msg: typeof msg === 'string' ? msg : line,
      details: Object.keys(rest).length ? JSON.stringify(rest) : '',
    };
  } catch {
    return { time: null, level: 'info', component: null, msg: line, details: '' };
  }
}

const RANK: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/** Entries at least as severe as the filter */
export function filterLog(entries: LogEntry[], filter: LogLevelFilter): LogEntry[] {
  const min = filter === 'all' ? 0 : RANK[filter];
  return entries.filter((entry) => (RANK[entry.level] ?? 1) >= min);
}

/** The newest lines of the log file of the server */
export async function fetchServerLog(lines = 500): Promise<{ file: string | null; level: string; entries: LogEntry[] }> {
  const response = await request(`/api/v1/logs?lines=${lines}`);
  const body = (await response.json()) as { file: string | null; level: string; lines: string[] };
  return { file: body.file, level: body.level, entries: body.lines.map(parseLogLine) };
}

/** The log of this browser session */
export const browserLog = (): LogEntry[] =>
  getClientLog().map((entry) => ({ time: entry.time, level: entry.level, component: null, msg: entry.msg, details: '' }));

/** Deletes the log files of the server and the log of this browser session */
export async function clearLogs(): Promise<void> {
  await request('/api/v1/logs', { method: 'DELETE' });
  clearClientLog();
}

const pad = (n: number) => String(n).padStart(2, '0');
const timestamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

/**
 * Downloads one ZIP file with the log files of the server (`backend/`), the log of this browser session
 * and a short description of the browser (`frontend/`). If the server cannot be reached, the ZIP file
 * contains the browser log and a note – that is exactly the case in which the analysis is needed.
 */
export async function exportLogs(): Promise<{ filename: string; backendIncluded: boolean }> {
  const now = new Date();
  let files: Record<string, Uint8Array>;
  let backendIncluded = true;
  let filename = `cognatio_logs_${timestamp(now)}.zip`;
  try {
    const response = await request('/api/v1/logs/export');
    filename = filenameFrom(response.headers.get('Content-Disposition'), filename);
    files = unzipSync(new Uint8Array(await response.arrayBuffer()));
  } catch (err) {
    backendIncluded = false;
    logClient('error', `Log export: the server log could not be included: ${err instanceof Error ? err.message : String(err)}`);
    files = {
      'backend/export-failed.txt': strToU8(`The log files of the server could not be exported (${err instanceof Error ? err.message : String(err)}).\n`),
    };
  }
  files['frontend/frontend.log'] = strToU8(formatClientLog());
  files['frontend/browser.json'] = strToU8(
    JSON.stringify(
      {
        exportedAt: now.toISOString(),
        appVersion: __APP_VERSION__,
        userAgent: navigator.userAgent,
        language: navigator.language,
        // Only the path, no query and no anchor
        page: window.location.pathname,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      null,
      2,
    ),
  );
  await saveFile(new Blob([zipSync(files)], { type: 'application/zip' }), filename);
  return { filename, backendIncluded };
}
