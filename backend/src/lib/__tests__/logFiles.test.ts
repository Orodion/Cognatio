import fs from 'fs';
import os from 'os';
import path from 'path';
import { strFromU8, unzipSync } from 'fflate';
import { createLogExport, logExportName, logFilesOf, readLogTail } from '../logFiles.js';

let dir: string;
let file: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-logfiles-'));
  file = path.join(dir, 'cognatio.log');
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const line = (n: number) => JSON.stringify({ level: 'info', msg: `entry ${n}` });

describe('readLogTail', () => {
  it('returns the last lines, oldest first, without empty lines', () => {
    fs.writeFileSync(file, [1, 2, 3, 4, 5].map(line).join('\n') + '\n\n');
    expect(readLogTail(file, 3).map((l) => JSON.parse(l).msg)).toEqual(['entry 3', 'entry 4', 'entry 5']);
    expect(readLogTail(file, 100)).toHaveLength(5);
  });

  it('gives no lines for a missing file', () => {
    expect(readLogTail(path.join(dir, 'missing.log'), 10)).toEqual([]);
  });

  it('reads only the end of a very large file and drops the cut-off first line', () => {
    const filler = 'x'.repeat(1000);
    const lines = Array.from({ length: 6000 }, (_, i) => JSON.stringify({ msg: `entry ${i}`, filler }));
    fs.writeFileSync(file, lines.join('\n') + '\n');
    const tail = readLogTail(file, 10_000);
    expect(tail.length).toBeLessThan(6000);
    // Every returned line is complete
    for (const l of tail) {
      expect(() => JSON.parse(l)).not.toThrow();
    }
    expect(JSON.parse(tail[tail.length - 1]).msg).toBe('entry 5999');
  });
});

describe('logFilesOf', () => {
  it('finds the file and its rotated files in order', () => {
    for (const name of ['cognatio.log', 'cognatio.log.2', 'cognatio.log.1', 'cognatio.log.10', 'other.log', 'cognatio.log.bak']) {
      fs.writeFileSync(path.join(dir, name), 'x');
    }
    expect(logFilesOf(file).map((f) => path.basename(f))).toEqual(['cognatio.log', 'cognatio.log.1', 'cognatio.log.2', 'cognatio.log.10']);
  });

  it('gives nothing for a missing folder', () => {
    expect(logFilesOf(path.join(dir, 'nope', 'cognatio.log'))).toEqual([]);
  });
});

describe('createLogExport', () => {
  it('packs all log files and a technical description, without environment variables', () => {
    fs.writeFileSync(file, line(2));
    fs.writeFileSync(`${file}.1`, line(1));
    process.env.SECRET_FOR_TEST = 'geheim';
    const entries = unzipSync(createLogExport(file, 'debug', new Date('2026-09-30T12:00:00.000Z')));
    delete process.env.SECRET_FOR_TEST;

    expect(Object.keys(entries).sort()).toEqual(['backend/cognatio.log', 'backend/cognatio.log.1', 'system.json']);
    expect(strFromU8(entries['backend/cognatio.log'])).toContain('entry 2');
    const system = JSON.parse(strFromU8(entries['system.json']));
    expect(system).toMatchObject({
      exportedAt: '2026-09-30T12:00:00.000Z',
      logLevel: 'debug',
      logFile: 'cognatio.log',
      logFiles: ['cognatio.log', 'cognatio.log.1'],
    });
    expect(system.node).toBe(process.version);
    expect(JSON.stringify(system)).not.toContain('geheim');
    expect(JSON.stringify(system)).not.toContain(dir);
  });

  it('still creates the description if the server writes no log file', () => {
    const entries = unzipSync(createLogExport(null, 'info'));
    expect(Object.keys(entries)).toEqual(['system.json']);
    expect(JSON.parse(strFromU8(entries['system.json'])).logFile).toBeNull();
  });

  it('names the file with the time', () => {
    expect(logExportName(new Date(2026, 8, 30, 14, 30, 5))).toBe('cognatio_logs_20260930_143005.zip');
  });
});
