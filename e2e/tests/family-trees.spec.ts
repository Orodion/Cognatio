import { test, expect, type APIRequestContext } from '@playwright/test';
import { createPerson, createRelation, createTree, gql, importViaApi, removeTree, treeHeader, uid } from './helpers';

// Clean-up: remove the created family trees with their data so the test database does not grow
const created: string[] = [];
test.afterEach(async ({ request }) => {
  for (const id of created.splice(0)) await removeTree(request, id);
});

const personNames = async (request: APIRequestContext, tree?: string) => {
  const { getPersons } = await gql<{ getPersons: { id: string; firstName: string }[] }>(request, '{ getPersons { id firstName } }', {}, tree);
  return getPersons;
};

const exportZip = async (request: APIRequestContext, tree: string) => {
  const res = await request.get('/api/v1/export/zip', { headers: treeHeader(tree) });
  expect(res.ok()).toBeTruthy();
  return res.body();
};

const importFile = async (
  request: APIRequestContext,
  file: Buffer,
  fields: { strategy: string; target?: 'NEW' | 'CURRENT'; treeName?: string },
  tree?: string,
) => importViaApi(request, file, fields, tree);

test('Create and switch family trees – each shows only its own persons', async ({ page, request }) => {
  const id = uid();
  const treeName = `Familie ${id}`;
  const { activeFamilyTree: first } = await gql<{ activeFamilyTree: { id: string; name: string } }>(request, '{ activeFamilyTree { id name } }');

  // Create a new family tree – it is opened right away
  await page.goto('/family-trees');
  await page.getByRole('button', { name: 'Neuer Stammbaum' }).click();
  const dialog = page.getByRole('dialog', { name: 'Neuer Stammbaum' });
  await dialog.getByLabel('Name').fill(treeName);
  await dialog.getByRole('button', { name: 'Anlegen und öffnen' }).click();
  await expect(dialog).toBeHidden();
  const treeSelect = page.getByLabel('Geöffneter Stammbaum');
  await expect(treeSelect.locator('option:checked')).toHaveText(treeName);
  const card = page.getByRole('listitem', { name: treeName });
  await expect(card.getByText('Geöffnet', { exact: true })).toBeVisible();
  const treeId = await treeSelect.inputValue();
  created.push(treeId);

  // Create a person in the new family tree
  await page.getByRole('navigation').getByRole('link', { name: 'Personen' }).click();
  await page.getByRole('button', { name: 'Neue Person' }).click();
  const personDialog = page.getByRole('dialog', { name: 'Neue Person anlegen' });
  await personDialog.getByRole('textbox', { name: /Vorname/ }).fill(`Ida${id}`);
  await personDialog.getByLabel('Nachname').fill('Neu');
  await personDialog.getByRole('button', { name: 'Erstellen', exact: true }).click();
  await expect(personDialog).toBeHidden();
  await expect(page.getByRole('link').filter({ hasText: `Ida${id} Neu` })).toBeVisible();
  // Only person of the new family tree
  expect((await personNames(request, treeId)).map((p) => p.firstName)).toEqual([`Ida${id}`]);
  expect((await personNames(request, first.id)).some((p) => p.firstName === `Ida${id}`)).toBe(false);
  const idaId = (await personNames(request, treeId))[0].id;

  // Back to the first family tree: the person cannot be found there
  await treeSelect.selectOption({ label: first.name });
  await page.goto(`/persons?q=Ida${id}`);
  await expect(page.getByText(`Keine Personen für „Ida${id}“ gefunden.`)).toBeVisible();
  await expect(page.getByRole('link').filter({ hasText: `Ida${id} Neu` })).toHaveCount(0);

  // A link to the person opens its family tree
  await page.goto(`/persons/${idaId}`);
  await expect(page.getByRole('heading', { name: `Ida${id} Neu` })).toBeVisible();
  await expect(treeSelect.locator('option:checked')).toHaveText(treeName);
});

