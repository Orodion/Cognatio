import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { startBundledPostgres } from '../bundledPostgres.js';
import { createDump, listDumps, restoreDump } from '../safetyBackup.js';
import { runMigrations } from '../../migrations.js';
import { migrateWithRestore } from '../migrateSafely.js';
import { oldServerDir } from '../majorUpgrade.js';

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

/**
 * Major upgrade with real binaries: the data is created with the server of the earlier version in
 * tools/postgres/upgrade/<major> (npm run postgres:fetch provides it in a release that changes the version) and
 * converted by the current one. COGNATIO_PG_UPGRADE_DIR can name another current PostgreSQL – desktop/stage/postgres
 * tries the slimmed servers of the installer. Without an earlier version the test is skipped.
 */
const newDir = path.resolve(process.env.COGNATIO_PG_UPGRADE_DIR ?? pgDir);
const upgradeRoot = path.join(pgDir, 'upgrade');
const [oldMajor] = fs.existsSync(upgradeRoot) ? fs.readdirSync(upgradeRoot) : [];
const oldDir = oldMajor ? path.join(upgradeRoot, oldMajor) : '';
const upgradeSuite = available && oldMajor && fs.existsSync(path.join(oldDir, 'bin')) ? describe : describe.skip;

upgradeSuite('PostgreSQL major upgrade (real binaries)', () => {
  const base = path.join(os.tmpdir(), 'Jürgen Müller Upgrade');
  const dataDir = path.join(base, 'Cognatio Daten');
  const pgdata = path.join(dataDir, 'pgdata');
  const version = () => fs.readFileSync(path.join(pgdata, 'PG_VERSION'), 'utf8').trim();

  afterAll(() => fs.rmSync(base, { recursive: true, force: true }));

  it('converts the data of the earlier version, keeps the old folder and refuses to go back', async () => {
    fs.rmSync(base, { recursive: true, force: true });
    const migrations = path.join(__dirname, '../../../../prisma/migrations');
    const old = await startBundledPostgres({ pgDir: oldDir, dataDir, log });
    expect(version()).toBe(oldMajor);
    await runMigrations(old.url, log, migrations);
    const client = new pg.Client({ connectionString: old.url });
    await client.connect();
    await client.query(`INSERT INTO "FamilyTree" (id, name, "updatedAt") VALUES ('t1', 'Müller – Äpfel', now())`);
    await client.end();
    await old.stop();

    // The old server comes from upgrade/<major> of the current one, as in the installed app
    const upgraded = await startBundledPostgres({ pgDir: newDir, dataDir, log });
    expect(version()).not.toBe(oldMajor);
    expect(fs.existsSync(path.join(dataDir, `pgdata-${oldMajor}.old`, 'PG_VERSION'))).toBe(true);
    expect(fs.existsSync(oldServerDir(newDir, Number(oldMajor)))).toBe(true);
    expect(upgraded.password).toBe(old.password);
    const after = new pg.Client({ connectionString: upgraded.url });
    await after.connect();
    expect((await after.query('SHOW server_encoding')).rows[0].server_encoding).toBe('UTF8');
    expect((await after.query('SELECT name FROM "FamilyTree"')).rows).toEqual([{ name: 'Müller – Äpfel' }]);
    // The migration history came along: nothing is pending
    expect((await after.query('SELECT count(*)::int AS n FROM "_prisma_migrations"')).rows[0].n).toBe(
      fs.readdirSync(migrations).filter((f) => !f.endsWith('.toml')).length,
    );
    await after.end();
    await runMigrations(upgraded.url, log, migrations);
    await upgraded.stop();

    // The next start is an ordinary one; the earlier version refuses the converted data
    const again = await startBundledPostgres({ pgDir: newDir, dataDir, log });
    await again.stop();
    await expect(startBundledPostgres({ pgDir: oldDir, dataDir, log })).rejects.toThrow(/belongs to a newer version of Cognatio/);
  }, 180_000);
});
