import fs from 'node:fs';
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { unzipSync, strFromU8, zipSync, strToU8 } from 'fflate';
import { PNG_1x1, createPerson, createRelation, gql, importViaApi, uid } from './helpers';

// The tests replace or extend all data of the test database and therefore run one after another
test.describe.configure({ mode: 'serial' });

// Export/import work with all data, and the GEDCOM test doubles it with every run.
// So the database (used for tests only, protected by the name check) does not grow without limit,
// it is reset to a single person beforehand via the app's own import.
async function resetData(request: APIRequestContext) {
  const now = new Date().toISOString();
  const data = {
    format: 'cognatio-export',
    version: 1,
    exportedAt: now,
    persons: [{ id: 'e2e-startwert', firstName: 'Startwert', createdAt: now, updatedAt: now }],
    relations: [],
  };
  await importViaApi(request, Buffer.from(zipSync({ 'persons.json': strToU8(JSON.stringify(data)) })), { strategy: 'OVERWRITE' });
}
test.beforeAll(({ request }) => resetData(request));

interface ExportJson {
  exportedAt: string;
  persons: {
    id: string;
    firstName: string;
    updatedAt: string;
    profilePictureId: string | null;
    birthPlace?: string | null;
    isDeleted: boolean;
    events: { id: string; title: string }[];
    notes: { id: string; text: string }[];
    media: { id: string; path: string }[];
  }[];
  relations: { id: string; personAId: string; personBId: string; type: string }[];
}

const readExport = (zip: Buffer) => {
  const entries = unzipSync(new Uint8Array(zip));
  return { json: JSON.parse(strFromU8(entries['persons.json'])) as ExportJson, entries };
};

async function exportZip(request: APIRequestContext) {
  const res = await request.get('/api/v1/export/zip');
  expect(res.ok()).toBeTruthy();
  return res.body();
}

/** Family with an event, a note and a profile picture */
async function createFamily(request: APIRequestContext) {
  const id = uid();
  const father = await createPerson(request, { firstName: `Hans${id}`, lastName: 'Export', gender: 'MALE' });
  const mother = await createPerson(request, { firstName: `Grete${id}`, lastName: 'Export', gender: 'FEMALE' });
  const kind = await createPerson(request, { firstName: `Kurt${id}`, lastName: 'Export', gender: 'MALE' });
  await createRelation(request, father, mother, 'WIFE');
  await createRelation(request, father, kind, 'CHILD');
  await gql(request, 'mutation($data: EventInput!) { createEvent(data: $data) { id } }', {
    data: { personId: kind, title: 'Taufe', category: 'BAPTISM', date: 'um 1990', datePrecision: 'APPROXIMATE', place: 'Köln' },
  });
  await gql(request, 'mutation($data: NoteInput!) { createNote(data: $data) { id } }', { data: { personId: kind, text: 'Notiz\nmit zwei Zeilen' } });
  const upload = await request.post('/api/v1/media/upload', {
    multipart: { file: { name: 'portrait.png', mimeType: 'image/png', buffer: PNG_1x1 }, personId: kind, type: 'PROFILE_PICTURE' },
  });
  expect(upload.ok()).toBeTruthy();
  return { id, father, mother, kind };
}

/** Import a file into the open family tree – otherwise the app suggests a new one for GEDCOM files */
async function chooseFile(page: Page, name: string, buffer: Buffer) {
  await page.getByLabel('Datei auswählen').setInputFiles({ name, mimeType: 'application/octet-stream', buffer });
  await expect(page.getByRole('heading', { name: 'Geplante Änderungen' })).toBeVisible();
  const current = page.getByLabel(/den geöffneten Stammbaum/);
  if (!(await current.isChecked())) {
    // Another target: the preview is recalculated
    const preview = page.waitForResponse('**/api/v1/import/preview');
    await current.check();
    await preview;
    await expect(page.getByRole('heading', { name: 'Geplante Änderungen' })).toBeVisible();
  }
}

