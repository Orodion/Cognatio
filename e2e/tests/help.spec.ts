import { test, expect } from '@playwright/test';

test('Help: the ? button opens the section of the current page, search and languages', async ({ page }) => {
  await page.goto('/import-export');
  await page.getByRole('link', { name: 'Hilfe zu dieser Seite' }).click();
  await expect(page).toHaveURL(/\/help#import-export$/);
  await expect(page.getByRole('heading', { name: 'Import/Export', level: 2 })).toBeFocused();
  await expect(page.getByRole('region', { name: 'Import/Export' })).toContainText('Überschreiben');

  // A link from the section leads to the page
  await page.getByRole('link', { name: 'Zum Papierkorb' }).click();
  await expect(page).toHaveURL(/\/trash$/);

  // Entry in the sidebar, search and table of contents
  await page.getByRole('link', { name: 'Hilfe', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hilfe', level: 1 })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Hilfe durchsuchen' }).fill('ancestry');
  await expect(page.getByRole('status')).toHaveText('2 Abschnitte gefunden');
  await expect(page.getByRole('heading', { name: 'Häufige Fragen', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Suche', level: 2 })).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Inhalt' }).getByRole('link', { name: 'Datensicherung' }).click();
  await expect(page.getByRole('heading', { name: 'Datensicherung', level: 2 })).toBeFocused();

  // English and Russian (the language is switched under Settings)
  const chooseLanguage = async (name: string) => {
    await page.goto('/settings');
    await page.locator('#settings-language').selectOption({ label: name });
    await page.getByRole('link', { name: /^(Help|Hilfe|Справка)$/ }).click();
  };
  await chooseLanguage('English');
  await expect(page.getByRole('heading', { name: 'Help', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Getting started', level: 2 })).toBeVisible();
  await chooseLanguage('Русский');
  await expect(page.getByRole('heading', { name: 'Справка', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Первые шаги', level: 2 })).toBeVisible();
  await chooseLanguage('Deutsch');
});
