import { test, expect, type Page } from '@playwright/test';
import { unzipSync, strFromU8 } from 'fflate';
import { createPerson, createTree, gql, importViaApi, removeTree, uid } from './helpers';

async function openSources(page: Page, personId: string) {
  await page.goto(`/persons/${personId}`);
  await page.getByRole('navigation', { name: 'Bereiche der Person' }).getByRole('button', { name: 'Quellen' }).click();
}

test('cites one entry of a source at the birth of one person and for another person, and shows it everywhere', async ({ page, request }) => {
  const id = uid();
  const anna = await createPerson(request, { firstName: `Anna${id}`, lastName: 'Quelle', gender: 'FEMALE', birthDate: '01.02.1900' });
  const otto = await createPerson(request, { firstName: `Otto${id}`, lastName: 'Quelle', gender: 'MALE' });
  const title = `Kirchenbuch ${id}`;

  // A new source with a new entry, for the birth of Anna
  await openSources(page, anna);
  await page.getByRole('button', { name: 'Quelle zitieren' }).click();
  const dialog = page.getByRole('dialog', { name: 'Quelle zitieren' });
  await dialog.getByLabel('Fakt').selectOption({ label: 'Geburt (01.02.1900)' });
  await dialog.getByRole('radio', { name: 'Neue Quelle…' }).check();
  await dialog.getByRole('textbox', { name: /^Titel/ }).fill(title);
  await dialog.getByLabel('Seite oder Eintrag').fill('S. 12');
  await dialog.getByLabel('Verlässlichkeit').selectOption({ label: 'Primärquelle – der Originaleintrag' });
  await dialog.getByRole('button', { name: 'Zitieren' }).click();
  await expect(dialog).toBeHidden();
  const birth = page.getByRole('region', { name: 'Geburt (01.02.1900)' });
  await expect(birth.getByRole('link', { name: title })).toBeVisible();
  await expect(birth.getByText('primär')).toBeVisible();

  // The same entry for Otto: chosen from the library, not entered again
  await openSources(page, otto);
  await page.getByRole('button', { name: 'Quelle zitieren' }).click();
  const second = page.getByRole('dialog', { name: 'Quelle zitieren' });
  await second.getByRole('searchbox', { name: 'Quellen durchsuchen…' }).fill(id);
  await second.getByRole('radio', { name: new RegExp(title) }).check();
  await second.getByRole('radio', { name: /S\. 12/ }).check();
  await second.getByRole('button', { name: 'Zitieren' }).click();
  await expect(second).toBeHidden();
  await expect(page.getByRole('region', { name: 'Person allgemein' }).getByRole('link', { name: title })).toBeVisible();

  // The mark at the birth leads to the sources
  await page.goto(`/persons/${anna}`);
  await page.getByRole('button', { name: 'Geburt – Belege: 1' }).click();
  await expect(page.getByRole('region', { name: 'Geburt (01.02.1900)' })).toBeVisible();

  // The page of the source names both facts
  await page.getByRole('link', { name: title }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  const entry = page.getByRole('region', { name: 'S. 12' });
  // By person, each with its facts
  await expect(entry.getByRole('link', { name: `Anna${id} Quelle` })).toHaveAttribute('href', `/persons/${anna}`);
  await expect(entry.getByRole('list', { name: `Belegte Fakten von Anna${id} Quelle` })).toHaveText('Geburt');
  await expect(entry.getByRole('link', { name: `Otto${id} Quelle` })).toHaveAttribute('href', `/persons/${otto}`);
  await expect(entry.getByRole('list', { name: `Belegte Fakten von Otto${id} Quelle` })).toHaveText('Person allgemein');
});

test('an export takes the used part of the library along; importing it into another family tree reuses the source', async ({ request }) => {
  const id = uid();
  const tree = await createTree(request, `Quellen ${id}`);
  try {
    const anna = await createPerson(request, { firstName: `Anna${id}`, lastName: 'Export', birthDate: '01.02.1900' }, tree);
    const { createSource } = await gql<{ createSource: { id: string } }>(
      request,
      'mutation($data: SourceInput!) { createSource(data: $data) { id } }',
      { data: { type: 'CIVIL_REGISTER', title: `Geburtsregister ${id}` } },
      tree,
    );
    await gql(
      request,
      'mutation($data: CitationInput!, $targets: [CitationTargetInput!]) { createCitation(data: $data, targets: $targets) { id } }',
      { data: { sourceId: createSource.id, page: 'Nr. 7', quality: 3 }, targets: [{ personId: anna, fact: 'BIRTH' }] },
      tree,
    );

    const res = await request.get('/api/v1/export/zip', { headers: { 'X-Family-Tree-Id': tree } });
    expect(res.ok()).toBeTruthy();
    const json = JSON.parse(strFromU8(unzipSync(new Uint8Array(await res.body()))['persons.json']));
    expect(json.version).toBe(2);
    expect(json.sources.map((s: { title: string }) => s.title)).toEqual([`Geburtsregister ${id}`]);
    expect(json.persons[0].citations).toEqual([{ citationId: json.citations[0].id, fact: 'BIRTH' }]);

    const count = async () => (await gql<{ sources: unknown[] }>(request, '{ sources(scope: "ALL") { id } }', {}, tree)).sources.length;
    const before = await count();

    // GEDCOM carries the source as SOUR record and the citation at the birth; importing it reuses the source as well
    const gedcom = await request.get('/api/v1/export/gedcom?version=7.0', { headers: { 'X-Family-Tree-Id': tree } });
    const text = await gedcom.text();
    expect(text).toMatch(new RegExp(`0 @S1@ SOUR[\\s\\S]*1 TITL Geburtsregister ${id}`));
    expect(text).toMatch(/1 BIRT[\s\S]*2 SOUR @S1@\r?\n3 PAGE Nr\. 7/);
    const fromGedcom = await importViaApi(request, Buffer.from(text), { strategy: 'MERGE_NEWER', target: 'NEW', treeName: `GEDCOM ${id}` });
    try {
      expect(await count()).toBe(before);
    } finally {
      await removeTree(request, fromGedcom.familyTreeId);
    }

    const result = await importViaApi(request, await res.body(), { strategy: 'MERGE_NEWER', target: 'NEW', treeName: `Kopie ${id}` });
    try {
      expect(await count()).toBe(before);
      const { getPersons } = await gql<{ getPersons: Array<{ id: string }> }>(request, '{ getPersons { id } }', {}, result.familyTreeId);
      const { personCitations } = await gql<{ personCitations: Array<{ fact: string; citation: { sourceId: string; linkCount: number } }> }>(
        request,
        'query($personId: ID!) { personCitations(personId: $personId) { fact citation { sourceId linkCount } } }',
        { personId: getPersons[0].id },
        result.familyTreeId,
      );
      // The same citation supports the birth in both family trees
      expect(personCitations).toEqual([{ fact: 'BIRTH', citation: { sourceId: createSource.id, linkCount: 2 } }]);
    } finally {
      await removeTree(request, result.familyTreeId);
    }
  } finally {
    await removeTree(request, tree);
  }
});
