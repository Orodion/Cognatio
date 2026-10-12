import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

// Start like a first visit: the language is set per test
test.use({ storageState: { cookies: [], origins: [] } });

const localesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/src/i18n/locales');
const languages = fs
  .readdirSync(localesDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace('.json', ''));
// Untranslated keys show up as their key, e.g. "tree.toolbar" – so look for the top-level namespaces of the reference language
const namespaces = Object.keys(JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8')));
// String.raw: in a plain template literal \b would be a backspace and \. a dot, and the pattern would never match
const rawKey = new RegExp(String.raw`\b(${namespaces.join('|')})\.[a-z][A-Za-z]+(\.[A-Za-z]+)*\b`);

const pages = ['/', '/persons', '/tree', '/family-trees', '/statistics', '/import-export', '/trash', '/settings', '/help'];

for (const language of languages) {
  test(`Language ${language}: pages render without raw translation keys`, async ({ page }) => {
    await page.addInitScript((code) => {
      localStorage.setItem('cognatio-language', code);
      // All blocks of the settings page open, so their texts are checked as well
      localStorage.setItem(
        'cognatio-settings',
        JSON.stringify({ state: { openSections: ['fontColors', 'treeAppearance', 'treeBehaviour', 'data'] }, version: 0 }),
      );
    }, language);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    for (const url of pages) {
      await page.goto(url);
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.getByRole('main')).toBeVisible();
      // Wait until the lazy page has replaced its loading state
      await page.waitForLoadState('networkidle');
      const text = await page.locator('body').innerText();
      expect(text.match(rawKey)?.[0], `raw key on ${url}`).toBeUndefined();
    }
    expect(errors).toEqual([]);
  });
}
