import { MigrationError } from '../../migrations.js';
import { migrateWithRestore } from '../migrateSafely.js';

const server = { url: 'postgresql://x', port: 5555, password: 'pw', binDir: 'bin' };
const log = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
const opts = { server, dumpDir: 'dumps', log };

/** migrate() that calls the safety backup hook like the real one and then runs `body` */
const migrateWith = (body: () => Promise<string[]>) =>
  jest.fn(async (_url: string, _log: unknown, _dir: unknown, before?: (pending: string[]) => Promise<void>) => {
    await before?.(['m1', 'm2']);
    return body();
  });

beforeEach(() => jest.clearAllMocks());

describe('migrateWithRestore', () => {
  it('makes the safety backup and returns what was applied', async () => {
    const dump = jest.fn().mockResolvedValue('dumps/a.dump');
    const restore = jest.fn();
    const result = await migrateWithRestore({ ...opts, migrate: migrateWith(async () => ['m1', 'm2']) as never, dump, restore });
    expect(result).toEqual(['m1', 'm2']);
    expect(dump).toHaveBeenCalledWith(server, 'dumps', 'before-migration');
    expect(restore).not.toHaveBeenCalled();
  });

  it('restores the safety backup if a migration fails after earlier ones were applied', async () => {
    const dump = jest.fn().mockResolvedValue('dumps/a.dump');
    const restore = jest.fn().mockResolvedValue(undefined);
    const failing = migrateWith(async () => {
      throw new MigrationError('MIGRATION_FAILED', 'Migration m2 failed: boom', 'm2', ['m1']);
    });
    const error = await migrateWithRestore({ ...opts, migrate: failing as never, dump, restore }).catch((e) => e);
    expect(restore).toHaveBeenCalledWith(server, 'dumps/a.dump');
    expect(error).toBeInstanceOf(MigrationError);
    expect(error).toMatchObject({ reason: 'MIGRATION_FAILED', migration: 'm2', applied: [] });
    expect(error.message).toContain('Migration m2 failed: boom');
    expect(error.message).toContain('restored to the state before the update');
  });

  it('does not restore if nothing was applied (the failing migration is rolled back anyway)', async () => {
    const restore = jest.fn();
    const failing = migrateWith(async () => {
      throw new MigrationError('MIGRATION_FAILED', 'Migration m1 failed', 'm1', []);
    });
    await expect(migrateWithRestore({ ...opts, migrate: failing as never, dump: jest.fn().mockResolvedValue('f'), restore })).rejects.toThrow(
      'Migration m1 failed',
    );
    expect(restore).not.toHaveBeenCalled();
  });

  it('does not restore for other errors (database from a newer version, failed backup, no backup taken)', async () => {
    const restore = jest.fn();
    const newer = migrateWith(async () => {
      throw new MigrationError('DATABASE_NEWER', 'newer', 'x', ['m1']);
    });
    await expect(migrateWithRestore({ ...opts, migrate: newer as never, dump: jest.fn().mockResolvedValue('f'), restore })).rejects.toThrow('newer');
    const noBackup = jest.fn().mockRejectedValue(new Error('pg_dump failed'));
    await expect(migrateWithRestore({ ...opts, migrate: migrateWith(async () => []) as never, dump: noBackup, restore })).rejects.toThrow('pg_dump failed');
    // New or current database: the hook is never called, so there is no backup to restore
    const direct = jest.fn().mockRejectedValue(new MigrationError('MIGRATION_FAILED', 'fails', 'm1', ['m0']));
    await expect(migrateWithRestore({ ...opts, migrate: direct as never, dump: jest.fn(), restore })).rejects.toThrow('fails');
    expect(restore).not.toHaveBeenCalled();
  });

  it('names the kept safety backup if restoring fails too', async () => {
    const failing = migrateWith(async () => {
      throw new MigrationError('MIGRATION_FAILED', 'Migration m2 failed', 'm2', ['m1']);
    });
    const error = await migrateWithRestore({
      ...opts,
      migrate: failing as never,
      dump: jest.fn().mockResolvedValue('dumps/a.dump'),
      restore: jest.fn().mockRejectedValue(new Error('pg_restore failed')),
    }).catch((e) => e);
    expect(error.message).toContain('restoring the safety backup failed, it is kept in dumps/a.dump');
    expect(error.applied).toEqual(['m1']);
    expect(log.error).toHaveBeenCalledWith('Restoring the safety backup failed', expect.objectContaining({ file: 'dumps/a.dump' }));
  });
});
