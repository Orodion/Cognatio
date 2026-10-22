import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PNG_1x1, createPerson, createRelation, gql, uid } from './helpers';

// Automatic WCAG 2.1 AA check (axe-core) of the main pages and dialogs – in light and dark mode
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function audit(page: Page, name: string) {
  // Only check once fade-ins (dialog, theme switch) have finished – otherwise axe measures intermediate colours
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.map((v) => ({
    page: name,
    rule: v.id,
    impact: v.impact,
    count: v.nodes.length,
    help: v.help,
    targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
    colors:
      v.id === 'color-contrast'
        ? [
            ...new Set(
              v.nodes.map((n) => {
                const d = n.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined;
                return d ? `${d.fgColor} auf ${d.bgColor} = ${d.contrastRatio}` : '?';
              }),
            ),
          ]
        : undefined,
    detail: v.nodes[0]?.failureSummary?.split('\n').slice(0, 3).join(' | '),
  }));
  return summary;
}

test('Main pages and dialogs without WCAG 2.1 AA violations (light and dark)', async ({ page, request }) => {
  const backup = await (await request.get('/api/v1/backup')).body();
  test.setTimeout(180_000);
  const id = uid();
  const person = await createPerson(request, { firstName: `Alma${id}`, lastName: 'Zugang', gender: 'FEMALE' });
  const kind = await createPerson(request, { firstName: `Ben${id}`, lastName: 'Zugang', gender: 'MALE' });
  await createRelation(request, person, kind, 'CHILD');
  await gql(request, 'mutation($data: EventInput!) { createEvent(data: $data) { id } }', {
    data: { personId: person, title: 'Taufe', category: 'BAPTISM', date: '1990' },
  });
  await gql(request, 'mutation($data: NoteInput!) { createNote(data: $data) { id } }', { data: { personId: person, text: 'Notiz' } });
  await request.post('/api/v1/media/upload', {
    multipart: { file: { name: 'bild.png', mimeType: 'image/png', buffer: PNG_1x1 }, personId: person, type: 'PROFILE_PICTURE' },
  });

  const all: Awaited<ReturnType<typeof audit>> = [];
  const check = async (name: string) => all.push(...(await audit(page, name)));

  for (const mode of ['hell', 'dunkel'] as const) {
    await page.goto('/');
    if (mode === 'dunkel') await page.getByRole('button', { name: 'Dunkelmodus' }).click();
    await expect(page.getByText('Personen gesamt')).toBeVisible();
    await check(`${mode}: Dashboard`);

    await page.goto('/persons');
    await expect(page.locator('main a[href^="/persons/"]').first()).toBeVisible();
    await check(`${mode}: Personenliste`);

    await page.getByRole('button', { name: 'Neue Person' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await check(`${mode}: Dialog Person anlegen`);
    // With the hint about a possible duplicate (same name as the person just created)
    await page
      .getByRole('dialog')
      .getByRole('textbox', { name: /Vorname/ })
      .fill(`Alma${id}`);
    await page.getByRole('dialog').getByLabel('Nachname').fill('Zugang');
    await expect(page.getByText('Gibt es diese Person schon?')).toBeVisible();
    await check(`${mode}: Dialog Person anlegen – Dublettenhinweis`);
    await page.keyboard.press('Escape');

    for (const tab of ['Übersicht', 'Lebenslauf', 'Beziehungen', 'Notizen', 'Medien', 'Quellen']) {
      await page.goto(`/persons/${person}`);
      await page.getByRole('navigation', { name: 'Bereiche der Person' }).getByRole('button', { name: tab }).click();
      await page.waitForLoadState('networkidle');
      await check(`${mode}: Person – ${tab}`);
    }
    await page.getByRole('navigation', { name: 'Bereiche der Person' }).getByRole('button', { name: 'Beziehungen' }).click();
    await page.getByRole('button', { name: 'Beziehung hinzufügen' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await check(`${mode}: Dialog Beziehung`);
    await page.keyboard.press('Escape');

    await page.getByRole('navigation', { name: 'Bereiche der Person' }).getByRole('button', { name: 'Quellen' }).click();
    await page.getByRole('button', { name: 'Quelle zitieren' }).click();
    await page.getByRole('dialog').getByRole('radio', { name: 'Neue Quelle…' }).check();
    await check(`${mode}: Dialog Quelle zitieren`);
    await page.keyboard.press('Escape');

    await page.goto('/sources');
    await expect(page.getByRole('heading', { name: 'Quellen', level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await check(`${mode}: Quellen`);
    await page.getByRole('button', { name: 'Neue Quelle' }).click();
    await expect(page.getByRole('dialog', { name: 'Neue Quelle' })).toBeVisible();
    await check(`${mode}: Dialog Quelle anlegen`);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Archive' }).click();
    await page.waitForLoadState('networkidle');
    await check(`${mode}: Archive`);

    await page.goto(`/tree?person=${person}`);
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
    await check(`${mode}: Stammbaum`);

    await page.goto('/statistics');
    await expect(page.getByRole('group', { name: 'Personen' })).toBeVisible();
    await check(`${mode}: Statistiken`);
    await page.goto('/statistics?tab=names');
    await expect(page.getByRole('list', { name: 'Häufigste Nachnamen' })).toBeVisible();
    await check(`${mode}: Statistiken, Namen & Orte`);
    await page.goto('/statistics?tab=ancestors');
    await expect(page.getByRole('table', { name: 'Generationenübersicht' })).toBeVisible();
    await check(`${mode}: Statistiken, Ahnen`);

    await page.goto('/import-export');
    await expect(page.getByRole('heading', { name: 'Exportieren' })).toBeVisible();
    await check(`${mode}: Import/Export`);

    await page.goto('/family-trees');
    await expect(page.getByRole('heading', { name: 'Stammbäume', level: 1 })).toBeVisible();
    await check(`${mode}: Stammbäume`);
    await page.getByRole('button', { name: 'Neuer Stammbaum' }).click();
    await expect(page.getByRole('dialog', { name: 'Neuer Stammbaum' })).toBeVisible();
    await check(`${mode}: Dialog Stammbaum anlegen`);
    await page.keyboard.press('Escape');

    await page.goto('/help#faq');
    await expect(page.getByRole('heading', { name: 'Häufige Fragen', level: 2 })).toBeFocused();
    await check(`${mode}: Hilfe`);

    await page.goto('/trash');
    await page.waitForLoadState('networkidle');
    await check(`${mode}: Papierkorb`);

    await page.goto('/activity');
    await expect(page.getByRole('heading', { name: 'Vorgänge', level: 1 })).toBeVisible();
    await check(`${mode}: Vorgänge`);

    await page.goto('/settings');
    await expect(page.getByTestId('backend-version')).toBeVisible();
    // All blocks open so their content is checked as well
    await page.getByRole('button', { name: 'Alle aufklappen' }).click();
    await expect(page.getByTestId('appearance-preview')).toBeVisible();
    await check(`${mode}: Einstellungen`);
    // Restore with a checked file: comparison, warning, confirmation field
    await page.getByRole('button', { name: 'Backup wiederherstellen…' }).click();
    const restore = page.getByRole('dialog', { name: 'Backup wiederherstellen' });
    await restore.getByLabel('Sicherungsdatei').setInputFiles({ name: 'sicherung.zip', mimeType: 'application/zip', buffer: backup });
    await expect(restore.getByRole('table')).toBeVisible();
    await check(`${mode}: Dialog Backup wiederherstellen`);
    await page.keyboard.press('Escape');
  }

  if (all.length) console.log(JSON.stringify(all, null, 1));
  expect(all, 'WCAG-Verstöße – Details siehe Ausgabe').toEqual([]);
});

test('Bedienung per Tastatur: Sprunglink, Dialog-Fokus, Stammbaum, Lebenslauf', async ({ page, request }) => {
  const id = uid();
  const father = await createPerson(request, { firstName: `Tim${id}`, lastName: 'Tastatur', gender: 'MALE' });
  const kind = await createPerson(request, { firstName: `Tom${id}`, lastName: 'Tastatur', gender: 'MALE' });
  await createRelation(request, father, kind, 'CHILD');
  await gql(request, 'mutation($data: EventInput!) { createEvent(data: $data) { id } }', {
    data: { personId: father, title: 'Umzug', category: 'MOVE' },
  });
  const focused = () => page.evaluate(() => (document.activeElement?.closest('[role="dialog"]') ? 'dialog' : document.activeElement?.tagName));

  // The skip link is the first tab stop and leads to the content
  await page.goto('/persons');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Zum Inhalt springen' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();

  // Dialog: focus moves in, stays inside and returns to the trigger after Escape
  const trigger = page.getByRole('button', { name: 'Neue Person' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Neue Person' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: /Vorname/ })).toBeFocused();
  // More tabs than the dialog has elements: the focus cycles and never leaves the dialog
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press(i % 10 === 9 ? 'Shift+Tab' : 'Tab');
    expect(await focused()).toBe('dialog');
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  // Family tree: open a person via keyboard
  await page.goto(`/tree?person=${father}`);
  const link = page.locator('.react-flow__node').getByRole('link', { name: `Tom${id} Tastatur` });
  await expect(link).toBeVisible();
  for (let i = 0; i < 60 && !(await link.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(link).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/persons/${kind}$`));

  // Life events: the edit button is visible with keyboard focus (not only on mouse hover)
  await page.goto(`/persons/${father}`);
  await page.getByRole('navigation', { name: 'Bereiche der Person' }).getByRole('button', { name: 'Lebenslauf' }).click();
  const edit = page.getByRole('button', { name: '„Umzug“ bearbeiten' });
  await edit.focus();
  await expect(edit.locator('..')).toHaveCSS('opacity', '1');
});
