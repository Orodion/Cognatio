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
  // Another test may have left a scope: start from the whole family tree
  const reset = page.getByRole('button', { name: 'Zurücksetzen' });
  if (await reset.isVisible()) {
    await reset.click();
  }

  // The key figure "persons" matches the data
  const personsTile = page.getByRole('group', { name: 'Personen' });
  await expect(personsTile).toContainText(new Intl.NumberFormat('de-DE').format(getPersons.length));

  // Hint texts use the number formatting of the language (thousands separators)
  const withoutDeath = getPersons.filter((p) => !p.deathDate && !p.deathPlace).length;
  await expect(page.getByRole('group', { name: 'Verstorben' })).toContainText(
    `${new Intl.NumberFormat('de-DE').format(withoutDeath)} Person${withoutDeath === 1 ? '' : 'en'} ohne Sterbeangaben`,
  );

  await page.getByRole('button', { name: 'Leben' }).click();
  await expect(page.getByRole('heading', { name: 'Altersverteilung' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Verstorbene – erreichtes Alter' }).getByRole('link', { name: /^70–79:/ })).toBeVisible();

  await page.getByRole('button', { name: 'Namen & Orte' }).click();
  await expect(page.getByRole('list', { name: 'Häufigste Nachnamen' })).toBeVisible();
  // Tooltip by keyboard
  const firstSurname = page.getByRole('list', { name: 'Häufigste Nachnamen' }).getByRole('link').first();
  await firstSurname.focus();
  await expect(firstSurname.getByRole('tooltip')).toBeVisible();

  await page.getByRole('button', { name: 'Ahnen' }).click();
  await expect(page.getByRole('heading', { name: 'Generationenübersicht' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Generationenübersicht' })).toContainText('Generation');
});

test('A figure of the statistics leads to its persons, also within a scope', async ({ page, request }) => {
  const id = uid();
  const name = `Zahl${id}`;
  const opa = await createPerson(request, { firstName: `Opa${id}`, lastName: name, gender: 'MALE' });
  const vater = await createPerson(request, { firstName: `Vater${id}`, lastName: name, gender: 'MALE' });
  await createPerson(request, { firstName: `Tante${id}`, lastName: name, gender: 'FEMALE' });
  await createRelation(request, opa, vater, 'CHILD');

  // Scope: the persons of the last name
  await page.goto(`/statistics?scope=surname&surname=${name}&tab=overview`);
  await expect(page.getByRole('status').filter({ hasText: `Nachname ${name}: 3 Personen` })).toBeVisible();
  const personsTile = page.getByRole('group', { name: 'Personen' });
  await expect(personsTile.getByRole('link', { name: '3', exact: true })).toBeVisible();

  // Women of the last name → the person list with exactly them
  await personsTile.getByRole('link', { name: '1 weiblich' }).click();
  await expect(page).toHaveURL(/\/persons\?filter=gender%3AFEMALE&scope=surname/);
  await expect(page.getByText('Aus der Statistik:')).toBeVisible();
  await expect(page.getByText(`Geschlecht: Weiblich · Nachname ${name}`)).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(`Tante${id}`) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(`Opa${id}`) })).toHaveCount(0);

  // Back to the statistics with the same scope
  await page.getByRole('link', { name: 'Zur Statistik' }).click();
  await expect(page).toHaveURL(new RegExp(`/statistics\\?scope=surname&surname=${name}$`));

  // Scope: the ancestors of the father, chosen in the dialog
  await page.getByRole('combobox', { name: 'Umfang' }).selectOption('ancestors');
  const dialog = page.getByRole('dialog', { name: 'Person wählen' });
  await dialog.getByRole('textbox').fill(`Vater${id}`);
  await dialog.getByRole('option', { name: new RegExp(`Vater${id}`) }).click();
  await expect(page.getByRole('status').filter({ hasText: `Vorfahren von Vater${id} ${name}: 2 Personen` })).toBeVisible();
  await page.goto(`/statistics?scope=surname&surname=${name}`);

  // The family group: grandpa and father, not the aunt
  await page.getByRole('group', { name: 'Familienverbände' }).getByRole('link', { name: '1', exact: true }).click();
  await expect(page.getByRole('link', { name: new RegExp(`Opa${id}`) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(`Vater${id}`) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(`Tante${id}`) })).toHaveCount(0);

  // Removing the filter shows everybody again
  await page.getByRole('button', { name: 'Filter entfernen' }).click();
  await expect(page).toHaveURL(/\/persons$/);
  await expect(page.getByText('Aus der Statistik:')).toHaveCount(0);
});

test('The home person starts the ancestor figures; what is missing leads to the persons', async ({ page, request }) => {
  const id = uid();
  const opa = await createPerson(request, { firstName: `Großvater${id}`, lastName: `Ahn${id}`, gender: 'MALE' });
  const vater = await createPerson(request, { firstName: `Vater${id}`, lastName: `Ahn${id}`, gender: 'MALE' });
  const kind = await createPerson(request, { firstName: `Kind${id}`, lastName: `Ahn${id}`, gender: 'FEMALE' });
  await createRelation(request, opa, vater, 'CHILD');
  await createRelation(request, vater, kind, 'CHILD');

  try {
    // The child becomes the home person on its page
    await page.goto(`/persons/${kind}`);
    await page.getByRole('button', { name: 'Hauptperson', pressed: false }).click();
    await expect(page.getByRole('button', { name: 'Hauptperson', pressed: true })).toBeVisible();

    // Ancestors: father in generation 2, grandfather in generation 3 – both an open end (no mother)
    await page.goto('/statistics?tab=ancestors');
    const card = page.getByRole('table', { name: 'Ahnen' });
    await expect(page.getByText(`Kind${id} Ahn${id}`).first()).toBeVisible();
    await expect(page.getByText('· Hauptperson')).toBeVisible();
    // Row 0 is the header, row 2 the parents
    const parents = card.getByRole('row').nth(2);
    await expect(parents).toContainText('1 (50');
    await parents.getByRole('link').first().click();
    await expect(page).toHaveURL(/\/persons\?filter=ancestors%3A/);
    await expect(page.getByRole('link', { name: new RegExp(`Vater${id}`) })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(`Großvater${id}`) })).toHaveCount(0);

    // What is missing: the mothers of the family, within the scope of its last name
    await page.goto(`/statistics?scope=surname&surname=Ahn${id}`);
    const missing = page.getByRole('table', { name: 'Was fehlt noch?' });
    const mothers = missing.getByRole('row').filter({ hasText: 'Mutter bekannt' });
    await mothers.getByRole('link', { name: '3 fehlen' }).click();
    await expect(page.getByText(`Fehlt: Mutter bekannt · Nachname Ahn${id}`)).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(`Ahn${id}`) })).toHaveCount(3);
  } finally {
    await gql(request, 'mutation { setHomePerson(personId: null) { id } }');
  }
});

