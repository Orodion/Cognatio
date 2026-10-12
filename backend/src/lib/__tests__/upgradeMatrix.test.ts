import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { migrate, readMigrations } from '../migrations.js';

/**
 * Upgrade matrix: a user can come from any earlier version. For every earlier state of the migration chain a
 * database is created, filled with the data of that state (`prisma/upgrade-fixtures/<migration>.sql`), migrated to
 * the current version, and then
 *   - the schema must be identical to a fresh installation (nothing forgotten, nothing left over),
 *   - the tables must still have all their rows.
 * Needs a PostgreSQL server: UPGRADE_TEST_DATABASE_URL is a connection to any database on it (the test creates and
 * drops its own databases). Without it – e.g. a developer machine without a database – the test is skipped; the
 * pipeline runs it with a PostgreSQL service (job test:upgrade).
 */
const adminUrl = process.env.UPGRADE_TEST_DATABASE_URL;
const suite = adminUrl ? describe : describe.skip;

const log = { info: () => undefined, warn: () => undefined };
const migrations = readMigrations();
const fixtureDir = path.resolve(__dirname, '../../../prisma/upgrade-fixtures');

function urlFor(database: string) {
  const url = new URL(adminUrl as string);
  url.pathname = `/${database}`;
  url.search = '';
  return url.toString();
}

async function withDatabase<T>(name: string, fn: (db: pg.Client) => Promise<T>): Promise<T> {
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  const database = `cognatio_upg_${process.pid}_${name}`.toLowerCase();
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
    await admin.query(`CREATE DATABASE "${database}"`);
    const db = new pg.Client({ connectionString: urlFor(database) });
    await db.connect();
    try {
      return await fn(db);
    } finally {
      await db.end();
    }
  } finally {
    await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`).catch(() => undefined);
    await admin.end();
  }
}

/** Everything that makes up the schema, sorted so the order of creation does not matter */
async function schemaOf(db: pg.Client): Promise<string[]> {
  const columns = await db.query(
    `SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
       FROM information_schema.columns WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'`,
  );
  const indexes = await db.query(`SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`);
  const constraints = await db.query(
    `SELECT conrelid::regclass::text AS table_name, pg_get_constraintdef(oid) AS def FROM pg_constraint
      WHERE connamespace = 'public'::regnamespace AND conrelid::regclass::text <> '"_prisma_migrations"'`,
  );
  return [
    ...columns.rows.map((r) => `column ${r.table_name}.${r.column_name} ${r.udt_name} null=${r.is_nullable} default=${r.column_default}`),
    ...indexes.rows.map((r) => `index ${r.indexdef}`),
    ...constraints.rows.map((r) => `constraint ${r.table_name} ${r.def}`),
  ].sort();
}

async function rowCounts(db: pg.Client): Promise<Record<string, number>> {
  const tables = await db.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`);
  const counts: Record<string, number> = {};
  for (const { tablename } of tables.rows) {
    counts[tablename] = (await db.query(`SELECT count(*)::int AS n FROM "${tablename}"`)).rows[0].n;
  }
  return counts;
}

/** Applies the fixture files of the first `count` migrations that have one */
async function loadFixtures(db: pg.Client, count: number) {
  for (const migration of migrations.slice(0, count)) {
    const file = path.join(fixtureDir, `${migration.name}.sql`);
    if (fs.existsSync(file)) {
      await db.query(fs.readFileSync(file, 'utf8'));
    }
  }
}

suite('upgrade matrix', () => {
  let fresh: string[];

  beforeAll(async () => {
    fresh = await withDatabase('fresh', async (db) => {
      await migrate(db, migrations, log);
      return schemaOf(db);
    });
  }, 60_000);

  it('has a fixture for the first migration (otherwise the matrix proves little)', () => {
    expect(fs.existsSync(path.join(fixtureDir, `${migrations[0].name}.sql`))).toBe(true);
  });

  // Every state of the chain: after the first migration, after the second, …
  it.each(migrations.map((m, i) => [m.name, i + 1] as const))(
    'migrates from the state after %s to the current version without loss',
    async (_name, count) => {
      await withDatabase(`from_${count}`, async (db) => {
        await migrate(db, migrations.slice(0, count), log);
        await loadFixtures(db, count);
        const before = await rowCounts(db);
        expect(Object.values(before).some((n) => n > 0)).toBe(true);

        const applied = await migrate(db, migrations, log);
        expect(applied).toEqual(migrations.slice(count).map((m) => m.name));

        expect(await schemaOf(db)).toEqual(fresh);
        const after = await rowCounts(db);
        for (const [table, rows] of Object.entries(before)) {
          if (table in after) {
            expect({ table, rows: after[table] }).toEqual({ table, rows });
          }
        }
      });
    },
    60_000,
  );
});
