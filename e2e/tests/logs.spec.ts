import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';
import { gql } from './helpers';

// The log level is a setting of the whole (test) server
test.describe.configure({ mode: 'serial' });

const logLevel = async (request: Parameters<typeof gql>[0]) =>
  (await gql<{ systemInfo: { logLevel: string } }>(request, '{ systemInfo { logLevel } }')).systemInfo.logLevel;

test('The log level of the server can be changed in the system block', async ({ page, request }) => {
  const original = await logLevel(request);
  try {
    await page.goto('/settings');
    const select = page.getByLabel('Log-Level');
    await expect(select).toHaveValue(original);

    await select.selectOption('warn');
    await expect(select).toHaveValue('warn');
    expect(await logLevel(request)).toBe('warn');

    // The setting lives in the server: still there after reloading
    await page.reload();
    await expect(page.getByLabel('Log-Level')).toHaveValue('warn');
  } finally {
    await gql(request, 'mutation($level: String!) { setLogLevel(level: $level) }', { level: original });
  }
  expect(await logLevel(request)).toBe(original);
});

test('The log viewer shows the log of the server and of this browser and filters by level', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Logs anzeigen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Logs' });
  const log = dialog.getByRole('log');

  // Server: the log file with the requests of this session
  await expect(log.getByRole('listitem').first()).toBeVisible();
  await expect(log).toContainText('/graphql');
  await expect(dialog.getByRole('button', { name: 'Backend' })).toHaveAttribute('aria-pressed', 'true');

  // Browser: an error of this page appears after refreshing
  await page.evaluate(() => console.error('e2e-test-error', { detail: 1 }));
  await dialog.getByRole('button', { name: 'Frontend' }).click();
  await dialog.getByRole('button', { name: 'Aktualisieren' }).click();
  await expect(log).toContainText('e2e-test-error');
  await dialog.getByLabel('Anzeigen').selectOption('error');
  await expect(log.getByRole('listitem')).not.toHaveCount(0);
  for (const row of await log.getByRole('listitem').all()) {
    await expect(row).toContainText(/error/i);
  }

  // Escape closes the dialog and the focus returns to the button
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Logs anzeigen' })).toBeFocused();
});

test('The log export contains the log files of the server and the log of the browser', async ({ page }) => {
  await page.goto('/settings');
  await page.evaluate(() => console.warn('e2e-export-warning'));

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Logs exportieren' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^cognatio_logs_\d{8}_\d{6}\.zip$/);
  await expect(page.getByText(/Gespeichert als cognatio_logs_/)).toBeVisible();

  const files = unzipSync(new Uint8Array(fs.readFileSync((await download.path())!)));
  expect(Object.keys(files).sort()).toEqual(expect.arrayContaining(['backend/backend.log', 'frontend/browser.json', 'frontend/frontend.log', 'system.json']));
  expect(strFromU8(files['backend/backend.log'])).toContain('/graphql');
  expect(strFromU8(files['frontend/frontend.log'])).toContain('e2e-export-warning');
  const system = JSON.parse(strFromU8(files['system.json']));
  expect(system).toMatchObject({ logFile: 'backend.log', appVersion: expect.stringMatching(/^\d+\.\d+\.\d+/) });
  // No environment variables, no path of the server
  expect(JSON.stringify(system)).not.toContain('DATABASE_URL');
  expect(JSON.parse(strFromU8(files['frontend/browser.json'])).page).toBe('/settings');
});

test('Clearing the logs asks first and then empties the log of the server and of the browser', async ({ page }) => {
  await page.goto('/settings');
  await page.evaluate(() => console.error('e2e-clear-error'));

  // Declined: nothing is deleted
  page.once('dialog', (dialog) => {
    expect(dialog.message()).toContain('Alle Logs');
    void dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Logs löschen' }).click();
  await expect(page.getByText('Logs gelöscht.')).toHaveCount(0);

  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Logs löschen' }).click();
  await expect(page.getByText('Logs gelöscht.')).toBeVisible();

  await page.getByRole('button', { name: 'Logs anzeigen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Logs' });
  const log = dialog.getByRole('log');
  // The browser log is empty again, the server log only starts with the entries after clearing
  await dialog.getByRole('button', { name: 'Frontend' }).click();
  await expect(log).not.toContainText('e2e-clear-error');
  await dialog.getByRole('button', { name: 'Backend' }).click();
  await expect(log).toContainText('Logs cleared');
  await expect(log).not.toContainText('Server ready');
});

test('The settings search opens the block of a setting and focuses it', async ({ page }) => {
  await page.goto('/settings');
  const search = page.getByRole('combobox', { name: 'Einstellungen durchsuchen' });
  const results = page.getByRole('listbox', { name: 'Einstellungen durchsuchen' });
  await expect(page.getByLabel('Linienstärke')).toHaveCount(0);

  // With a part of the name, ignoring case and accents
  await search.fill('linienstaerke'.replace('ae', 'ä'));
  await expect(results.getByRole('option')).toHaveCount(1);
  await search.press('Enter');
  await expect(page.getByRole('button', { name: 'Stammbaum: Darstellung' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByLabel('Linienstärke')).toBeFocused();
  await expect(search).toHaveValue('');

  // Also in a closed block by name of the block, choosing with the mouse
  await search.fill('backup');
  await results.getByRole('option', { name: /Backup herunterladen/ }).click();
  await expect(page.getByRole('button', { name: 'Backup herunterladen' })).toBeFocused();

  // Nothing found
  await search.fill('gibtesnicht');
  await expect(page.getByText('Keine Einstellung gefunden.')).toBeVisible();
  await search.press('Escape');
  await expect(search).toHaveValue('');
});