test('The time axis and the lives through time lead to their persons', async ({ page, request }) => {
  const id = uid();
  const name = `Zeit${id}`;
  const update = (personId: string, data: Record<string, string>) =>
    gql(request, 'mutation($id: ID!, $data: PersonInput!) { updatePerson(id: $id, data: $data) { id } }', { id: personId, data });
  // Five women born in the 1810s who died at 70, so their mean is shown
  for (let i = 0; i < 5; i++) {
    const woman = await createPerson(request, { firstName: `Frau${i}${id}`, lastName: name, gender: 'FEMALE' });
    await update(woman, { firstName: `Frau${i}${id}`, lastName: name, gender: 'FEMALE', birthDate: `181${i}`, deathDate: `188${i}` });
  }

  await page.goto(`/statistics?scope=surname&surname=${name}`);
  const chart = page.getByRole('list', { name: 'Zeitachse: Geburten je Jahrzehnt' });
  await expect(chart.getByRole('link')).toHaveCount(1);
  await page.getByRole('button', { name: 'Todesfälle' }).click();
  await page.getByRole('list', { name: 'Zeitachse: Todesfälle je Jahrzehnt' }).getByRole('link', { name: '1880–1889 – Todesfälle: 5' }).click();
  await expect(page.getByText(`Gestorben 1880–1889 · Nachname ${name}`)).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(name) })).toHaveCount(5);

  await page.goto(`/statistics?scope=surname&surname=${name}&tab=lives`);
  const table = page.getByRole('table', { name: 'Lebensdauer', exact: true });
  const century = table.getByRole('row').filter({ hasText: '1800–1899' });
  await expect(century).toContainText('70 Jahre');
  await century.getByRole('link', { name: '5 Personen' }).first().click();
  await expect(page.getByText(`Lebensdauer – Frauen, 1800–1899 · Nachname ${name}`)).toBeVisible();
});

test('First names, migration and records lead to their persons', async ({ page, request }) => {
  const id = uid();
  const name = `Ort${id}`;
  const update = (personId: string, data: Record<string, string>) =>
    gql(request, 'mutation($id: ID!, $data: PersonInput!) { updatePerson(id: $id, data: $data) { id } }', { id: personId, data });
  const add = async (firstName: string, gender: string, data: Record<string, string>) => {
    const personId = await createPerson(request, { firstName, lastName: name, gender });
    await update(personId, { firstName, lastName: name, gender, ...data });
    return personId;
  };
  await add(`Wilhelm Karl${id}`, 'MALE', { birthDate: '1850', birthPlace: `Halle${id}`, deathDate: '1950', deathPlace: `Berlin${id}` });
  await add(`Wilhelm${id}`, 'MALE', { birthDate: '1880', birthPlace: `Halle${id}`, deathDate: '1930', deathPlace: `Halle${id}` });

  await page.goto(`/statistics?scope=surname&surname=${name}&tab=names`);
  // Migration: one stayed, one moved from Halle to Berlin
  await page.getByRole('list', { name: 'Häufigste Wege' }).getByRole('link').click();
  await expect(page.getByText(`Weg Halle${id} → Berlin${id} · Nachname ${name}`)).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(`Karl${id}`) })).toHaveCount(1);

  // Records: the longest life of the family, 100 years
  await page.goto(`/statistics?scope=surname&surname=${name}&tab=lives`);
  const records = page.getByRole('heading', { name: 'Rekorde' }).locator('xpath=ancestor::div[contains(@class,"rounded")][1]');
  await expect(records.getByRole('definition').first()).toContainText('100 Jahre');
  await expect(records.getByRole('link', { name: new RegExp(`Karl${id}`) }).first()).toBeVisible();
});

test('The statistics are printed as a report with the same scope', async ({ page, request }) => {
  const id = uid();
  const name = `Druck${id}`;
  await createPerson(request, { firstName: `Erste${id}`, lastName: name, gender: 'FEMALE' });

  await page.goto(`/statistics?scope=surname&surname=${name}`);
  await page.getByRole('link', { name: 'Drucken oder als PDF' }).click();
  await expect(page).toHaveURL(/\/reports\?type=statistics&scope=surname&surname=/);
  await expect(page.getByLabel('Bericht')).toHaveValue('statistics');
  const report = page.getByTestId('report');
  await expect(report.getByRole('heading', { name: 'Was fehlt noch?' })).toBeVisible();
  await expect(report).toContainText(`Statistik · Nachname ${name}`);
  await expect(page.getByRole('button', { name: 'Drucken', exact: true })).toBeEnabled();
});
