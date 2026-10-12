import { test, expect } from '@playwright/test';
import { createPerson, gql, openPersonTab, PNG_1x1, uid } from './helpers';

test('Upload a profile picture directly when creating a person', async ({ page, request }) => {
  const name = `Ella${uid()}`;
  await page.goto('/persons');
  await page.getByRole('button', { name: 'Neue Person' }).click();
  const dialog = page.getByRole('dialog', { name: 'Neue Person anlegen' });
  await dialog.getByRole('textbox', { name: /Vorname/ }).fill(name);
  await dialog.getByTestId('profile-picture-input').setInputFiles({ name: 'ella.png', mimeType: 'image/png', buffer: PNG_1x1 });
  await expect(dialog.getByText('„ella.png“ wird beim Speichern hochgeladen.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Erstellen', exact: true }).click();
  await expect(dialog).toBeHidden();

  // The image is among the person's media and is the profile picture
  const { getPersons } = await gql<{ getPersons: { id: string; firstName: string; profilePictureId: string | null }[] }>(
    request,
    '{ getPersons { id firstName profilePictureId } }',
  );
  const person = getPersons.find((p) => p.firstName === name)!;
  expect(person.profilePictureId).toBeTruthy();
  await openPersonTab(page, person.id, 'Medien');
  await expect(page.getByTitle('ella.png', { exact: true })).toBeVisible();
  await expect(page.getByText('Profilbild', { exact: true })).toBeVisible();
});

test('Link an event with a new file and the group photo of another person', async ({ page, request }) => {
  const suffix = uid();
  const annaId = await createPerson(request, { firstName: `Anna${suffix}`, lastName: 'Umzug' });
  const karlId = await createPerson(request, { firstName: `Karl${suffix}`, lastName: 'Umzug' });

  // The group photo belongs to Karl
  const upload = await request.post('/api/v1/media/upload', {
    multipart: { personId: karlId, type: 'PHOTO', file: { name: 'groupPhoto.png', mimeType: 'image/png', buffer: PNG_1x1 } },
  });
  expect(upload.ok()).toBeTruthy();

  await openPersonTab(page, annaId, 'Lebenslauf');
  await page.getByRole('button', { name: 'Ereignis hinzufügen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ereignis hinzufügen' });
  await dialog.getByLabel('Titel').fill('Umzug nach Köln');
  await dialog.getByLabel('Kategorie').selectOption('MOVE');

  // New file (belongs to Anna) and an existing photo of another person
  await dialog.getByTestId('event-media-input').setInputFiles({ name: 'lageplan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
  await dialog.getByRole('button', { name: 'Vorhandene verknüpfen' }).click();
  await expect(dialog.getByText('Keine Medien vorhanden.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Medien anderer Personen' }).click();
  await dialog.getByRole('option', { name: new RegExp(`Karl${suffix} Umzug`) }).click();
  await dialog.getByRole('button', { name: /groupPhoto\.png/ }).click();
  await expect(dialog.getByText(`von Karl${suffix} Umzug`, { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog).toBeHidden();

  // The life events show both files, the foreign one with its owner; each opens and can be saved
  const files = page.getByRole('list', { name: 'Dateien' });
  await expect(files.getByRole('link')).toHaveCount(4);
  await expect(files.getByRole('link', { name: 'lageplan.pdf', exact: true })).toBeVisible();
  await expect(files.getByRole('link', { name: `groupPhoto.png (von Karl${suffix} Umzug)`, exact: true })).toBeVisible();
  await expect(files.getByRole('link', { name: 'Herunterladen: lageplan.pdf' })).toHaveAttribute('href', /\/api\/v1\/media\/.+\/download/);

  // Media tab: own file with its link, the group photo under "linked media of other persons"
  await openPersonTab(page, annaId, 'Medien');
  await expect(page.getByTitle('lageplan.pdf', { exact: true })).toBeVisible();
  await expect(page.getByText('Verknüpft mit: Umzug nach Köln').first()).toBeVisible();
  const linked = page.getByRole('region', { name: 'Verknüpfte Medien anderer Personen' });
  await expect(linked.getByRole('link', { name: 'groupPhoto.png', exact: true })).toBeVisible();

  // The download gives the file under its original name
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Herunterladen: lageplan.pdf' }).click();
  expect((await download).suggestedFilename()).toBe('lageplan.pdf');

  // For Karl the photo stays his own medium and shows the link to Anna's event
  await openPersonTab(page, karlId, 'Medien');
  await expect(page.getByText('Verknüpft mit: Umzug nach Köln')).toBeVisible();
});

test('Media can be shown as tiles or as a list; the choice is remembered', async ({ page, request }) => {
  const id = uid();
  const personId = await createPerson(request, { firstName: `Medien${id}`, lastName: 'Liste' });
  for (const name of ['erstes.png', 'zweites.png']) {
    const upload = await request.post('/api/v1/media/upload', {
      multipart: { file: { name, mimeType: 'image/png', buffer: PNG_1x1 }, personId, type: 'PHOTO' },
    });
    expect(upload.ok()).toBeTruthy();
  }

  await openPersonTab(page, personId, 'Medien');
  await expect(page.getByRole('button', { name: 'Kacheln' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('list')).toHaveCount(0);

  await page.getByRole('button', { name: 'Liste' }).click();
  const rows = page.getByRole('list').getByRole('listitem');
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: 'erstes.png' })).toBeVisible();

  // Kept after reloading
  await page.reload();
  await page.getByRole('navigation', { name: 'Bereiche der Person' }).getByRole('button', { name: 'Medien' }).click();
  await expect(page.getByRole('button', { name: 'Liste' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('list').getByRole('listitem')).toHaveCount(2);
});