const summaryValue = (page: Page, label: string) => page.getByTestId('import-summary').first().locator('li', { hasText: label }).locator('span').last();

test('ZIP export and import with overwrite restore all data', async ({ page, request }) => {
  const family = await createFamily(request);

  // Export via the UI
  await page.goto('/import-export');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'ZIP herunterladen' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^family_tree_[A-Za-z0-9_]+_\d{8}_\d{6}\.zip$/);
  const zip = fs.readFileSync((await download.path())!);
  const before = readExport(zip);
  const kindBefore = before.json.persons.find((p) => p.id === family.kind)!;
  expect(kindBefore.media).toHaveLength(1);
  expect(kindBefore.media[0].path).toMatch(new RegExp(`^media/Export_Kurt${family.id}_[0-9a-f]{8}/export_kurt${family.id}_profile_picture_1\\.png$`));
  expect(before.entries[kindBefore.media[0].path]).toBeTruthy();

  // Change the data: delete a person (recycle bin) and create a new one
  await gql(request, 'mutation($id: ID!) { deletePerson(id: $id) }', { id: family.mother });
  const extra = await createPerson(request, { firstName: `Extra${family.id}` });

  // Import with overwrite
  await page.reload();
  await chooseFile(page, download.suggestedFilename(), zip);
  await expect(page.getByText(/Sicherung herunterladen/).first()).toBeVisible();
  await page.getByLabel(/^Überschreiben/).check();
  await expect(summaryValue(page, 'Gelöschte Personen')).toHaveText(String(before.json.persons.length + 1));
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Import ausführen' }).click();
  await expect(page.getByText('Import abgeschlossen.')).toBeVisible();

  // The repeated export matches the original (ids, content, timestamps) – except for new media paths
  const after = readExport(await exportZip(request)).json;
  const strip = (data: ExportJson) =>
    data.persons.map((p) => ({ ...p, media: p.media.map((m) => ({ ...m, path: undefined })) })).sort((a, b) => a.id.localeCompare(b.id));
  expect(strip(after)).toEqual(strip(before.json));
  expect(after.relations.sort((a, b) => a.id.localeCompare(b.id))).toEqual(before.json.relations.sort((a, b) => a.id.localeCompare(b.id)));
  expect(after.persons.some((p) => p.id === extra)).toBe(false);

  // The profile picture is back and loads
  await page.goto(`/persons/${family.kind}`);
  const img = page.getByRole('button', { name: 'Profilbild hochladen' }).locator('img');
  await expect(img).toHaveAttribute('src', /^\/uploads\//);
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
});

test('Merge: decide conflicts manually', async ({ page, request }) => {
  const { id, kind } = await createFamily(request);
  const zip = await exportZip(request);

  // Changed after the export – the existing data is therefore newer than the file
  await gql(request, 'mutation($id: ID!, $data: PersonInput!) { updatePerson(id: $id, data: $data) { id } }', {
    id: kind,
    data: { firstName: `Kurt${id}`, lastName: 'Export', birthPlace: 'Bonn' },
  });

  await page.goto('/import-export');
  await chooseFile(page, 'sicherung.zip', zip);
  // Newer wins: the changed data stays
  await expect(summaryValue(page, 'Konflikte – Bestand bleibt')).toHaveText('1');

  await page.getByLabel(/^Zusammenführen – manuell entscheiden/).check();
  const conflict = page.getByRole('listitem', { name: `Kurt${id} Export` });
  await expect(conflict.getByRole('row', { name: /Geburtsort/ })).toContainText('Bonn');
  await expect(conflict.getByText('Vorhandene Daten sind neuer')).toBeVisible();
  await conflict.getByLabel('Aus Datei übernehmen').check();
  await expect(summaryValue(page, 'Aktualisierte Personen')).toHaveText('1');
  await page.getByRole('button', { name: 'Import ausführen' }).click();
  await expect(page.getByText('Import abgeschlossen.')).toBeVisible();

  const { getPerson } = await gql<{ getPerson: { birthPlace: string | null } }>(request, 'query($id: ID!) { getPerson(id: $id) { birthPlace } }', { id: kind });
  expect(getPerson.birthPlace).toBeNull();
});

