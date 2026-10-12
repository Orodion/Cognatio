import fs from 'node:fs';
import path from 'node:path';
import { dataDirPath } from './files/dataDir.js';

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];
export type LogFields = Record<string, unknown>;

export interface LoggerOptions {
  /** Lowest level that is written; `silent` switches off all output */
  level: LogLevel | 'silent';
  /** Console: one JSON line per entry, human-readable, or off */
  console: 'json' | 'pretty' | 'off';
  /** Log file with one JSON line per entry; null = no file */
  file: string | null;
  /** From this size on the file is rotated (cognatio.log -> cognatio.log.1 -> …) */
  maxFileBytes: number;
  /** Number of rotated files that are kept */
  keepFiles: number;
}

const rank = (level: LogLevel | 'silent') => (level === 'silent' ? Infinity : LOG_LEVELS.indexOf(level));

/** Error as a JSON-compatible object (stack, code, cause) – JSON.stringify would leave only `{}` */
function serializeError(err: Error): LogFields {
  const { name, message, stack } = err;
  const extra = Object.fromEntries(Object.entries(err).filter(([, v]) => v !== undefined && typeof v !== 'function'));
  return {
    name,
    message,
    ...extra,
    stack,
    ...(err.cause !== undefined ? { cause: err.cause instanceof Error ? serializeError(err.cause) : err.cause } : {}),
  };
}

/** JSON.stringify that does not fail on cycles and BigInts – a log call must never throw an error itself */
function toJson(value: unknown) {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, v: unknown) => {
    if (typeof v === 'bigint') {
      return v.toString();
    }
    if (v && typeof v === 'object') {
      if (seen.has(v)) {
        return '[Circular]';
      }
      seen.add(v);
    }
    return v;
  });
}

const serialize = (fields: LogFields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v instanceof Error ? serializeError(v) : v]));

/** Appends JSON lines to a file and rotates it by size. Synchronous so nothing is lost on a crash. */
class LogFile {
  private fd: number | null = null;
  private size = 0;
  private failed = false;

  constructor(
    private readonly file: string,
    private readonly maxBytes: number,
    private readonly keep: number,
  ) {}

  write(line: string) {
    if (this.failed) {
      return;
    }
    try {
      if (this.fd === null) {
        this.open();
      }
      if (this.size > 0 && this.size + Buffer.byteLength(line) > this.maxBytes) {
        this.rotate();
      }
      this.size += fs.writeSync(this.fd!, line);
    } catch (err) {
      // Log file not writable: report once, then only write to the console
      this.failed = true;
      process.stderr.write(`Log file ${this.file} is not writable: ${(err as Error).message}\n`);
    }
  }

  /** Deletes the file and all rotated files; the next entry starts a new file */
  clear() {
    if (this.fd !== null) {
      fs.closeSync(this.fd);
      this.fd = null;
    }
    this.size = 0;
    this.failed = false;
    const dir = path.dirname(this.file);
    const base = path.basename(this.file);
    let names: string[];
    try {
      names = fs.readdirSync(dir);
    } catch {
      return;
    }
    for (const name of names) {
      if (name === base || (name.startsWith(`${base}.`) && /^\d+$/.test(name.slice(base.length + 1)))) {
        fs.rmSync(path.join(dir, name), { force: true });
      }
    }
  }

  private open() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    this.fd = fs.openSync(this.file, 'a');
    this.size = fs.fstatSync(this.fd).size;
  }

  private rotate() {
    fs.closeSync(this.fd!);
    this.fd = null;
    fs.rmSync(`${this.file}.${this.keep}`, { force: true });
    for (let i = this.keep - 1; i >= 1; i--) {
      if (fs.existsSync(`${this.file}.${i}`)) {
        fs.renameSync(`${this.file}.${i}`, `${this.file}.${i + 1}`);
      }
    }
    if (this.keep > 0) {
      fs.renameSync(this.file, `${this.file}.1`);
    } else {
      fs.rmSync(this.file, { force: true });
    }
    this.open();
  }
}

const PRETTY_LEVEL: Record<LogLevel, string> = { debug: 'DEBUG', info: 'INFO ', warn: 'WARN ', error: 'ERROR' };

/** Single-line readable output for development in the terminal; stacks follow indented */
function pretty(entry: LogFields & { time: string; level: LogLevel; msg: string }) {
  const { time, level, msg, component, ...rest } = entry;
  const stacks: string[] = [];
  const pairs = Object.entries(rest).map(([key, value]) => {
    if (value && typeof value === 'object' && 'stack' in value && typeof value.stack === 'string') {
      stacks.push(value.stack);
      return `${key}=${toJson((value as { message?: unknown }).message)}`;
    }
    return `${key}=${typeof value === 'string' ? value : toJson(value)}`;
  });
  // Time in local time (the JSON lines keep UTC)
  const date = new Date(time);
  const clock = `${date.toTimeString().slice(0, 8)}.${String(date.getMilliseconds()).padStart(3, '0')}`;
  const head = [clock, PRETTY_LEVEL[level], component ? `[${component}]` : '', msg, ...pairs].filter(Boolean).join(' ');
  return [head, ...stacks.map((s) => s.replace(/^/gm, '    '))].join('\n') + '\n';
}

