// Empties the E2E test database completely (for manual clean-up: `npm run db:reset` in the e2e folder).
// The tests themselves do not need this. Only works for databases named "*_test".
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertTestDatabase, TEST_DATABASE_URL_DEFAULT } from './guard.mjs';

process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? TEST_DATABASE_URL_DEFAULT;
const dbName = assertTestDatabase();
const backendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'backend');

console.log(`[e2e] Resetting test database "${dbName}" …`);
execSync('npx prisma migrate reset --force', { stdio: 'inherit', cwd: backendDir });
