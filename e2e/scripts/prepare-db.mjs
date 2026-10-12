// Brings the schema of the E2E test database up to date via migrations (creates it if needed).
// Non-destructive: existing test data is kept – the tests use unique names.
// Runs before the test backend starts (working directory: backend/).
import { execSync } from 'node:child_process';
import { assertTestDatabase } from './guard.mjs';

const MAX_ATTEMPTS = 10;
const RETRY_DELAY_MS = 3000;

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const dbName = assertTestDatabase();

// In CI the Postgres service starts in parallel with the job – retry until it accepts connections
for (let attempt = 1; ; attempt++) {
  try {
    console.log(`[e2e] Migriere Testdatenbank "${dbName}" (Versuch ${attempt}/${MAX_ATTEMPTS}) …`);
    execSync('npx tsx src/scripts/migrate.ts', { stdio: 'inherit' });
    break;
  } catch (err) {
    if (attempt >= MAX_ATTEMPTS) throw err;
    console.log(`[e2e] Database not reachable yet, retrying in ${RETRY_DELAY_MS / 1000} s …`);
    sleep(RETRY_DELAY_MS);
  }
}
