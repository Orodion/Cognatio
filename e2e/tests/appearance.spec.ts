import { test, expect, type Page } from '@playwright/test';
import { createPerson, createRelation, uid } from './helpers';

// The appearance is stored in the browser; every test starts with a fresh one (see storageState in the config)
const choose = (page: Page, label: string, value: string, exact = true) => page.getByLabel(label, { exact }).selectOption(value);
const html = (page: Page) => page.locator('html');

test('Font, font size and accent colour apply to the whole app and are kept', async ({ page }) => {
  await page.goto('/settings#fontColors');
  await expect(page.getByRole('button', { name: 'Schrift und Farben' })).toHaveAttribute('aria-expanded', 'true');
  const fontFamily = () => page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily);
  expect(await fontFamily()).toContain('Inter');

  await choose(page, 'Schriftart', 'serif');
  await expect(html(page)).toHaveAttribute('data-font', 'serif');
  expect(await fontFamily()).toContain('Source Serif');

  await choose(page, 'Schriftart', 'readable');
  expect(await fontFamily()).toContain('Atkinson');

  await choose(page, 'Schriftart', 'mono');
  expect(await fontFamily()).toMatch(/mono|Consolas/i);

  const rootSize = () => html(page).evaluate((el) => getComputedStyle(el).fontSize);
  expect(await rootSize()).toBe('16px');
  await choose(page, 'Schriftgröße', 'large');
  expect(await rootSize()).toBe('18px');
  await choose(page, 'Schriftgröße', 'small');
  expect(await rootSize()).toBe('14.4px');

  const primary = () => html(page).evaluate((el) => getComputedStyle(el).getPropertyValue('--primary').trim());
  const green = await primary();
  await choose(page, 'Akzentfarbe', 'blue');
  await expect(html(page)).toHaveAttribute('data-accent', 'blue');
  expect(await primary()).toBe('217 70% 38%');
  expect(await primary()).not.toBe(green);

  // Kept after reloading (also on other pages)
  await page.goto('/persons');
  await expect(html(page)).toHaveAttribute('data-font', 'mono');
  await expect(html(page)).toHaveAttribute('data-font-size', 'small');
  await expect(html(page)).toHaveAttribute('data-accent', 'blue');

  // Reset
  await page.goto('/settings#fontColors');
  await page.getByRole('button', { name: 'Auf Standard zurücksetzen' }).click();
  for (const attribute of ['data-font', 'data-font-size', 'data-accent']) {
    await expect(html(page)).not.toHaveAttribute(attribute, /.*/);
  }
  expect(await fontFamily()).toContain('Inter');
});

test('Lines, cards and colours of the family tree follow the settings', async ({ page, request }) => {
  const id = uid();
  const person = (firstName: string, gender: 'MALE' | 'FEMALE') => createPerson(request, { firstName: `${firstName}${id}`, lastName: 'Aussehen', gender });
  const vater = await person('Vater', 'MALE');
  const mutter = await person('Mutter', 'FEMALE');
  const kind = await person('Kind', 'MALE');
  await createRelation(request, vater, mutter, 'WIFE');
  await createRelation(request, vater, kind, 'CHILD');

  await page.goto('/settings#treeAppearance');
  // Defaults are curved, 3 px, solid – change all of them
  await choose(page, 'Linienart', 'straight');
  await choose(page, 'Linienstärke', '2');
  await choose(page, 'Partnerlinie', 'dotted');
  await choose(page, 'Kachelgröße', 'compact');
  await choose(page, 'Rahmenstärke', '3');
  await choose(page, 'Rahmen männlich', 'purple');
  await choose(page, 'Hintergrund', 'grid');
  await choose(page, 'Schriftart im Stammbaum', 'serif');

  // The preview shows the same
  const preview = page.getByTestId('appearance-preview');
  await expect(preview.locator('[data-line="family"]')).toHaveAttribute('d', / L /);
  await expect(preview.locator('[data-line="partner"]')).toHaveAttribute('stroke-width', '2');

  await page.goto(`/tree?person=${vater}`);
  const cards = page.getByTestId('person-card');
  await expect(cards).toHaveCount(3);
  await expect(page.locator('.react-flow__background')).toHaveCount(1);

  // Family line: straight and 2 px; partner line: dotted
  const paths = await page
    .locator('.react-flow__edge-path')
    .evaluateAll((els) => els.map((el) => ({ d: el.getAttribute('d'), width: getComputedStyle(el).strokeWidth, dash: getComputedStyle(el).strokeDasharray })));
  expect(paths.some((p) => p.d?.includes(' L ') && p.width === '2px')).toBe(true);
  expect(paths.some((p) => p.dash !== 'none' && p.dash.startsWith('1'))).toBe(true);

  // Cards: border width, colour by gender, font
  // (the focus person Vater has the highlight border, so look at the child)
  const kindCard = cards.filter({ hasText: `Kind${id}` });
  const border = await kindCard.evaluate((el) => ({
    width: getComputedStyle(el).borderTopWidth,
    color: getComputedStyle(el).borderTopColor,
    font: getComputedStyle(el).fontFamily,
  }));
  expect(border.width).toBe('3px');
  expect(border.color).toBe('rgb(168, 85, 247)');
  expect(border.font).toContain('Source Serif');

  // Photo and dates can be hidden
  await page.goto('/settings#treeAppearance');
  await page.getByLabel('Foto anzeigen').uncheck();
  await page.goto(`/tree?person=${vater}`);
  await expect(page.getByTestId('person-card').first().locator('svg.lucide-user')).toHaveCount(0);

  await page.goto('/settings#treeAppearance');
  await page.getByRole('button', { name: 'Auf Standard zurücksetzen' }).click();
  await page.goto(`/tree?person=${vater}`);
  await expect(page.locator('.react-flow__background')).toHaveCount(0);
  await expect(page.getByTestId('person-card').first().locator('svg.lucide-user')).toHaveCount(1);
});

test('The tree background is off by default and can be switched to dots or a grid', async ({ page, request }) => {
  const id = uid();
  const person = await createPerson(request, { firstName: `Hintergrund${id}`, lastName: 'Test' });
  const background = page.locator('.react-flow__background');

  await page.goto(`/tree?person=${person}`);
  await expect(page.getByTestId('family-tree')).toBeVisible();
  await expect(background).toHaveCount(0);

  await page.goto('/settings#treeAppearance');
  await expect(page.getByLabel('Hintergrund')).toHaveValue('none');
  await choose(page, 'Hintergrund', 'grid');
  await page.goto(`/tree?person=${person}`);
  await expect(background.locator('path')).toHaveCount(1);

  await page.goto('/settings#treeAppearance');
  await choose(page, 'Hintergrund', 'dots');
  await page.goto(`/tree?person=${person}`);
  await expect(background.locator('circle')).toHaveCount(1);
});
