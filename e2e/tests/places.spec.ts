import { test, expect } from '@playwright/test';
import { createPerson, gql, uid } from './helpers';

test('the place fields suggest the places of the family tree while typing', async ({ page, request }) => {
  const id = uid();
  const anna = await createPerson(request, { firstName: `Anna${id}`, lastName: 'Ort', gender: 'FEMALE' });
  await gql(request, 'mutation($id: ID!, $data: PersonInput!) { updatePerson(id: $id, data: $data) { id } }', {
    id: anna,
    data: { firstName: `Anna${id}`, lastName: 'Ort', birthPlace: `Neustadt${id}` },
  });
  const otto = await createPerson(request, { firstName: `Otto${id}`, lastName: 'Ort', gender: 'MALE' });

  await page.goto(`/persons/${otto}`);
  await page.getByRole('button', { name: 'Bearbeiten' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Person bearbeiten' });
  // The place field offers the list, which holds the place of Anna
  await expect(dialog.getByLabel('Geburtsort', { exact: true })).toHaveAttribute('list', 'place-suggestions');
  await expect(page.locator(`#place-suggestions option[value="Neustadt${id}"]`)).toHaveCount(1);

  // Any other text stays allowed and is suggested from then on
  await dialog.getByLabel('Geburtsort', { exact: true }).fill(`Altdorf${id}`);
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Bearbeiten' }).first().click();
  await expect(page.locator(`#place-suggestions option[value="Altdorf${id}"]`)).toHaveCount(1);
});