test('GEDCOM with media: a repeated import creates nothing twice, foreign files are matched by name and birth year', async ({ page, request }) => {
  const { id, father, mother, kind } = await createFamily(request);
  // Birth years: basis of the recognition for files without identifiers
  for (const [pid, firstName, birthDate, birthDatePrecision] of [
    [father, `Hans${id}`, '1950', 'YEAR'],
    [mother, `Grete${id}`, '02.03.1952', 'EXACT'],
    [kind, `Kurt${id}`, '1990', 'YEAR'],
  ]) {
    await gql(request, 'mutation($id: ID!, $data: PersonInput!) { updatePerson(id: $id, data: $data) { id } }', {
      id: pid,
      data: { firstName, lastName: 'Export', birthDate, birthDatePrecision },
    });
  }

  // Export as GEDZIP (GEDCOM 7.0 with images)
  await page.goto('/import-export');
  await page.getByLabel('Version').selectOption('7.0');
  await page.getByLabel(/Mit Bildern und Dokumenten/).check();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'GEDCOM herunterladen' }).click()]);
  expect(download.suggestedFilename()).toMatch(/_gedcom70\.gdz$/);
  const gdz = fs.readFileSync((await download.path())!);
  const entries = unzipSync(new Uint8Array(gdz));
  const ged = strFromU8(entries['gedcom.ged']);
  expect(ged).toContain(`1 NAME Kurt${id} /Export/`);
  expect(ged).toContain(`1 UID ${kind}`);
  const file = ged.match(/^1 FILE (.+)$/m)![1].trim();
  expect(entries[file]).toBeTruthy();

  // Import the same file again: all persons are recognised
  await chooseFile(page, 'familie.gdz', gdz);
  await expect(page.getByText(/Personen der Datei sind bereits vorhanden/)).toBeVisible();
  await expect(summaryValue(page, 'Neue Personen')).toHaveText('0');
  await page.getByRole('button', { name: 'Import ausführen' }).click();
  await expect(page.getByText('Import abgeschlossen.')).toBeVisible();

  const kurts = async () =>
    (await gql<{ getPersons: { id: string; firstName: string }[] }>(request, '{ getPersons { id firstName } }')).getPersons.filter(
      (p) => p.firstName === `Kurt${id}`,
    );
  expect(await kurts()).toHaveLength(1);

  // File of another program: without identifiers and change dates, Kurt with a new occupation
  const foreign = [
    '0 HEAD',
    '1 SOUR Ahnenprogramm',
    '1 GEDC',
    '2 VERS 5.5.1',
    '1 CHAR UTF-8',
    '0 @I1@ INDI',
    `1 NAME Hans${id} /Export/`,
    '1 SEX M',
    '1 BIRT',
    '2 DATE 1950',
    '0 @I2@ INDI',
    `1 NAME Grete${id} /Export/`,
    '1 SEX F',
    '1 BIRT',
    '2 DATE 2 MAR 1952',
    '0 @I3@ INDI',
    `1 NAME Kurt${id} /Export/`,
    '1 SEX M',
    '1 BIRT',
    '2 DATE 1990',
    '1 OCCU Tischler',
    '1 BAPM',
    '2 DATE ABT 1990',
    '2 PLAC Köln',
    '1 NOTE Notiz',
    '2 CONT mit zwei Zeilen',
    '0 @F1@ FAM',
    '1 HUSB @I1@',
    '1 WIFE @I2@',
    '1 MARR',
    '1 CHIL @I3@',
    '0 TRLR',
  ].join('\r\n');
  await chooseFile(page, 'fremd.ged', Buffer.from(foreign));
  await expect(page.getByText(/davon 3 über Name und Geburtsjahr erkannt/)).toBeVisible();
  await expect(summaryValue(page, 'Neue Personen')).toHaveText('0');
  await expect(summaryValue(page, 'Aktualisierte Personen')).toHaveText('1');
  await page.getByRole('button', { name: 'Import ausführen' }).click();
  await expect(page.getByText('Import abgeschlossen.')).toBeVisible();

  expect(await kurts()).toHaveLength(1);
  const { getPerson } = await gql<{ getPerson: { occupation: string; profilePictureUrl: string | null } }>(
    request,
    'query($id: ID!) { getPerson(id: $id) { occupation profilePictureUrl } }',
    { id: kind },
  );
  // New occupation from the file, the profile picture (not contained in the file) stays
  expect(getPerson.occupation).toBe('Tischler');
  expect(getPerson.profilePictureUrl).toMatch(/^\/uploads\//);
  const { getEvents, getNotes } = await gql<{ getEvents: unknown[]; getNotes: unknown[] }>(
    request,
    'query($id: ID!) { getEvents(personId: $id) { id } getNotes(personId: $id) { id } }',
    { id: kind },
  );
  expect(getEvents).toHaveLength(1);
  expect(getNotes).toHaveLength(1);

  // Both imports are in the history; the same content is recognised next time
  const history = page.getByRole('table').filter({ hasText: 'Stand der Datei' });
  await expect(history.getByRole('row').filter({ hasText: 'familie.gdz' }).first()).toBeVisible();
  await expect(history.getByRole('row').filter({ hasText: 'fremd.ged' }).first()).toContainText('Zusammenführen');
  await chooseFile(page, 'nochmal.ged', Buffer.from(foreign));
  await expect(page.getByText(/Diese Datei wurde bereits am .* importiert/)).toBeVisible();

  // Faulty file: understandable message, no changes
  await page.getByLabel('Datei auswählen').setInputFiles({ name: 'kaputt.zip', mimeType: 'application/zip', buffer: Buffer.from('PK kaputt') });
  await expect(page.getByRole('alert')).toContainText('Die ZIP-Datei ist beschädigt');
});

