/** Local test database on the local database server (npm run db:start; own database, separate from cognatio_db) */
export const TEST_DATABASE_URL_DEFAULT = 'postgresql://cognatio:cognatio123@localhost:5432/cognatio_test?schema=public';

/**
 * Protection against data loss: E2E scripts only work with databases whose name ends with "_test".
 * Returns the database name or exits the process.
 */
export function assertTestDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[e2e] DATABASE_URL is not set.');
    process.exit(1);
  }
  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    console.error(`[e2e] Aborted: "${dbName}" is not a test database (the name must end with "_test").`);
    process.exit(1);
  }
  return dbName;
}
