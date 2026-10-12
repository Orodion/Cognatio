import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrate, migrationsDir, MigrationError, readMigrations, type Migration, type MigrationDb } from '../migrations.js';

const log = { info: jest.fn(), warn: jest.fn() };

interface Row {
  id: string;
  migration_name: string;
  checksum: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
}

/** Simulates the bookkeeping table and the transactions of PostgreSQL closely enough for the runner */
function fakeDb(existing: Array<Partial<Row> & { migration_name: string }> = [], options: { failOn?: string } = {}) {
  let rows: Row[] = existing.map((r, i) => ({ id: `old-${i}`, checksum: 'x', finished_at: new Date(), rolled_back_at: null, ...r }));
  let snapshot: Row[] | null = null;
  const statements: string[] = [];
  const db: MigrationDb = {
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      statements.push(sql);
      if (sql === 'BEGIN') {
        snapshot = rows.map((r) => ({ ...r }));
      } else if (sql === 'COMMIT') {
        snapshot = null;
      } else if (sql === 'ROLLBACK') {
        rows = snapshot ?? rows;
        snapshot = null;
      } else if (sql.startsWith('SELECT migration_name')) {
        return { rows: rows.map((r) => ({ ...r })) };
      } else if (sql.startsWith('INSERT INTO "_prisma_migrations"')) {
        rows.push({ id: params[0] as string, checksum: params[1] as string, migration_name: params[2] as string, finished_at: null, rolled_back_at: null });
      } else if (sql.startsWith('UPDATE "_prisma_migrations"')) {
        rows.find((r) => r.id === params[0])!.finished_at = new Date();
      } else if (options.failOn && sql === options.failOn) {
        throw new Error('syntax error');
      }
      return { rows: [] };
    }),
  };
  return { db, rows: () => rows, statements };
}

const m = (name: string, sql = `-- ${name}`, checksum = `sum-${name}`): Migration => ({ name, sql, checksum });

describe('migrate', () => {
  it('applies all migrations of an empty database in order and records them like Prisma', async () => {
    const { db, rows, statements } = fakeDb();
    const applied = await migrate(db, [m('1_init', 'CREATE TABLE a ()'), m('2_more', 'CREATE TABLE b ()')], log);

    expect(applied).toEqual(['1_init', '2_more']);
    expect(rows().map((r) => [r.migration_name, r.checksum, r.finished_at !== null])).toEqual([
      ['1_init', 'sum-1_init', true],
      ['2_more', 'sum-2_more', true],
    ]);
    expect(statements[0]).toContain('CREATE TABLE IF NOT EXISTS "_prisma_migrations"');
    // Each migration in its own transaction, the whole run under Prisma's lock
    expect(statements.filter((s) => s === 'BEGIN')).toHaveLength(2);
    expect(statements.indexOf('CREATE TABLE a ()')).toBeLessThan(statements.indexOf('CREATE TABLE b ()'));
    expect(statements[1]).toContain('pg_advisory_lock');
    expect(statements.at(-1)).toContain('pg_advisory_unlock');
  });

  it('calls beforePending once before migrating a database that already has data – not on a new or current one', async () => {
    const before = jest.fn(async () => undefined);
    await migrate(fakeDb().db, [m('1_init')], log, before);
    expect(before).not.toHaveBeenCalled();

    const existing = fakeDb([{ migration_name: '1_init', checksum: 'sum-1_init' }]);
    await migrate(existing.db, [m('1_init')], log, before);
    expect(before).not.toHaveBeenCalled();

    await migrate(existing.db, [m('1_init'), m('2_more', 'CREATE TABLE b ()'), m('3_x')], log, before);
    expect(before).toHaveBeenCalledTimes(1);
    expect(before).toHaveBeenCalledWith(['2_more', '3_x']);
  });

  it('changes nothing if beforePending fails (the safety backup could not be made)', async () => {
    const { db, rows } = fakeDb([{ migration_name: '1_init', checksum: 'sum-1_init' }]);
    await expect(migrate(db, [m('1_init'), m('2_more')], log, async () => Promise.reject(new Error('no backup')))).rejects.toThrow('no backup');
    expect(rows().map((r) => r.migration_name)).toEqual(['1_init']);
  });

  it('only applies what is missing and does nothing on an up-to-date database', async () => {
    const { db } = fakeDb([{ migration_name: '1_init', checksum: 'sum-1_init' }]);
    expect(await migrate(db, [m('1_init'), m('2_more')], log)).toEqual(['2_more']);
    expect(await migrate(db, [m('1_init'), m('2_more')], log)).toEqual([]);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('undoes a failing migration completely, keeps the earlier ones and names the migration', async () => {
    const { db, rows, statements } = fakeDb([], { failOn: 'BROKEN' });
    const error = await migrate(db, [m('1_init'), m('2_broken', 'BROKEN'), m('3_later')], log).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(MigrationError);
    expect(error).toMatchObject({ reason: 'MIGRATION_FAILED', migration: '2_broken', applied: ['1_init'] });
    expect(rows().map((r) => r.migration_name)).toEqual(['1_init']);
    expect(statements).toContain('ROLLBACK');
    expect(statements).not.toContain('-- 3_later');
    expect(statements.at(-1)).toContain('pg_advisory_unlock');
  });

  it('refuses a database written by a newer version (downgrade guard)', async () => {
    const { db, statements } = fakeDb([{ migration_name: '1_init', checksum: 'sum-1_init' }, { migration_name: '9_future' }]);
    await expect(migrate(db, [m('1_init')], log)).rejects.toMatchObject({ reason: 'DATABASE_NEWER', migration: '9_future' });
    expect(statements).not.toContain('BEGIN');
  });

  it('refuses a database with an unresolved failed migration, but ignores rolled back ones', async () => {
    const failed = fakeDb([{ migration_name: '1_init', checksum: 'sum-1_init', finished_at: null }]);
    await expect(migrate(failed.db, [m('1_init')], log)).rejects.toMatchObject({ reason: 'FAILED_MIGRATION_IN_DATABASE' });

    const rolledBack = fakeDb([{ migration_name: '1_init', finished_at: null, rolled_back_at: new Date() }]);
    expect(await migrate(rolledBack.db, [m('1_init')], log)).toEqual(['1_init']);
  });

  it('warns if an applied migration was changed afterwards', async () => {
    const { db } = fakeDb([{ migration_name: '1_init', checksum: 'other' }]);
    await migrate(db, [m('1_init')], log);
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('changed'), { migration: '1_init' });
  });
});

describe('readMigrations', () => {
  it('reads the folders in order with the SHA-256 of the file and skips other entries', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-migrations-'));
    try {
      for (const name of ['20260202_b', '20260101_a']) {
        fs.mkdirSync(path.join(dir, name));
        fs.writeFileSync(path.join(dir, name, 'migration.sql'), `-- ${name}\n`);
      }
      fs.mkdirSync(path.join(dir, 'empty'));
      fs.writeFileSync(path.join(dir, 'migration_lock.toml'), 'provider = "postgresql"');

      const migrations = readMigrations(dir);
      expect(migrations.map((x) => x.name)).toEqual(['20260101_a', '20260202_b']);
      expect(migrations[0]).toMatchObject({ sql: '-- 20260101_a\n', checksum: expect.stringMatching(/^[0-9a-f]{64}$/) });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('finds the migrations of the project', () => {
    expect(migrationsDir({ MIGRATIONS_DIR: 'x' })).toBe(path.resolve('x'));
    expect(readMigrations().length).toBeGreaterThan(0);
  });
});