test('Merge (newer wins): adds new persons and relations, keeps newer existing data', async ({ page, request }) => {
  const { id, kind } = await createFamily(request);
  const entries = unzipSync(new Uint8Array(await exportZip(request)));
  const data = JSON.parse(strFromU8(entries['persons.json'])) as ExportJson & {
    persons: Array<Record<string, unknown>>;
    relations: Array<Record<string, unknown>>;
  };

  // File content: an older version of Kurt with another birthplace, plus a new person who is Kurt's child
  const old = '2000-01-01T00:00:00.000Z';
  const now = new Date().toISOString();
  const kurt = data.persons.find((p) => p.id === kind)!;
  kurt.birthPlace = 'Dateiort';
  kurt.updatedAt = old;
  const newId = `e2e-neu-${id}`;
  data.persons.push({
    id: newId,
    firstName: `Neu${id}`,
    lastName: 'Export',
    gender: 'FEMALE',
    languages: [],
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    events: [],
    notes: [],
    media: [],
  });
  data.relations.push({ id: `e2e-rel-${id}`, personAId: kind, personBId: newId, type: 'CHILD', active: true, createdAt: now, updatedAt: now });
  const zip = Buffer.from(zipSync({ ...entries, 'persons.json': strToU8(JSON.stringify(data)) }));

  // Existing data is newer: Kurt gets a birthplace after the "export"
  await gql(request, 'mutation($id: ID!, $data: PersonInput!) { updatePerson(id: $id, data: $data) { id } }', {
    id: kind,
    data: { firstName: `Kurt${id}`, lastName: 'Export', birthPlace: 'Bonn' },
  });

  await page.goto('/import-export');
  await chooseFile(page, 'neuere.zip', zip);
  await page.getByLabel(/^Zusammenführen – neuere gewinnen/).check();
  await expect(summaryValue(page, 'Neue Personen')).toHaveText('1');
  await expect(summaryValue(page, 'Neue Beziehungen')).toHaveText('1');
  await page.getByRole('button', { name: 'Import ausführen' }).click();
  await expect(page.getByText('Import abgeschlossen.')).toBeVisible();

  const { getPerson } = await gql<{ getPerson: { birthPlace: string | null } }>(request, 'query($id: ID!) { getPerson(id: $id) { birthPlace } }', { id: kind });
  expect(getPerson.birthPlace).toBe('Bonn');
  const { getPerson: added } = await gql<{ getPerson: { firstName: string } | null }>(request, 'query($id: ID!) { getPerson(id: $id) { firstName } }', {
    id: newId,
  });
  expect(added?.firstName).toBe(`Neu${id}`);
  const { getPersonRelations } = await gql<{ getPersonRelations: unknown[] }>(request, 'query($id: ID!) { getPersonRelations(personId: $id) { id } }', {
    id: newId,
  });
  expect(getPersonRelations).toHaveLength(1);
});