test('Import an export into a new family tree; overwrite only affects the target family tree', async ({ request }) => {
  const id = uid();
  const source = await createTree(request, `Quelle ${id}`);
  created.push(source);
  const anna = await createPerson(request, { firstName: `Anna${id}`, lastName: 'Quelle', gender: 'FEMALE' }, source);
  const otto = await createPerson(request, { firstName: `Otto${id}`, lastName: 'Quelle', gender: 'MALE' }, source);
  await createRelation(request, anna, otto, 'HUSBAND', source);
  const file = await exportZip(request, source);

  // As a new family tree: same content, own ids (those of the source are already taken)
  const result = await importFile(request, file, { strategy: 'MERGE_NEWER', target: 'NEW', treeName: `Kopie ${id}` });
  created.push(result.familyTreeId);
  expect(result.familyTreeId).not.toBe(source);
  const copy = await personNames(request, result.familyTreeId);
  expect(copy.map((p) => p.firstName).sort()).toEqual([`Anna${id}`, `Otto${id}`]);
  expect(copy.map((p) => p.id)).not.toContain(anna);
  const { getRelations } = await gql<{ getRelations: { personAId: string; personBId: string }[] }>(
    request,
    '{ getRelations { personAId personBId } }',
    {},
    result.familyTreeId,
  );
  expect(getRelations).toHaveLength(1);
  expect(copy.map((p) => p.id)).toEqual(expect.arrayContaining([getRelations[0].personAId, getRelations[0].personBId]));
  const { familyTrees } = await gql<{ familyTrees: { id: string; name: string; personCount: number }[] }>(request, '{ familyTrees { id name personCount } }');
  expect(familyTrees.find((t) => t.id === result.familyTreeId)).toMatchObject({ name: `Kopie ${id}`, personCount: 2 });

  // Overwrite the copy with a file without Otto: only the copy loses him, the source stays complete
  await gql(request, 'mutation($id: ID!) { deletePerson(id: $id) }', { id: otto }, source);
  await gql(request, 'mutation($id: ID!) { hardDeletePerson(id: $id) }', { id: otto }, source);
  const withoutOtto = await exportZip(request, source);
  await createPerson(request, { firstName: `Otto${id}`, lastName: 'Quelle', gender: 'MALE' }, source);
  const overwritten = await importFile(request, withoutOtto, { strategy: 'OVERWRITE' }, result.familyTreeId);
  expect(overwritten.removedPersons).toBe(2);
  expect((await personNames(request, result.familyTreeId)).map((p) => p.firstName)).toEqual([`Anna${id}`]);
  expect((await personNames(request, source)).map((p) => p.firstName).sort()).toEqual([`Anna${id}`, `Otto${id}`]);

  // Import into the source again: Anna is known and is not duplicated, the permanently deleted Otto comes back
  const again = await importFile(request, file, { strategy: 'MERGE_NEWER' }, source);
  expect(again).toMatchObject({ familyTreeId: source, createdPersons: 1 });
  const names = (await personNames(request, source)).map((p) => p.firstName);
  expect(names.filter((n) => n === `Anna${id}`)).toHaveLength(1);
  expect(names).toHaveLength(3);
});

test('Import a GEDCOM file into a new family tree (UI)', async ({ page, request }) => {
  const id = uid();
  const source = await createTree(request, `Gedcom ${id}`);
  created.push(source);
  await createPerson(request, { firstName: `Emma${id}`, lastName: 'Brakenhof', gender: 'FEMALE' }, source);
  const res = await request.get('/api/v1/export/gedcom?version=5.5.1', { headers: treeHeader(source) });
  const gedcom = await res.body();

  await page.goto('/import-export');
  await page.getByLabel('Datei auswählen').setInputFiles({ name: 'brakenhof.ged', mimeType: 'text/plain', buffer: gedcom });
  // GEDCOM goes into a new family tree by default, named after the most common last name
  await expect(page.getByLabel('einen neuen Stammbaum')).toBeChecked();
  const name = page.getByLabel('Name des neuen Stammbaums');
  await expect(name).toHaveValue('Brakenhof');
  await name.fill(`Brakenhof ${id}`);
  await page.getByRole('button', { name: 'Import ausführen' }).click();
  await expect(page.getByText(`Import abgeschlossen – der neue Stammbaum „Brakenhof ${id}“ ist geöffnet.`)).toBeVisible();

  const treeSelect = page.getByLabel('Geöffneter Stammbaum');
  await expect(treeSelect.locator('option:checked')).toHaveText(`Brakenhof ${id}`);
  created.push(await treeSelect.inputValue());
  await page.getByRole('navigation').getByRole('link', { name: 'Personen' }).click();
  await expect(page.getByRole('link').filter({ hasText: `Emma${id} Brakenhof` })).toBeVisible();
});