export class Logger {
  constructor(
    // Shared with all child loggers, so a changed level applies to every logger at once
    private readonly options: LoggerOptions,
    private readonly bindings: LogFields = {},
    private readonly logFile: LogFile | null = options.file ? new LogFile(options.file, options.maxFileBytes, options.keepFiles) : null,
  ) {}

  /** Logger with fixed additional fields, e.g. `{ component: 'import' }` */
  child(bindings: LogFields) {
    return new Logger(this.options, { ...this.bindings, ...bindings }, this.logFile);
  }

  /** Log file (null = none) – the settings page shows and exports it */
  get file() {
    return this.options.file;
  }

  /** Configured level (shown in the app) */
  get level() {
    return this.options.level;
  }

  /** Changes the lowest level that is written – for all loggers derived from the same root; lasts until the restart */
  setLevel(level: LogLevel | 'silent') {
    this.options.level = level;
  }

  /** Deletes the log file and its rotated files (shared by all loggers derived from the same root) */
  clearFiles() {
    this.logFile?.clear();
  }

  isEnabled(level: LogLevel) {
    return rank(level) >= rank(this.options.level);
  }

  debug(msg: string, fields?: LogFields) {
    this.log('debug', msg, fields);
  }

  info(msg: string, fields?: LogFields) {
    this.log('info', msg, fields);
  }

  warn(msg: string, fields?: LogFields) {
    this.log('warn', msg, fields);
  }

  error(msg: string, fields?: LogFields) {
    this.log('error', msg, fields);
  }

  log(level: LogLevel, msg: string, fields: LogFields = {}) {
    if (!this.isEnabled(level)) {
      return;
    }
    const entry = { time: new Date().toISOString(), level, msg, ...serialize(this.bindings), ...serialize(fields) };
    const json = `${toJson(entry)}\n`;
    this.logFile?.write(json);
    if (this.options.console === 'off') {
      return;
    }
    const stream = rank(level) >= rank('warn') ? process.stderr : process.stdout;
    stream.write(this.options.console === 'json' ? json : pretty(entry));
  }
}

/**
 * Settings from environment variables:
 * - LOG_LEVEL: debug | info | warn | error | silent (default info, silent in tests)
 * - LOG_FILE: path of the log file (default logs/cognatio.log, with COGNATIO_DATA_DIR logs/cognatio.log in it; empty = no file, none in tests)
 * - LOG_FORMAT: json | pretty for the console (default pretty in a terminal, json otherwise)
 * - LOG_MAX_SIZE_MB (default 10) and LOG_KEEP (default 5) for rotation
 */
export function optionsFromEnv(env: NodeJS.ProcessEnv = process.env, isTTY = !!process.stdout.isTTY): LoggerOptions & { invalid: string[] } {
  const test = env.NODE_ENV === 'test';
  const invalid: string[] = [];
  const pick = <T extends string>(name: string, allowed: readonly T[], fallback: T): T => {
    const value = env[name]?.trim().toLowerCase();
    if (!value) {
      return fallback;
    }
    if ((allowed as readonly string[]).includes(value)) {
      return value as T;
    }
    invalid.push(`${name}=${env[name]}`);
    return fallback;
  };
  const positive = (name: string, fallback: number) => {
    const value = Number(env[name]);
    if (env[name] === undefined || env[name] === '') {
      return fallback;
    }
    if (Number.isFinite(value) && value >= 0) {
      return value;
    }
    invalid.push(`${name}=${env[name]}`);
    return fallback;
  };
  const file = env.LOG_FILE ?? (test ? '' : (dataDirPath(env, 'logs', 'cognatio.log') ?? 'logs/cognatio.log'));
  return {
    level: pick('LOG_LEVEL', [...LOG_LEVELS, 'silent'] as const, test ? 'silent' : 'info'),
    console: pick('LOG_FORMAT', ['json', 'pretty'] as const, isTTY ? 'pretty' : 'json'),
    file: file.trim() ? path.resolve(file.trim()) : null,
    maxFileBytes: positive('LOG_MAX_SIZE_MB', 10) * 1024 * 1024,
    keepFiles: Math.floor(positive('LOG_KEEP', 5)),
    invalid,
  };
}

function createDefaultLogger() {
  const { invalid, ...options } = optionsFromEnv();
  const log = new Logger(options);
  if (invalid.length) {
    log.warn('Invalid log settings, using defaults', { invalid });
  }
  return log;
}

export const logger = createDefaultLogger();