test('A file in which someone is their own ancestor is imported with a warning', async ({ page, request }) => {
  const id = uid();
  // I1 is the father of I2 and I2 the father of I1
  const ged = [
    '0 HEAD',
    '1 GEDC',
    '2 VERS 5.5.1',
    '1 CHAR UTF-8',
    '0 @I1@ INDI',
    `1 NAME Zyklus${id} /Kreis/`,
    '0 @I2@ INDI',
    `1 NAME Ring${id} /Kreis/`,
    '0 @F1@ FAM',
    '1 HUSB @I1@',
    '1 CHIL @I2@',
    '0 @F2@ FAM',
    '1 HUSB @I2@',
    '1 CHIL @I1@',
    '0 TRLR',
  ].join('\n');

  await page.goto('/import-export');
  await chooseFile(page, 'kreis.ged', Buffer.from(ged));
  const warning = page.getByTestId('import-cycles');
  await expect(warning).toContainText('Kreis in den Eltern-Kind-Beziehungen');
  await expect(warning).toContainText(`Zyklus${id} Kreis`);
  await expect(warning).toContainText(`Ring${id} Kreis`);
  await page.getByRole('button', { name: 'Import ausführen' }).click();
  await expect(page.getByText('Import abgeschlossen.')).toBeVisible();

  // Other test files work in the same family tree: take the cycle out again
  await resetData(request);
});

test('Activity: export and check keep their progress and result when the page is changed', async ({ page, request }) => {
  await createFamily(request);
  await page.goto('/import-export');

  // An export: done once the backend has sent everything; listed under "Vorgänge"
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'ZIP herunterladen' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^family_tree_.*\.zip$/);
  await expect(page.getByText(/wurde heruntergeladen|Gespeichert als/).first()).toBeVisible();

  // A check of an import file, then to another page and back: the preview is still there
  await chooseFile(page, 'export.zip', await exportZip(request));
  await page.getByRole('link', { name: 'Personen' }).click();
  await expect(page.getByRole('heading', { name: 'Personen', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: 'Import/Export' }).click();
  await expect(page.getByRole('heading', { name: 'Geplante Änderungen' })).toBeVisible();
  await expect(page.getByText('Gewählte Datei: export.zip')).toBeVisible();

  // Both in the list of this session; finished ones can be removed
  await page.getByRole('link', { name: 'Vorgänge' }).click();
  await expect(page.getByRole('heading', { name: 'Vorgänge', level: 1 })).toBeVisible();
  const finished = page.getByTestId('activity-finished');
  await expect(finished).toHaveCount(2);
  await expect(finished.first()).toContainText('Importdatei prüfen: export.zip');
  await expect(finished.nth(1)).toContainText(/Export: family_tree_.*\.zip/);
  await expect(finished.nth(1)).toContainText('Gespeichert als');
  await page.getByRole('button', { name: 'Abgeschlossene entfernen' }).click();
  await expect(finished).toHaveCount(0);
  await expect(page.getByText('In dieser Sitzung gab es noch keine Vorgänge.')).toBeVisible();
});
