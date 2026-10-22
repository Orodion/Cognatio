import { test, expect } from '@playwright/test';
import { createPerson, createTree, gql, removeTree, uid } from './helpers';

let tree: string | undefined;
test.afterAll(async ({ request }) => {
  if (tree) await removeTree(request, tree);
});

const pad = (n: number) => String(n).padStart(2, '0');

test('the start page lists birthdays and wedding days of the coming days', async ({ page, request }) => {
  const id = uid();
  tree = await createTree(request, `Jahrestage ${id}`);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  // Born exactly 30 years ago today
  const birthday = `${pad(today.getDate())}.${pad(today.getMonth() + 1)}.${today.getFullYear() - 30}`;
  const anna = await createPerson(request, { firstName: `Anna${id}`, lastName: 'Fest', gender: 'FEMALE', birthDate: birthday }, tree);
  const otto = await createPerson(request, { firstName: `Otto${id}`, lastName: 'Fest', gender: 'MALE' }, tree);
  // Married tomorrow 25 years ago
  const wedding = `${tomorrow.getFullYear() - 25}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
  await gql(
    request,
    'mutation($data: RelationInput!) { createRelation(data: $data) { id } }',
    {
      data: { personAId: otto, personBId: anna, type: 'WIFE', startDate: wedding },
    },
    tree,
  );
  // Without a day: no anniversary
  await createPerson(request, { firstName: `Ohne${id}`, lastName: 'Fest', birthDate: String(today.getFullYear() - 40) }, tree);

  // Opening a person of the family tree opens the family tree
  await page.goto(`/persons/${anna}`);
  await expect(page.getByRole('heading', { name: `Anna${id} Fest` })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click();

  const card = page.getByRole('heading', { name: 'Jahrestage' }).locator('xpath=ancestor::div[.//ul][1]');
  const items = card.getByRole('listitem');
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText(`Anna${id} Fest`);
  await expect(items.nth(0)).toContainText('Wird 30');
  await expect(items.nth(0)).toContainText('Heute');
  await expect(items.nth(1)).toContainText(`Otto${id} Fest & Anna${id} Fest`);
  await expect(items.nth(1)).toContainText('Vor 25 Jahren geheiratet');
  await expect(items.nth(1)).toContainText('Morgen');
  await expect(card).not.toContainText(`Ohne${id}`);

  // A name leads to the person
  await items
    .nth(0)
    .getByRole('link', { name: `Anna${id} Fest` })
    .click();
  await expect(page).toHaveURL(new RegExp(`/persons/${anna}$`));
});
