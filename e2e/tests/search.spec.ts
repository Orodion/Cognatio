import { test, expect } from '@playwright/test';
import { createPerson, gql, uid } from './helpers';

test('Search finds spelling variants and hits in notes and explains them', async ({ page, request }) => {
  const id = uid();
  // "Mey…er" and "Mai…er" sound the same (Cologne phonetics), the suffix makes the name unique
  const meyer = await createPerson(request, { firstName: 'Wilhelm', lastName: `Mey${id}er` });
  const anna = await createPerson(request, { firstName: `Anna${id}`, lastName: 'Schulz' });
  await gql(request, 'mutation($data: NoteInput!) { createNote(data: $data) { id } }', {
    data: { personId: anna, text: `Taufpatin war Frau Kranz${id} aus Trier` },
  });

  // Via the search bar in the header: another spelling of the last name
  await page.goto('/persons');
  const search = page.getByLabel('Personen suchen…');
  await search.fill(`Mai${id}er`);
  await search.press('Enter');
  await expect(page).toHaveURL(new RegExp(`q=Mai${id}er`));
  const card = page.getByRole('link', { name: new RegExp(`Wilhelm Mey${id}er`) });
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute('href', `/persons/${meyer}`);
  await expect(card.getByText('Gefunden über: ähnliche Schreibweise')).toBeVisible();

  // Several terms, one of them only in a note
  await page.goto(`/persons?q=${encodeURIComponent(`kranz${id} trier`)}`);
  const annaCard = page.getByRole('link', { name: new RegExp(`Anna${id} Schulz`) });
  await expect(annaCard.getByText('Gefunden über: Notizen')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /Person/ })).toHaveText('1 Person');
});

test('When creating a person the app points out possible duplicates, saving is still possible', async ({ page, request }) => {
  const id = uid();
  const existing = await createPerson(request, { firstName: 'Johann', lastName: `Schmidt${id}` });
  await gql(request, 'mutation($id: ID!, $data: PersonInput!) { updatePerson(id: $id, data: $data) { id } }', {
    id: existing,
    data: { firstName: 'Johann', lastName: `Schmidt${id}`, birthDate: '1901', birthPlace: 'Aachen' },
  });

  await page.goto('/persons');
  await page.getByRole('button', { name: 'Neue Person' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: /Vorname/ }).fill('Johan');
  await dialog.getByLabel('Nachname').fill(`Schmitt${id}`);

  await expect(dialog.getByText('Gibt es diese Person schon?')).toBeVisible();
  const link = dialog.getByRole('link', { name: `Johann Schmidt${id} öffnen (neuer Tab)` });
  await expect(link).toHaveAttribute('href', `/persons/${existing}`);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(dialog.getByText(/Aachen/)).toBeVisible();

  // Different birth year: no confusion, the hint disappears
  await dialog.getByLabel('Geburtsdatum').fill('1950');
  await expect(dialog.getByText('Gibt es diese Person schon?')).toBeHidden();

  // Trotz Hinweis speicherbar
  await dialog.getByLabel('Geburtsdatum').fill('1902');
  await expect(dialog.getByText('Gibt es diese Person schon?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Erstellen', exact: true }).click();
  await expect(dialog).toBeHidden();
  const { getPersons } = await gql<{ getPersons: { firstName: string; lastName: string }[] }>(request, '{ getPersons { firstName lastName } }');
  expect(getPersons.filter((p) => p.lastName?.endsWith(id))).toHaveLength(2);
});
