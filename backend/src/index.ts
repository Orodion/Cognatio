import 'dotenv/config';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { logger } from './lib/logger.js';
import { runMigrations } from './lib/migrations.js';
import { dataDirPath, ensureDataDir } from './lib/files/dataDir.js';
import { pgDirPath, startBundledPostgres, type BundledPostgres } from './lib/postgres/bundledPostgres.js';
import { migrateWithRestore } from './lib/postgres/migrateSafely.js';
import { createDump, dumpDue } from './lib/postgres/safetyBackup.js';
import { seedDemoTree } from './lib/demo/seedDemo.js';
import { notifyParent, onParentMessage } from './lib/parentChannel.js';
import { listen } from './lib/listen.js';

// PORT=0 picks a free port (Windows app). Only this machine can connect unless HOST names another address (e.g. 0.0.0.0
// for the network) – the backend has no login of its own
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST?.trim() || '127.0.0.1';
// Desktop app: PORT is the port of the last start; if it is taken now, a free one is used instead
const portFallback = process.env.COGNATIO_PORT_FALLBACK === '1';
const log = logger.child({ component: 'server' });

let postgres: BundledPostgres | null = null;
let server: Server | null = null;
let closing = false;

/** Closes the server and stops the bundled database in order (also on a crash, so no server stays behind) */
async function shutdown(code: number) {
  if (closing) {
    return;
  }
  closing = true;
  // Last resort, before the desktop app kills the backend after 45 seconds
  const force = setTimeout(() => process.exit(code), 40_000);
  force.unref();
  // Running requests get a few seconds; then their connections are closed, so the database is stopped in any case
  const closeConnections = setTimeout(() => server?.closeAllConnections(), 5_000);
  closeConnections.unref();
  try {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    // Loaded only if the app started; otherwise there is no connection to close
    if (server) {
      const { prisma } = await import('./lib/prisma.js');
      await prisma.$disconnect();
    }
  } catch (err) {
    log.error('Error while shutting down', { err });
  }
  // Also after an error above: a database server left running would lock the program folder for the next update
  try {
    await postgres?.stop();
  } catch (err) {
    log.error('The database server could not be stopped', { err });
  }
  process.exit(code);
}

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled promise rejection', { err: reason });
});
process.on('uncaughtException', (err) => {
  log.error('Unhandled exception – shutting down the server', { err });
  void shutdown(1);
});
process.on('SIGINT', () => void shutdown(0));
process.on('SIGTERM', () => void shutdown(0));
// Started by the desktop app: Windows has no signals, the shell asks with a message
// ... and if the shell is gone (crashed, killed), nobody could stop the database any more
process.on('disconnect', () => void shutdown(0));
onParentMessage((message) => {
  if ((message as { type?: string } | null)?.type === 'shutdown') {
    void shutdown(0);
  }
});

/** Bundled PostgreSQL (COGNATIO_PG_DIR): starts the server, then safety backups before migrations and once a day */
async function startDatabase() {
  const pgDir = pgDirPath();
  if (!pgDir) {
    return null;
  }
  const dataDir = dataDirPath(process.env);
  if (!dataDir) {
    throw new Error('COGNATIO_PG_DIR needs COGNATIO_DATA_DIR (the database is stored there)');
  }
  const dbLog = logger.child({ component: 'db' });
  const pg = await startBundledPostgres({ pgDir, dataDir, log: dbLog });
  process.env.DATABASE_URL = pg.url;
  postgres = pg;
  const dumpDir = dataDirPath(process.env, 'backups', 'db') as string;
  const backup = (reason: string) => createDump(pg, dumpDir, reason).then((file) => dbLog.info('Safety backup created', { file }));
  // Safety backup before pending migrations; restored if an update fails half way
  await migrateWithRestore({ server: pg, dumpDir, log: dbLog });
  if (dumpDue(dumpDir)) {
    await backup('daily').catch((err) => dbLog.error('Safety backup failed', { err }));
  }
  setInterval(
    () => {
      if (dumpDue(dumpDir)) {
        backup('daily').catch((err) => dbLog.error('Safety backup failed', { err }));
      }
    },
    60 * 60 * 1000,
  ).unref();
  return pg;
}

async function start() {
  // Before anything writes into it (database, logs): a new data folder is readable by the user only
  ensureDataDir();
  const bundled = await startDatabase();
  // Windows app: the backend brings its database up to date itself before it accepts requests
  if (!bundled && process.env.MIGRATE_ON_START === 'true') {
    await runMigrations(process.env.DATABASE_URL ?? '', logger.child({ component: 'db' }));
  }
  // Only now: the database connection reads DATABASE_URL, which the bundled server sets
  const { createApp } = await import('./app.js');
  const app = await createApp();
  // Desktop app, first start: the example family tree instead of an empty database (COGNATIO_DEMO_FILE)
  const { prisma } = await import('./lib/prisma.js');
  await seedDemoTree(prisma, process.env, logger.child({ component: 'demo' }));
  server = await listen(app, port, host, portFallback);
  const actual = (server.address() as AddressInfo).port;
  log.info(`Server ready: http://${host}:${actual}/graphql`, { port: actual, host });
  // Started by the desktop app: tell it the port
  notifyParent({ type: 'ready', port: actual });
}

start().catch(async (err) => {
  log.error('Server could not be started', { err });
  await postgres?.stop().catch(() => undefined);
  process.exit(1);
});
