import fs from 'fs';
import os from 'os';
import path from 'path';
import { writeAppSettings } from '../../files/appSettings.js';
import { assertFitsLimit, backupMaxBytes, backupMaxUnpackedBytes, currentLimits, importMaxBytes, importMaxUnpackedBytes, toMb } from '../limits.js';
import type { TransferError } from '../format.js';

const MB = 1024 * 1024;
const NAMES = ['IMPORT_MAX_MB', 'IMPORT_MAX_UNPACKED_MB', 'BACKUP_MAX_MB', 'BACKUP_MAX_UNPACKED_MB'];

const settingsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-limits-settings-'));
beforeEach(() => {
  fs.mkdirSync(settingsDir, { recursive: true });
  process.env.SETTINGS_FILE = path.join(settingsDir, 'settings.json');
});
afterEach(() => {
  for (const name of NAMES) {
    delete process.env[name];
  }
  delete process.env.SETTINGS_FILE;
  fs.rmSync(settingsDir, { recursive: true, force: true });
});

describe('limits', () => {
  it('has no limit by default: only the free disk space counts', () => {
    expect(importMaxBytes()).toBe(Infinity);
    expect(backupMaxBytes()).toBe(Infinity);
    expect(importMaxUnpackedBytes()).toBe(Infinity);
    expect(backupMaxUnpackedBytes()).toBe(Infinity);
    expect(currentLimits()).toEqual({ importMb: null, backupMb: null, minMb: 64, maxMb: 16 * 1024 * 1024 });
  });

  it('can be set by environment variables (megabytes); invalid values count as not set', () => {
    process.env.IMPORT_MAX_MB = '100';
    process.env.BACKUP_MAX_MB = 'viel';
    process.env.IMPORT_MAX_UNPACKED_MB = '0';
    process.env.BACKUP_MAX_UNPACKED_MB = '-5';
    expect(importMaxBytes()).toBe(100 * MB);
    expect(backupMaxBytes()).toBe(Infinity);
    // not given (or invalid): twice the limit of the file
    expect(importMaxUnpackedBytes()).toBe(200 * MB);
    expect(backupMaxUnpackedBytes()).toBe(Infinity);
    process.env.IMPORT_MAX_UNPACKED_MB = '300';
    expect(importMaxUnpackedBytes()).toBe(300 * MB);
  });

  it('prefers what the user chose in the settings; the unpacked limit follows', () => {
    process.env.IMPORT_MAX_MB = '100';
    writeAppSettings({ limits: { importMb: 8192, backupMb: 4096 } });
    expect(importMaxBytes()).toBe(8192 * MB);
    expect(backupMaxBytes()).toBe(4096 * MB);
    expect(importMaxUnpackedBytes()).toBe(16384 * MB);
    expect(backupMaxUnpackedBytes()).toBe(8192 * MB);
    expect(currentLimits()).toEqual({ importMb: 8192, backupMb: 4096, minMb: 64, maxMb: 16 * 1024 * 1024 });
  });

  it('ignores a damaged settings file', () => {
    fs.writeFileSync(process.env.SETTINGS_FILE as string, '{ kaputt');
    expect(importMaxBytes()).toBe(Infinity);
    writeAppSettings({ limits: { importMb: -1, backupMb: 'viel' } });
    expect(currentLimits()).toMatchObject({ importMb: null, backupMb: null });
  });

  it('rounds megabytes up', () => {
    expect(toMb(1)).toBe(1);
    expect(toMb(MB)).toBe(1);
    expect(toMb(MB + 1)).toBe(2);
  });
});

describe('assertFitsLimit', () => {
  it('refuses what is larger than the limit and reports size and limit in megabytes', () => {
    expect(() => assertFitsLimit(2 * MB, 2 * MB, 'EXPORT_TOO_LARGE')).not.toThrow();
    let error: TransferError | undefined;
    try {
      assertFitsLimit(3 * MB + 1, 2 * MB, 'EXPORT_TOO_LARGE');
    } catch (err) {
      error = err as TransferError;
    }
    expect(error?.reason).toBe('EXPORT_TOO_LARGE');
    expect(error?.params).toEqual({ sizeMb: 4, limitMb: 2 });
  });
});
