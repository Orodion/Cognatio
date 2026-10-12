import { test, expect, type Page } from '@playwright/test';
import { createPerson, uid } from './helpers';

// Start like a first visit: no stored language, the system language is English
test.use({ storageState: { cookies: [], origins: [] }, locale: 'en-US' });

/** The language is only switched under Settings */
async function chooseLanguage(page: Page, name: string) {
  await page.goto('/settings');
  await page.locator('#settings-language').selectOption({ label: name });
}

test('The app starts in the system language (here English); the language is switched under Settings only and applies to pages, window title and <html lang>', async ({
  page,
  request,
}) => {
  await createPerson(request, { firstName: `Ivan${uid()}`, lastName: 'Test' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Cognatio - Family Tree');
  await expect(page.getByText('Total persons')).toBeVisible();
  // No language switch in the top bar
  await expect(page.getByRole('banner').getByRole('button', { name: 'EN', exact: true })).toHaveCount(0);
  await expect(page.getByRole('banner').getByRole('combobox')).toHaveCount(0);
  await page.getByRole('link', { name: 'Persons' }).first().click();
  await expect(page.getByRole('button', { name: 'New person' })).toBeVisible();
  await expect(page.getByText(/^\d+ persons?$/)).toBeVisible();

  // German
  await chooseLanguage(page, 'Deutsch');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.getByRole('link', { name: 'Personen' }).first()).toBeVisible();

  // Russian incl. plural form
  await chooseLanguage(page, 'Русский');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page).toHaveTitle('Cognatio - Семейное древо');
  await page.getByRole('navigation').getByRole('link', { name: 'Люди' }).click();
  await expect(page.getByRole('heading', { name: 'Люди' })).toBeVisible();
  await expect(page.getByText(/^\d+ человека?$/)).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /Корзина/ })
    .click();
  await expect(page.getByRole('heading', { name: 'Корзина' })).toBeVisible();

  // The choice is kept after reloading
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
});

test.describe('system language', () => {
  test.describe('German system', () => {
    test.use({ locale: 'de-DE' });
    test('the first start uses the language of the operating system, "same as the operating system" is offered', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.locator('html')).toHaveAttribute('lang', 'de');
      await expect(page.locator('#settings-language')).toHaveValue('system');
    });
  });

  test.describe('Japanese system (not translated)', () => {
    test.use({ locale: 'ja-JP' });
    test('falls back to English', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    });
  });
});
