import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { unzipSync, strFromU8 } from 'fflate';
import { PNG_1x1, createPerson, createRelation, createTree, gql, removeTree, treeHeader, uid } from './helpers';

// The restore replaces all data of the test database – not in parallel with other tests
test.describe.configure({ mode: 'serial' });

const here = path.dirname(fileURLToPath(import.meta.url));
/** Location of the backup before the restore (BACKUP_DIR in playwright.config.ts) */
const BACKUP_DIR = path.join(here, '..', '.tmp', 'backups');

interface PersonRow {
  id: string;
  firstName: string;
  isDeleted: boolean;
}

const personsOf = async (request: Parameters<typeof gql>[0], tree: string) =>
  (await gql<{ getPersons: PersonRow[] }>(request, '{ getPersons(includeDeleted: true) { id firstName isDeleted } }', {}, tree)).getPersons;

test('Backup: save, change data, restore via the settings', async ({ page, request }) => {
  test.setTimeout(120_000);
  const id = uid();
  const tree = await createTree(request, `Sicherung ${id}`);
  const anna = await createPerson(request, { firstName: `Anna${id}`, lastName: 'Backup' }, tree);
  const bert = await createPerson(request, { firstName: `Bert${id}`, lastName: 'Backup' }, tree);
  await createRelation(request, anna, bert, 'WIFE', tree);
  const upload = await request.post('/api/v1/media/upload', {
    headers: treeHeader(tree),
    multipart: { file: { name: 'portrait.png', mimeType: 'image/png', buffer: PNG_1x1 }, personId: anna, type: 'PROFILE_PICTURE' },
  });
  expect(upload.ok()).toBeTruthy();

  try {
    // Back up via the settings
    await page.goto('/settings#data');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Backup herunterladen' }).click()]);
    expect(download.suggestedFilename()).toMatch(/^cognatio_backup_\d{8}_\d{6}\.zip$/);
    const backupFile = await download.path();
    await expect(page.getByText(/Gespeichert als cognatio_backup_/)).toBeVisible();

    // After the backup: Bert into the recycle bin, Carl and another family tree new
    await gql(request, 'mutation($id: ID!) { deletePerson(id: $id) }', { id: bert }, tree);
    await createPerson(request, { firstName: `Carl${id}`, lastName: 'Backup' }, tree);
    const extraTree = await createTree(request, `Nach Sicherung ${id}`);

    // Restore: the file is checked, confirmation by word, the current state is downloaded first
    await page.getByRole('button', { name: 'Backup wiederherstellen…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Backup wiederherstellen' });
    await dialog.getByLabel('Sicherungsdatei').setInputFiles({ name: 'sicherung.zip', mimeType: 'application/zip', buffer: fs.readFileSync(backupFile) });
    await expect(dialog.getByRole('table', { name: 'Aktueller Bestand und Inhalt der Sicherung' })).toBeVisible();
    await expect(dialog.getByRole('alert')).toContainText('Alle aktuellen Daten werden gelöscht');
    const submit = dialog.getByRole('button', { name: 'Wiederherstellen', exact: true });
    const confirm = dialog.getByLabel('Zum Bestätigen „LÖSCHEN“ eintippen');
    await expect(submit).toBeDisabled();
    await confirm.fill('ja');
    await expect(submit).toBeDisabled();
    await confirm.fill('löschen');
    await expect(dialog.getByLabel('Aktuellen Stand zusätzlich herunterladen')).toBeChecked();
    const [before] = await Promise.all([page.waitForEvent('download'), submit.click()]);
    expect(before.suggestedFilename()).toMatch(/^cognatio_backup_/);

    await expect(dialog.getByText(/Die Sicherung wurde wiederhergestellt/)).toBeVisible({ timeout: 60_000 });
    const safety = (await dialog.getByText(/cognatio_before_restore_/).textContent())!.match(/cognatio_before_restore_\d{8}_\d{6}\.zip/)![0];
    expect(fs.existsSync(path.join(BACKUP_DIR, safety))).toBe(true);
    await dialog.getByRole('button', { name: 'Schließen' }).click();
    await expect(dialog).toBeHidden();

    // State of the backup: Bert is back, Carl and the new family tree are gone, the profile picture is served
    const persons = await personsOf(request, tree);
    expect(persons.map((p) => [p.firstName, p.isDeleted]).sort()).toEqual([
      [`Anna${id}`, false],
      [`Bert${id}`, false],
    ]);
    const { familyTrees } = await gql<{ familyTrees: { id: string }[] }>(request, '{ familyTrees { id } }');
    expect(familyTrees.map((t) => t.id)).toContain(tree);
    expect(familyTrees.map((t) => t.id)).not.toContain(extraTree);
    const { getPerson } = await gql<{ getPerson: { profilePictureUrl: string | null } }>(
      request,
      'query($id: ID!) { getPerson(id: $id) { profilePictureUrl } }',
      { id: anna },
      tree,
    );
    expect(getPerson.profilePictureUrl).toMatch(/^\/uploads\//);
    expect((await request.get(getPerson.profilePictureUrl!)).ok()).toBeTruthy();

    // Exactly the saved state – with the same ids and timestamps: a new backup contains the same data
    const dataJson = (zip: Buffer) => strFromU8(unzipSync(new Uint8Array(zip))['data.json']);
    const again = await request.get('/api/v1/backup');
    expect(dataJson(await again.body())).toBe(dataJson(fs.readFileSync(backupFile)));

    // Afterwards the app works with the restored data
    await page.getByRole('link', { name: 'Personen' }).click();
    await expect(page.getByRole('heading', { name: 'Personen', level: 1 })).toBeVisible();
  } finally {
    await removeTree(request, tree);
  }
});

test('Backup: restore without confirmation and an export instead of a backup are rejected', async ({ page, request }) => {
  const backup = await request.get('/api/v1/backup');
  expect(backup.ok()).toBeTruthy();
  const file = { name: 'sicherung.zip', mimeType: 'application/zip', buffer: await backup.body() };
  const unconfirmed = await request.post('/api/v1/backup/restore', { multipart: { file } });
  expect(unconfirmed.status()).toBe(400);
  expect((await unconfirmed.json()).reason).toBe('RESTORE_NOT_CONFIRMED');

  // An export of a single family tree belongs in "Import/Export"
  const exported = await request.get('/api/v1/export/zip');
  await page.goto('/settings#data');
  await page.getByRole('button', { name: 'Backup wiederherstellen…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Backup wiederherstellen' });
  await dialog.getByLabel('Sicherungsdatei').setInputFiles({ name: 'export.zip', mimeType: 'application/zip', buffer: await exported.body() });
  await expect(dialog.getByRole('alert')).toContainText('keine Datensicherung');
  await expect(dialog.getByRole('button', { name: 'Wiederherstellen', exact: true })).toHaveCount(0);
});
