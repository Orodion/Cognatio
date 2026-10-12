import fs from 'fs';
import os from 'os';
import path from 'path';
import { Logger, optionsFromEnv, type LoggerOptions } from '../logger.js';

let dir: string;
let file: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-log-'));
  file = path.join(dir, 'logs', 'app.log');
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const create = (options: Partial<LoggerOptions> = {}) =>
  new Logger({ level: 'debug', console: 'off', file, maxFileBytes: 1024 * 1024, keepFiles: 2, ...options });

const lines = (target = file) =>
  fs
    .readFileSync(target, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as Record<string, unknown>);

describe('Logger', () => {
  it('deletes the log file and its rotated files and starts a new file with the next entry', () => {
    const log = create({ maxFileBytes: 200, keepFiles: 2 });
    for (let i = 0; i < 12; i++) {
      log.info(`entry ${i} ${'x'.repeat(40)}`);
    }
    expect(fs.existsSync(`${file}.1`)).toBe(true);
    fs.writeFileSync(path.join(path.dirname(file), 'other.log'), 'keep');

    log.clearFiles();

    expect(fs.readdirSync(path.dirname(file))).toEqual(['other.log']);
    log.child({ component: 'x' }).info('after clearing');
    expect(lines().map((l) => l.msg)).toEqual(['after clearing']);
  });

  it('does nothing without a log file', () => {
    expect(() => create({ file: null }).clearFiles()).not.toThrow();
  });

  it('changes the level at runtime for the logger and all its children', () => {
    const log = create({ level: 'error' });
    const child = log.child({ component: 'import' });
    child.info('before');
    log.setLevel('info');
    child.info('after');
    log.setLevel('silent');
    child.error('never');

    expect(lines().map((l) => l.msg)).toEqual(['after']);
    expect(log.level).toBe('silent');
  });

  it('writes one JSON line per entry with time, level, message and fields', () => {
    create().info('Import abgeschlossen', { persons: 3 });
    const [entry] = lines();
    expect(entry).toMatchObject({ level: 'info', msg: 'Import abgeschlossen', persons: 3 });
    expect(new Date(entry.time as string).toISOString()).toBe(entry.time);
  });

  it('skips entries below the configured level', () => {
    const log = create({ level: 'warn' });
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    expect(lines().map((e) => e.level)).toEqual(['warn', 'error']);
    expect(log.isEnabled('info')).toBe(false);
  });

  it('writes nothing when silent', () => {
    create({ level: 'silent' }).error('e');
    expect(fs.existsSync(file)).toBe(false);
  });

  it('adds the fields of child loggers to every entry', () => {
    const log = create().child({ component: 'import' });
    log.child({ run: 1 }).warn('Datei fehlt');
    expect(lines()[0]).toMatchObject({ component: 'import', run: 1, msg: 'Datei fehlt' });
  });

  it('serializes errors with stack, code and cause', () => {
    const err = Object.assign(new Error('DB down', { cause: new Error('ECONNREFUSED') }), { code: 'P1001' });
    create().error('Export failed', { err });
    const logged = lines()[0].err as Record<string, unknown>;
    expect(logged).toMatchObject({ name: 'Error', message: 'DB down', code: 'P1001', cause: { message: 'ECONNREFUSED' } });
    expect(logged.stack).toContain('DB down');
  });

  it('never throws on circular data or BigInt values', () => {
    const data: Record<string, unknown> = { big: BigInt(42) };
    data.self = data;
    expect(() => create().info('zyklisch', { data })).not.toThrow();
    expect(lines()[0].data).toEqual({ big: '42', self: '[Circular]' });
  });

  it('rotates the file once it exceeds the maximum size and keeps only the configured number', () => {
    const log = create({ maxFileBytes: 200, keepFiles: 2 });
    for (let i = 0; i < 12; i++) {
      log.info(`Eintrag ${i}`, { padding: 'x'.repeat(60) });
    }

    expect(fs.readdirSync(path.dirname(file)).sort()).toEqual(['app.log', 'app.log.1', 'app.log.2']);
    for (const f of [file, `${file}.1`, `${file}.2`]) {
      expect(fs.statSync(f).size).toBeLessThanOrEqual(200);
    }
    // The newest entries are in the current file, older ones move to .1, .2
    expect(lines().at(-1)?.msg).toBe('Eintrag 11');
    expect(Number(String(lines(`${file}.1`)[0].msg).split(' ')[1])).toBeLessThan(Number(String(lines()[0].msg).split(' ')[1]));
  });

  it('keeps logging to the console if the file cannot be written', () => {
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    fs.mkdirSync(file, { recursive: true }); // a directory instead of a file
    const log = create({ console: 'json' });
    log.error('erster');
    log.error('zweiter');
    const output = stderr.mock.calls.map(([chunk]) => String(chunk));
    expect(output.filter((o) => o.includes('not writable'))).toHaveLength(1);
    expect(output.filter((o) => o.startsWith('{')).map((o) => JSON.parse(o).msg)).toEqual(['erster', 'zweiter']);
  });

  it('prints readable lines with indented stack traces in pretty mode', () => {
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const log = create({ console: 'pretty', file: null }).child({ component: 'http' });
    log.info('GET /api 200', { status: 200 });
    log.error('kaputt', { err: new Error('Boom') });

    expect(String(stdout.mock.calls[0][0])).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3} INFO {2}\[http\] GET \/api 200 status=200\n$/);
    const error = String(stderr.mock.calls[0][0]);
    expect(error).toContain('ERROR [http] kaputt err="Boom"');
    expect(error).toMatch(/\n {4}Error: Boom\n {5,}at /);
  });
});

describe('optionsFromEnv', () => {
  it('uses sensible defaults', () => {
    const options = optionsFromEnv({}, false);
    expect(options).toMatchObject({ level: 'info', console: 'json', maxFileBytes: 10 * 1024 * 1024, keepFiles: 5, invalid: [] });
    expect(options.file).toBe(path.resolve('logs/cognatio.log'));
    expect(optionsFromEnv({}, true).console).toBe('pretty');
  });

  it('writes the log into the data folder of an installation (COGNATIO_DATA_DIR), LOG_FILE still wins', () => {
    expect(optionsFromEnv({ COGNATIO_DATA_DIR: 'data' }, false).file).toBe(path.resolve('data', 'logs', 'cognatio.log'));
    expect(optionsFromEnv({ COGNATIO_DATA_DIR: 'data', LOG_FILE: 'x.log' }, false).file).toBe(path.resolve('x.log'));
  });

  it('is silent and writes no file in tests', () => {
    expect(optionsFromEnv({ NODE_ENV: 'test' }, false)).toMatchObject({ level: 'silent', file: null });
  });

  it('reads level, format, file and rotation from the environment (case-insensitive)', () => {
    const options = optionsFromEnv({ LOG_LEVEL: 'DEBUG', LOG_FORMAT: 'Json', LOG_FILE: 'x/y.log', LOG_MAX_SIZE_MB: '2', LOG_KEEP: '0' }, true);
    expect(options).toMatchObject({ level: 'debug', console: 'json', file: path.resolve('x/y.log'), maxFileBytes: 2 * 1024 * 1024, keepFiles: 0 });
    expect(optionsFromEnv({ LOG_FILE: '' }, false).file).toBeNull();
  });

  it('reports invalid values and falls back to the defaults', () => {
    const options = optionsFromEnv({ LOG_LEVEL: 'laut', LOG_KEEP: '-1' }, false);
    expect(options).toMatchObject({ level: 'info', keepFiles: 5, invalid: ['LOG_LEVEL=laut', 'LOG_KEEP=-1'] });
  });
});
