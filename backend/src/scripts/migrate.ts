// Applies all pending database migrations and creates the database if it does not exist yet.
// Run in backend/: npm run db:migrate (new migrations are still created with npm run db:migrate:dev)
import 'dotenv/config';
import { logger } from '../lib/logger.js';
import { MigrationError, runMigrations } from '../lib/migrations.js';

const log = logger.child({ component: 'db' });
const url = process.env.DATABASE_URL;

if (!url) {
  log.error('DATABASE_URL is not set');
  process.exit(1);
}

try {
  const applied = await runMigrations(url, log);
  log.info(applied.length ? `${applied.length} migration(s) applied` : 'Database is up to date', { applied });
} catch (err) {
  log.error('Migrations could not be applied', { err, reason: err instanceof MigrationError ? err.reason : undefined });
  process.exit(1);
}
