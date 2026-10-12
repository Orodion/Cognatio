import { test, expect } from '@playwright/test';

test('Settings: default view of the family tree, colour scheme and system status', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Einstellungen', level: 1 })).toBeVisible();

  // The block "System" is always visible: language, colour scheme, status and versions, data, log level
  await expect(page.getByRole('heading', { name: 'System', level: 2 })).toBeVisible();
  const status = page.getByRole('group', { name: 'Status' });
  await expect(status).toContainText('Backend: erreichbar');
  await expect(status).toContainText('Datenbank: erreichbar');
  await expect(status.getByTestId('backend-version')).toHaveText(/^\d+\.\d+\.\d+/);
  await expect(status.getByTestId('frontend-version')).toHaveText(/^\d+\.\d+\.\d+/);
  await expect(page.getByRole('group', { name: 'Daten in der Datenbank' })).toContainText('Personen');

  // The other blocks are closed at first; a block opens by click and stays open (also after reloading)
  const behaviour = page.getByRole('button', { name: 'Stammbaum: Verhalten' });
  await expect(behaviour).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByLabel('Ansicht beim Öffnen')).toHaveCount(0);
  await behaviour.click();
  await expect(behaviour).toHaveAttribute('aria-expanded', 'true');

  // Default view: the family tree opens as a network via the menu
  await page.getByLabel('Ansicht beim Öffnen').selectOption('network');
  await page.getByRole('navigation').getByRole('link', { name: 'Stammbaum' }).click();
  await expect(page.getByLabel('Ansicht', { exact: true })).toHaveValue('network');

  // The setting is kept after reloading
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: 'Stammbaum: Verhalten' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByLabel('Ansicht beim Öffnen')).toHaveValue('network');

  // Closed blocks show their values in one line
  await page.getByRole('button', { name: 'Stammbaum: Verhalten' }).click();
  await expect(page.getByRole('button', { name: 'Stammbaum: Verhalten' })).toContainText('Verwandtschaftsnetzwerk');

  // A link with an anchor opens the block
  await page.goto('/settings#data');
  await expect(page.getByRole('button', { name: 'Daten und Backup' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Backup herunterladen' })).toBeVisible();

  // Colour scheme fixed to dark
  await page.getByLabel('Farbschema').selectOption('dark');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});
