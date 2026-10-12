import { test, expect } from '@playwright/test';
import { createPerson, createRelation, findPersonId, gql, openPersonTab, uid } from './helpers';

test('Create a person with a mother: the relation appears at both persons and in the family tree', async ({ page, request }) => {
  const id = uid();
  const motherName = `Maria${id}`;
  const childName = `Karl${id}`;
  const motherId = await createPerson(request, { firstName: motherName, lastName: 'Test', gender: 'FEMALE' });

  // Create a new person via the dialog and assign the mother right away
  await page.goto('/persons');
  await page.getByRole('button', { name: 'Neue Person' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: /Vorname/ }).fill(childName);
  await dialog.getByLabel('Nachname').fill('Test');
  await dialog.getByRole('button', { name: 'Neue Beziehung erstellen' }).click();
  await dialog.getByPlaceholder('Name eingeben...').fill(motherName);
  await dialog.getByRole('option', { name: new RegExp(motherName) }).click();
  await dialog.getByLabel('Beziehungsart').selectOption('MOTHER');
  await dialog.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  await expect(dialog.getByText(`${motherName} Test`)).toBeVisible();
  await dialog.getByRole('button', { name: 'Erstellen', exact: true }).click();
  await expect(dialog).toBeHidden();

  const childId = await findPersonId(request, childName);
  expect(childId).toBeTruthy();

  // At the child: mother under "parents"
  await openPersonTab(page, childId!, 'Beziehungen');
  const parents = page.getByRole('region', { name: 'Eltern' });
  await expect(parents.getByRole('link', { name: `${motherName} Test` })).toBeVisible();
  await expect(parents.getByText('Mutter', { exact: true })).toBeVisible();

  // At the mother: child under "children" (the reverse direction is derived)
  await openPersonTab(page, motherId, 'Beziehungen');
  await expect(page.getByRole('region', { name: 'Kinder' }).getByRole('link', { name: `${childName} Test` })).toBeVisible();

  // In the family tree: both persons and the connection between them
  const { getRelations } = await gql<{ getRelations: { id: string; personAId: string; personBId: string }[] }>(
    request,
    '{ getRelations { id personAId personBId } }',
  );
  const relation = getRelations.find((r) => r.personAId === childId && r.personBId === motherId);
  expect(relation).toBeTruthy();

  // From the mother's detail page: family tree with her as focus person
  await page.getByRole('link', { name: 'Stammbaum anzeigen' }).click();
  await expect(page.locator('.react-flow__node', { hasText: `${motherName} Test` })).toBeVisible();
  await expect(page.locator('.react-flow__node', { hasText: `${childName} Test` })).toBeVisible();
  // One line per family – here only the mother as parent
  await expect(page.getByTestId(`rf__edge-family:${motherId}:${childId}`)).toBeAttached();
});

test('Add a child at the mother: it is also assigned to the husband automatically, both from birth', async ({ page, request }) => {
  const id = uid();
  const motherId = await createPerson(request, { firstName: `Eva${id}`, lastName: 'Test', gender: 'FEMALE' });
  const fatherId = await createPerson(request, { firstName: `Adam${id}`, lastName: 'Test', gender: 'MALE' });
  const childName = `Lea${id}`;
  const childId = await createPerson(request, { firstName: childName, lastName: 'Test', gender: 'FEMALE', birthDate: '15.08.2010' });
  await createRelation(request, motherId, fatherId, 'HUSBAND'); // Adam is Eva's husband

  // Enter the child via the relation dialog at the mother
  await openPersonTab(page, motherId, 'Beziehungen');
  await page.getByRole('button', { name: 'Beziehung hinzufügen' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Name eingeben...').fill(childName);
  await dialog.getByRole('option', { name: new RegExp(childName) }).click();
  await dialog.getByLabel('Beziehungsart').selectOption('CHILD');
  // Start of the relation = the child's date of birth (prefilled)
  await expect(dialog.getByLabel('Von Datum')).toHaveValue('2010-08-15');
  await expect(dialog.getByText('Geburtsdatum des Kindes übernommen – änderbar')).toBeVisible();
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('region', { name: 'Kinder' }).getByRole('link', { name: `${childName} Test` })).toBeVisible();

  // The father now has the child as well
  await openPersonTab(page, fatherId, 'Beziehungen');
  await expect(page.getByRole('region', { name: 'Kinder' }).getByRole('link', { name: `${childName} Test` })).toBeVisible();

  // The child sees both parents with gender-specific roles
  await openPersonTab(page, childId, 'Beziehungen');
  const parents = page.getByRole('region', { name: 'Eltern' });
  await expect(parents.getByText('Mutter', { exact: true })).toBeVisible();
  await expect(parents.getByText('Vater', { exact: true })).toBeVisible();

  // Both parent-child relations start with the birth – also the one to the father that was derived automatically
  const { getRelations } = await gql<{ getRelations: { personAId: string; personBId: string; startDate: string | null }[] }>(
    request,
    '{ getRelations { personAId personBId startDate } }',
  );
  const toKind = getRelations.filter((r) => r.personBId === childId && [motherId, fatherId].includes(r.personAId));
  expect(toKind.map((r) => r.startDate)).toEqual(['2010-08-15T00:00:00.000Z', '2010-08-15T00:00:00.000Z']);
});

test('Relation to a new person: the person is created in the dialog and linked', async ({ page, request }) => {
  const id = uid();
  const childId = await createPerson(request, { firstName: `Tim${id}`, lastName: 'Test', gender: 'MALE' });
  const motherName = `Clara${id}`;

  await openPersonTab(page, childId, 'Beziehungen');
  await page.getByRole('button', { name: 'Beziehung hinzufügen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Neue Beziehung hinzufügen' });
  await dialog.getByRole('button', { name: 'Neue Person', exact: true }).click();
  await dialog.getByLabel('Beziehungsart').selectOption('MOTHER');
  // Mutter → weiblich vorbelegt
  await expect(dialog.getByLabel('Geschlecht')).toHaveValue('FEMALE');
  await dialog.getByRole('textbox', { name: /Vorname/ }).fill(motherName);
  await dialog.getByLabel('Nachname').fill('Test');
  await dialog.getByLabel('Geburtsdatum').fill('um 1950');
  await dialog.getByRole('button', { name: 'Person anlegen und speichern' }).click();
  await expect(dialog).toBeHidden();

  // The new person is listed as mother under the parents and has the details from the dialog
  const parents = page.getByRole('region', { name: 'Eltern' });
  await expect(parents.getByRole('link', { name: `${motherName} Test` })).toBeVisible();
  const motherId = await findPersonId(request, motherName);
  const { getPerson } = await gql<{ getPerson: { gender: string; birthDate: string } }>(request, `{ getPerson(id: "${motherId}") { gender birthDate } }`);
  expect(getPerson).toEqual({ gender: 'FEMALE', birthDate: 'um 1950' });
});
