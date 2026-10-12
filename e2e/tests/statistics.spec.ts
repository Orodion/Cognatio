import { test, expect } from '@playwright/test';
import { createPerson, createRelation, gql, uid } from './helpers';

test('Statistics page shows key figures, age distribution, last names, places and generations', async ({ page, request }) => {
  const id = uid();
  const opa = await createPerson(request, { firstName: `Opa${id}`, lastName: `Stat${id}`, gender: 'MALE' });
  const father = await createPerson(request, { firstName: `Vater${id}`, lastName: `Stat${id}`, gender: 'MALE' });
  await gql(request, 'mutation($id: ID!, $data: PersonInput!) { updatePerson(id: $id, data: $data) { id } }', {
    id: opa,
    data: { firstName: `Opa${id}`, lastName: `Stat${id}`, birthDate: '1901', deathDate: '1975', birthPlace: `Ort${id}` },
  });
  await createRelation(request, opa, father, 'CHILD');

  const { getPersons } = await gql<{ getPersons: { id: string; deathDate: string | null; deathPlace: string | null }[] }>(
    request,
    '{ getPersons { id deathDate deathPlace } }',
  );

  await page.goto('/');
  await page.getByRole('link', { name: 'Statistiken' }).click();
  await expect(page.getByRole('heading', { name: 'Statistiken', level: 1 })).toBeVisible();

  // The key figure "persons" matches the data
  const personsTile = page.getByRole('group', { name: 'Personen' });
  await expect(personsTile).toContainText(new Intl.NumberFormat('de-DE').format(getPersons.length));

  // Hint texts use the number formatting of the language (thousands separators)
  const withoutDeath = getPersons.filter((p) => !p.deathDate && !p.deathPlace).length;
  await expect(page.getByRole('group', { name: 'Verstorben' })).toContainText(
    `${new Intl.NumberFormat('de-DE').format(withoutDeath)} Person${withoutDeath === 1 ? '' : 'en'} ohne Sterbeangaben`,
  );

  await expect(page.getByRole('heading', { name: 'Altersverteilung' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Verstorbene – erreichtes Alter' }).getByRole('listitem', { name: /^70–79:/ })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Häufigste Nachnamen' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Generationenübersicht' })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('Generation');

  // Tooltip per Tastatur
  const firstSurname = page.getByRole('list', { name: 'Häufigste Nachnamen' }).getByRole('listitem').first();
  await firstSurname.focus();
  await expect(firstSurname.getByRole('tooltip')).toBeVisible();
});
