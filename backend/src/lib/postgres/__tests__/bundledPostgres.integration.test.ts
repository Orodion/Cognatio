import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { startBundledPostgres } from '../bundledPostgres.js';
import { createDump, listDumps, restoreDump } from '../safetyBackup.js';
import { runMigrations } from '../../migrations.js';
import { migrateWithRestore } from '../migrateSafely.js';

/**
 * With the real PostgreSQL binaries (`node scripts/fetch-postgres.mjs` puts them into tools/postgres; COGNATIO_PG_DIR
 * can point elsewhere). Without them – e.g. in the pipeline – these tests are skipped.
 */
const pgDir = path.resolve(process.env.COGNATIO_PG_DIR ?? path.join(__dirname, '../../../../../tools/postgres'));
const available = fs.existsSync(path.join(pgDir, 'bin', process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl'));
const suite = available ? describe : describe.skip;

const log = { info: () => undefined, warn: () => undefined };

suite('bundled PostgreSQL (real binaries)', () => {
  // User name with umlaut and a space: the usual Windows pitfall
  const base = path.join(os.tmpdir(), 'Jürgen Müller Test');
  const dataDir = path.join(base, 'Cognatio Daten');

  afterAll(() => fs.rmSync(base, { recursive: true, force: true }));

  it('initialises, migrates, backs up, restores and stops – and starts again on the same data', async () => {
    jest.setTimeout(120_000);
    fs.rmSync(base, { recursive: true, force: true });

    const first = await startBundledPostgres({ pgDir, dataDir, log });
    await runMigrations(first.url, log, path.join(__dirname, '../../../../prisma/migrations'));
    const client = new pg.Client({ connectionString: first.url });
    await client.connect();
    expect((await client.query('SHOW server_encoding')).rows[0].server_encoding).toBe('UTF8');
    await client.query(`INSERT INTO "FamilyTree" (id, name, "updatedAt") VALUES ('t1', 'Müller – Äpfel', now())`);

    const dump = await createDump(first, path.join(dataDir, 'backups', 'db'), 'test');
    expect(listDumps(path.dirname(dump))).toEqual([dump]);
    await client.query(`DELETE FROM "FamilyTree"`);
    await restoreDump(first, dump);
    expect((await client.query('SELECT name FROM "FamilyTree"')).rows).toEqual([{ name: 'Müller – Äpfel' }]);
    await client.end();

    await first.stop();
    // A wrong password is refused, not accepted
    const second = await startBundledPostgres({ pgDir, dataDir, log });
    expect(second.password).toBe(first.password);
    const wrong = new pg.Client({ connectionString: second.url.replace(second.password, 'wrong') });
    await expect(wrong.connect()).rejects.toThrow(/password authentication failed/);
    const again = new pg.Client({ connectionString: second.url });
    await again.connect();
    expect((await again.query('SELECT count(*)::int AS n FROM "FamilyTree"')).rows[0].n).toBe(1);
    await again.end();
    await second.stop();
  }, 120_000);

  it('restores the data if an update fails after earlier migrations of it were applied', async () => {
    jest.setTimeout(120_000);
    const folder = path.join(base, 'migrations');
    const write = (name: string, sql: string) => {
      fs.mkdirSync(path.join(folder, name), { recursive: true });
      fs.writeFileSync(path.join(folder, name, 'migration.sql'), sql);
    };
    write('1_init', `CREATE TABLE "Tree" (id text PRIMARY KEY, name text NOT NULL); INSERT INTO "Tree" VALUES ('t1', 'Müller – Äpfel');`);
    const dbDir = path.join(base, 'Daten 2');
    const server = await startBundledPostgres({ pgDir, dataDir: dbDir, log });
    const dumpDir = path.join(dbDir, 'backups', 'db');
    const withLog = { info: () => undefined, warn: () => undefined, error: () => undefined };
    try {
      await runMigrations(server.url, log, folder);

      // The next version brings a good and a broken migration
      write('2_column', `ALTER TABLE "Tree" ADD COLUMN note text; UPDATE "Tree" SET note = 'neu';`);
      write('3_broken', `ALTER TABLE "Tree" ADD COLUMN other text; SELECT 1 / 0;`);
      await expect(migrateWithRestore({ server, dumpDir, log: withLog, migrationsDir: folder })).rejects.toThrow(
        /3_broken failed.*restored to the state before the update/,
      );

      const client = new pg.Client({ connectionString: server.url });
      await client.connect();
      // Data and structure are as before the update: no column of 2_column, no trace of the migrations
      expect((await client.query('SELECT * FROM "Tree"')).rows).toEqual([{ id: 't1', name: 'Müller – Äpfel' }]);
      expect((await client.query('SELECT migration_name FROM "_prisma_migrations" ORDER BY started_at')).rows).toEqual([{ migration_name: '1_init' }]);
      await client.end();
      expect(listDumps(dumpDir)).toHaveLength(1);
    } finally {
      await server.stop();
    }
  }, 120_000);
});
