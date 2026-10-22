import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { systemResolvers } from '../systemResolvers.js';
import { logger } from '../../lib/logger.js';
import { importMaxBytes, backupMaxBytes } from '../../lib/transfer/limits.js';

const original = logger.level;
afterEach(() => logger.setLevel(original));

describe('systemResolvers - size limits', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-system-'));
  beforeEach(() => {
    process.env.SETTINGS_FILE = path.join(dir, 'settings.json');
  });
  afterEach(() => {
    delete process.env.SETTINGS_FILE;
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('starts without a limit and applies a new one at once', () => {
    expect(systemResolvers.Query.sizeLimits()).toEqual({ importMb: null, backupMb: null, minMb: 64, maxMb: 16 * 1024 * 1024 });
    expect(importMaxBytes()).toBe(Infinity);

    const saved = systemResolvers.Mutation.setSizeLimits(null, { importMb: 6144, backupMb: 3072 });

    expect(saved).toMatchObject({ importMb: 6144, backupMb: 3072 });
    expect(importMaxBytes()).toBe(6144 * 1024 * 1024);
    expect(backupMaxBytes()).toBe(3072 * 1024 * 1024);
    expect(systemResolvers.Query.sizeLimits()).toMatchObject({ importMb: 6144, backupMb: 3072 });
  });

  it('removes a limit again with null', () => {
    systemResolvers.Mutation.setSizeLimits(null, { importMb: 6144, backupMb: 3072 });
    expect(systemResolvers.Mutation.setSizeLimits(null, { importMb: null, backupMb: 3072 })).toMatchObject({ importMb: null, backupMb: 3072 });
    expect(importMaxBytes()).toBe(Infinity);
  });

  it.each([[63], [16 * 1024 * 1024 + 1], [1.5], [0], [-1]])('rejects the value %s and keeps the limits', (value) => {
    expect(() => systemResolvers.Mutation.setSizeLimits(null, { importMb: value, backupMb: 2048 })).toThrow('Size limit must be between');
    expect(() => systemResolvers.Mutation.setSizeLimits(null, { importMb: 2048, backupMb: value })).toThrow();
    expect(systemResolvers.Query.sizeLimits()).toMatchObject({ importMb: null, backupMb: null });
  });
});

describe('systemResolvers - Mutation.setLogLevel', () => {
  it('changes the level of the running server and returns it', () => {
    expect(systemResolvers.Mutation.setLogLevel(null, { level: 'debug' })).toBe('debug');
    expect(logger.level).toBe('debug');
    expect(logger.child({ component: 'x' }).level).toBe('debug');
    expect(logger.isEnabled('debug')).toBe(true);

    expect(systemResolvers.Mutation.setLogLevel(null, { level: 'error' })).toBe('error');
    expect(logger.isEnabled('warn')).toBe(false);
  });

  it('rejects unknown levels and keeps the current one', () => {
    logger.setLevel('warn');
    expect(() => systemResolvers.Mutation.setLogLevel(null, { level: 'verbose' })).toThrow('Unknown log level: verbose');
    expect(() => systemResolvers.Mutation.setLogLevel(null, { level: 'silent' })).toThrow();
    expect(logger.level).toBe('warn');
  });
});