test('Move a family tree to the recycle bin, restore it and delete it permanently', async ({ page, request }) => {
  const id = uid();
  const treeName = `Papierkorb ${id}`;
  const tree = await createTree(request, treeName);
  created.push(tree);
  await createPerson(request, { firstName: `Rita${id}`, lastName: 'Weg' }, tree);
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('/family-trees');
  await page
    .getByRole('listitem', { name: treeName })
    .getByRole('button', { name: `${treeName} löschen` })
    .click();
  await expect(page.getByRole('listitem', { name: treeName })).toBeHidden();
  await expect(page.getByLabel('Geöffneter Stammbaum').locator('option', { hasText: treeName })).toHaveCount(0);

  // In the recycle bin: restore – with all persons
  await page.getByRole('main').getByRole('link', { name: 'Papierkorb' }).click();
  const deleted = page.getByRole('region', { name: 'Gelöschte Stammbäume' });
  await expect(deleted.getByText(treeName)).toBeVisible();
  await deleted.getByRole('button', { name: `${treeName} wiederherstellen` }).click();
  await expect(page.getByText(treeName)).toBeHidden();
  expect((await personNames(request, tree)).map((p) => p.firstName)).toEqual([`Rita${id}`]);

  // Delete again and remove permanently
  await gql(request, 'mutation($id: ID!) { deleteFamilyTree(id: $id) }', { id: tree });
  await page.reload();
  await deleted.getByRole('button', { name: `${treeName} endgültig löschen` }).click();
  await expect(page.getByText(treeName)).toBeHidden();
  const { deletedFamilyTrees } = await gql<{ deletedFamilyTrees: { id: string }[] }>(request, '{ deletedFamilyTrees { id } }');
  expect(deletedFamilyTrees.map((t) => t.id)).not.toContain(tree);
  expect((await personNames(request)).some((p) => p.firstName === `Rita${id}`)).toBe(false);
});

test('Without any family tree the app offers to create, import or restore one', async ({ page, request }) => {
  const id = uid();
  // Everything into the recycle bin – the trees of the other tests come back at the end
  const { familyTrees } = await gql<{ familyTrees: { id: string; name: string }[] }>(request, '{ familyTrees { id name } }');
  const trashed = familyTrees.map((t) => t.id);
  const restoreAll = async () => {
    const { deletedFamilyTrees } = await gql<{ deletedFamilyTrees: { id: string }[] }>(request, '{ deletedFamilyTrees { id } }');
    for (const tree of trashed.filter((t) => deletedFamilyTrees.some((d) => d.id === t))) {
      await gql(request, 'mutation($id: ID!) { restoreFamilyTree(id: $id) { id } }', { id: tree });
    }
  };
  try {
    const keep = familyTrees[0];
    await page.goto('/family-trees');
    page.on('dialog', (dialog) => dialog.accept());
    for (const tree of familyTrees.slice(1)) await gql(request, 'mutation($id: ID!) { deleteFamilyTree(id: $id) }', { id: tree.id });
    await page.reload();

    // The last one can be deleted, too
    await page.getByRole('button', { name: `${keep.name} löschen` }).click();
    await expect(page.getByText('Lege einen neuen Stammbaum an', { exact: false })).toBeVisible();
    await expect(page.getByLabel('Geöffneter Stammbaum')).toBeDisabled();

    // Pages that need a family tree say what can be done
    await page.getByRole('navigation').getByRole('link', { name: 'Personen' }).click();
    await expect(page.getByRole('heading', { name: 'Kein Stammbaum vorhanden' })).toBeVisible();

    // A new one is opened right away
    await page.getByRole('button', { name: 'Neuer Stammbaum' }).click();
    const dialog = page.getByRole('dialog', { name: 'Neuer Stammbaum' });
    await dialog.getByLabel('Name').fill(`Neu ${id}`);
    await dialog.getByRole('button', { name: 'Anlegen und öffnen' }).click();
    await expect(page.getByLabel('Geöffneter Stammbaum').locator('option:checked')).toHaveText(`Neu ${id}`);
    await expect(page.getByRole('button', { name: 'Neue Person' })).toBeVisible();
    created.push(await page.getByLabel('Geöffneter Stammbaum').inputValue());

    // Delete it again and get the old one back from the recycle bin
    await page.goto('/family-trees');
    await page.getByRole('button', { name: `Neu ${id} löschen` }).click();
    // Only leave the page once the family tree is gone – a new page would cancel the request
    await expect(page.getByRole('button', { name: `Neu ${id} löschen` })).toBeHidden();
    await page.goto('/persons');
    await page.getByRole('link', { name: 'Aus dem Papierkorb holen' }).click();
    await page
      .getByRole('region', { name: 'Gelöschte Stammbäume' })
      .getByRole('button', { name: `${keep.name} wiederherstellen` })
      // Newest deletion first: with older ones of the same name (left by aborted runs) it is the top one
      .first()
      .click();
    await expect(page.getByLabel('Geöffneter Stammbaum').locator('option:checked')).toHaveText(keep.name);
  } finally {
    await restoreAll();
  }
});
