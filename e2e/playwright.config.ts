import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { TEST_DATABASE_URL_DEFAULT } from './scripts/guard.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

// Own ports and own database: runs in parallel with the normal dev servers without touching real data
const BACKEND_PORT = 4100;
const FRONTEND_PORT = 3100;
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? TEST_DATABASE_URL_DEFAULT;

const UPLOAD_DIR = path.join(here, '.tmp', 'uploads');
// Backup before a restore (backup.spec) – not into the folder of the real backups
const BACKUP_DIR = path.join(here, '.tmp', 'backups');
// Size limits and AI assistants (settings.json) – not the settings of the development backend
const SETTINGS_FILE = path.join(here, '.tmp', 'settings.json');

export default defineConfig({
  testDir: './tests',
  // Tests share one database and create uniquely named data – serial is more robust
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['junit', { outputFile: 'results/junit.xml' }], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    locale: 'de-DE',
    // The app starts in English; the tests are written in German (i18n.spec starts without this)
    storageState: { cookies: [], origins: [{ origin: `http://localhost:${FRONTEND_PORT}`, localStorage: [{ name: 'cognatio-language', value: 'de' }] }] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
  ],
  webServer: [
    {
      // Bring the schema of the test database up to date (non-destructive), then start the backend
      command: 'node ../e2e/scripts/prepare-db.mjs && npx tsx src/index.ts',
      cwd: path.join(here, '..', 'backend'),
      url: `http://127.0.0.1:${BACKEND_PORT}/api/v1/health`,
      env: {
        DATABASE_URL: TEST_DATABASE_URL,
        PORT: String(BACKEND_PORT),
        UPLOAD_DIR,
        BACKUP_DIR,
        SETTINGS_FILE,
        LOG_FILE: path.join(here, '.tmp', 'backend.log'),
      },
      reuseExistingServer: false,
      timeout: 120_000,
      // The backend logs every request – completely in e2e/.tmp/backend.log, only warnings and errors (stderr) stay on the console
      stdout: 'ignore',
    },
    {
      command: `npx vite --port ${FRONTEND_PORT} --strictPort`,
      cwd: path.join(here, '..', 'frontend'),
      url: `http://localhost:${FRONTEND_PORT}`,
      env: { API_TARGET: `http://127.0.0.1:${BACKEND_PORT}` },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
