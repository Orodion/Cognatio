import { test, expect } from '@playwright/test';
import { createPerson, createRelation, createTree, gql, removeTree, uid } from './helpers';

const created: string[] = [];
test.afterAll(async ({ request }) => {
  for (const tree of created) await removeTree(request, tree);
});

test('a report opens from the person, lists ancestors with Kekulé numbers and prints only the report', async ({ page, request }) => {
  const id = uid();
  const tree = await createTree(request, `Berichte ${id}`);
  created.push(tree);
  const child = await createPerson(request, { firstName: `Kind${id}`, lastName: 'Bericht', gender: 'MALE', birthDate: '04.01.1950' }, tree);
  const father = await createPerson(request, { firstName: `Vater${id}`, lastName: 'Bericht', gender: 'MALE', birthDate: '1920' }, tree);
  const mother = await createPerson(request, { firstName: `Mutter${id}`, lastName: 'Bericht', gender: 'FEMALE', birthDate: '1925' }, tree);
  await createRelation(request, child, father, 'FATHER', tree);
  await createRelation(request, child, mother, 'MOTHER', tree);
  await gql(
    request,
    'mutation($data: RelationInput!) { createRelation(data: $data) { id } }',
    {
      data: { personAId: father, personBId: mother, type: 'WIFE', startDate: '1948-06-12' },
    },
    tree,
  );

  // The button at the person opens the person sheet of this person
  await page.goto(`/persons/${child}`);
  await page.getByRole('main').getByRole('link', { name: 'Bericht', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/reports\\?person=${child}`));
  const report = page.getByTestId('report');
  await expect(report.getByRole('heading', { name: `Kind${id} Bericht`, level: 2 })).toBeVisible();
  await expect(report).toContainText(`Vater${id} Bericht (* 1920)`);
  await expect(report).toContainText('04.01.1950');

  // Ancestor list: start person 1, father 2 with the wedding, mother 3
  await page.getByLabel('Bericht', { exact: true }).selectOption({ label: 'Ahnenliste' });
  const rows = report.getByRole('row');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText(`1Kind${id} Bericht`);
  await expect(rows.nth(1)).toContainText(`2Vater${id} Bericht`);
  await expect(rows.nth(1)).toContainText('verheiratet am 12.06.1948');
  await expect(rows.nth(2)).toContainText(`3Mutter${id} Bericht`);

  // Printing hands only the report to the browser and cleans up afterwards
  await page.evaluate(() => {
    const w = window as unknown as { printed: string[] };
    w.printed = [];
    window.print = () => {
      w.printed.push(`${document.title}|${document.getElementById('report-print-root')?.textContent ?? ''}`);
    };
  });
  await page.getByRole('button', { name: 'Drucken' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { printed: string[] }).printed.length)).toBe(1);
  const printed = await page.evaluate(() => (window as unknown as { printed: string[] }).printed[0]);
  expect(printed).toContain(`Ahnenliste – Kind${id} Bericht|`);
  expect(printed).toContain(`Mutter${id} Bericht`);
  await expect(page.locator('#report-print-root')).toHaveCount(0);
  // In the browser the PDF is a printer of the print dialog
  await expect(page.getByText('Wähle im Druckdialog „Als PDF speichern“ als Drucker.')).toBeVisible();
});

test('the descendant list numbers the generations d’Aboville style and names the partners', async ({ page, request }) => {
  const id = uid();
  const tree = await createTree(request, `Nachkommen ${id}`);
  created.push(tree);
  const grandpa = await createPerson(request, { firstName: `Opa${id}`, lastName: 'Linie', gender: 'MALE' }, tree);
  const grandma = await createPerson(request, { firstName: `Oma${id}`, lastName: 'Linie', gender: 'FEMALE' }, tree);
  const son = await createPerson(request, { firstName: `Sohn${id}`, lastName: 'Linie', gender: 'MALE' }, tree);
  const grandchild = await createPerson(request, { firstName: `Enkel${id}`, lastName: 'Linie', gender: 'MALE' }, tree);
  await createRelation(request, grandpa, grandma, 'WIFE', tree);
  // The wife of the father becomes the mother at once
  await createRelation(request, son, grandpa, 'FATHER', tree);
  await createRelation(request, grandchild, son, 'FATHER', tree);

  // Opening a person of the family tree opens the family tree
  await page.goto(`/persons/${grandpa}`);
  await expect(page.getByRole('heading', { name: `Opa${id} Linie` })).toBeVisible();
  await page.goto(`/reports?type=descendants&person=${grandpa}`);
  const report = page.getByTestId('report');
  await expect(report).toContainText(new RegExp(`1\\s*Opa${id} Linie.*Partner: Oma${id} Linie.*1\\.1\\s*Sohn${id} Linie.*1\\.1\\.1\\s*Enkel${id} Linie`));

  // Fewer generations leave the grandchild out
  await page.getByLabel('Generationen').selectOption('2');
  await expect(report).toContainText(`Sohn${id} Linie`);
  await expect(report).not.toContainText(`Enkel${id} Linie`);
});
