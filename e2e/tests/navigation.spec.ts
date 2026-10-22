import { test, expect } from '@playwright/test';

test('the sidebar groups the areas and sets the rarely needed pages apart at the end', async ({ page }) => {
  await page.goto('/');
  const links = page.getByRole('navigation').getByRole('link');
  await expect(links).toHaveText([
    'Dashboard',
    'Personen',
    'Quellen',
    'Stammbaum',
    'Statistiken',
    /^Mögliche Fehler/,
    'Berichte',
    'Stammbäume',
    'Import/Export',
    'Vorgänge',
    /^Papierkorb/,
    'Einstellungen',
    'Hilfe',
  ]);
  await expect(page.getByRole('group', { name: 'Auswerten' }).getByRole('link')).toHaveCount(4);
  await links.filter({ hasText: 'Import/Export' }).click();
  await expect(page).toHaveURL(/\/import-export$/);
});
