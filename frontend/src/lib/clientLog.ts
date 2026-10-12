/**
 * Log of the browser side: errors and warnings of this session (console, uncaught errors, failed requests).
 * Kept in memory and in the session storage (so it survives a reload), limited to the last entries.
 * The settings page shows it and adds it to the log export for the error analysis.
 */
export type ClientLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ClientLogEntry {
  time: string;
  level: ClientLogLevel;
  msg: string;
}

const STORAGE_KEY = 'cognatio-client-log';
export const MAX_CLIENT_LOG_ENTRIES = 500;
/** One entry must not fill the storage (e.g. a huge object in console.error) */
const MAX_MESSAGE_LENGTH = 4000;

function load(): ClientLogEntry[] {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    return Array.isArray(stored) ? (stored as ClientLogEntry[]).slice(-MAX_CLIENT_LOG_ENTRIES) : [];
  } catch {
    return [];
  }
}

let entries: ClientLogEntry[] = load();

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or not available: the log stays in memory only
  }
}

/** Adds an entry to the log of this session */
export function logClient(level: ClientLogLevel, msg: string) {
  entries.push({ time: new Date().toISOString(), level, msg: msg.length > MAX_MESSAGE_LENGTH ? `${msg.slice(0, MAX_MESSAGE_LENGTH)}…` : msg });
  if (entries.length > MAX_CLIENT_LOG_ENTRIES) {
    entries = entries.slice(-MAX_CLIENT_LOG_ENTRIES);
  }
  persist();
}

/** Entries of this session, oldest first */
export const getClientLog = (): ClientLogEntry[] => [...entries];

export function clearClientLog() {
  entries = [];
  persist();
}

/** The log as one JSON line per entry – the same format as the log file of the server */
export const formatClientLog = (log: ClientLogEntry[] = entries) => log.map((entry) => JSON.stringify(entry)).join('\n');

/** Text of console arguments; errors with their stack, objects as JSON */
export function describeArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ''}`;
      }
      if (typeof arg === 'string') {
        return arg;
      }
      try {
        return JSON.stringify(arg) ?? String(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ');
}

let installed = false;

/** Collects console warnings/errors, uncaught errors and unhandled promise rejections. Only takes effect once. */
export function installClientLog(target: Window & typeof globalThis = window) {
  if (installed) {
    return;
  }
  installed = true;
  for (const level of ['warn', 'error'] as const) {
    const original = target.console[level].bind(target.console);
    target.console[level] = (...args: unknown[]) => {
      logClient(level, describeArgs(args));
      original(...args);
    };
  }
  target.addEventListener('error', (event) => {
    const where = event.filename ? ` (${event.filename}:${event.lineno}:${event.colno})` : '';
    logClient('error', `Uncaught error: ${event.error ? describeArgs([event.error]) : event.message}${where}`);
  });
  target.addEventListener('unhandledrejection', (event) => {
    logClient('error', `Unhandled promise rejection: ${describeArgs([event.reason])}`);
  });
  logClient('info', `Session started: ${target.location.pathname}`);
}
