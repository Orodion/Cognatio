import { test, expect } from '@playwright/test';
import { createPerson, findPersonId, uid } from './helpers';

test('Delete, undo, recycle bin, restore and delete permanently', async ({ page, request }) => {
  const name = `Otto${uid()}`;
  const personId = await createPerson(request, { firstName: name, lastName: 'Test' });
  const fullName = `${name} Test`;
  page.on('dialog', (dialog) => dialog.accept());
  // Card in the person list (after deleting, the name also appears in the hint)
  const personCard = page.getByRole('link').filter({ hasText: fullName });

  const deleteFromDetailPage = async () => {
    await page.goto(`/persons/${personId}`);
    await page.getByRole('button', { name: 'Löschen', exact: true }).click();
    await expect(page).toHaveURL(/\/persons$/);
  };

  // 1. Delete and undo right away
  await deleteFromDetailPage();
  const hint = page.getByRole('status').filter({ hasText: 'in den Papierkorb verschoben' });
  await expect(hint).toContainText(fullName);
  await hint.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(hint).toBeHidden();
  await expect(personCard).toBeVisible();

  // 2. Delete again and restore from the recycle bin
  await deleteFromDetailPage();
  await expect(personCard).toBeHidden();
  // Own entry in the navigation, with the number of deleted entries
  const trashLink = page.getByRole('navigation').getByRole('link', { name: /Papierkorb/ });
  await expect(trashLink).toContainText(/\d/);
  await trashLink.click();
  const row = page.getByRole('listitem').filter({ hasText: fullName });
  await row.getByRole('button', { name: 'Wiederherstellen' }).click();
  await expect(row).toBeHidden();
  await page.goto('/persons');
  await expect(personCard).toBeVisible();

  // 3. A deleted person shows a hint on the detail page; delete permanently
  await deleteFromDetailPage();
  await page.goto(`/persons/${personId}`);
  await expect(page.getByRole('status')).toContainText('Papierkorb');
  await expect(page.getByRole('button', { name: 'Bearbeiten' })).toBeHidden();
  await page.getByRole('button', { name: 'Endgültig löschen' }).click();
  await expect(page).toHaveURL(/\/trash$/);
  await expect(page.getByRole('listitem').filter({ hasText: fullName })).toHaveCount(0);

  expect(await findPersonId(request, name)).toBeUndefined();
});
