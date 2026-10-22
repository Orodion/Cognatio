import { test, expect } from '@playwright/test';
import { createPerson, gql, openPersonTab, uid } from './helpers';

test('A relation that looks wrong is saved only after asking and then listed under "Mögliche Fehler"', async ({ page, request }) => {
  const id = uid();
  const annaId = await createPerson(request, { firstName: `Anna${id}`, lastName: 'Test', gender: 'FEMALE' });
  const paulName = `Paul${id}`;
  await createPerson(request, { firstName: paulName, lastName: 'Test', gender: 'MALE' });

  // Paul as mother of Anna: the app asks, "Abbrechen" saves nothing
  await openPersonTab(page, annaId, 'Beziehungen');
  await page.getByRole('button', { name: 'Beziehung hinzufügen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Neue Beziehung hinzufügen' });
  await dialog.getByPlaceholder('Name eingeben...').fill(paulName);
  await dialog.getByRole('option', { name: new RegExp(paulName) }).click();
  await dialog.getByLabel('Beziehungsart').selectOption('MOTHER');
  const messages: string[] = [];
  page.once('dialog', (question) => {
    messages.push(question.message());
    void question.dismiss();
  });
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect.poll(() => messages.length).toBe(1);
  expect(messages[0]).toContain(`${paulName} Test ist als Mutter von Anna${id} Test eingetragen, ist aber männlich.`);
  await expect(dialog).toBeVisible();
  const relationsOf = async () =>
    (await gql<{ getRelations: { personAId: string }[] }>(request, '{ getRelations { personAId } }')).getRelations.filter((r) => r.personAId === annaId);
  expect(await relationsOf()).toHaveLength(0);

  // "OK" saves it anyway
  page.once('dialog', (question) => void question.accept());
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog).toBeHidden();
  expect(await relationsOf()).toHaveLength(1);

  // The page lists it; "Ist richtig" hides it until the marked ones are shown
  await page.goto('/');
  await page.getByRole('link', { name: 'Mögliche Fehler' }).click();
  await expect(page.getByRole('heading', { name: 'Mögliche Fehler' })).toBeVisible();
  const sentence = `${paulName} Test ist als Mutter von Anna${id} Test eingetragen, ist aber männlich.`;
  const row = page.getByRole('listitem').filter({ hasText: sentence });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Ist richtig' }).click();
  await expect(row).toBeHidden();
  await page.getByLabel(/Auch die als richtig markierten zeigen/).check();
  await expect(row.getByRole('button', { name: 'Wieder zeigen' })).toBeVisible();
});
