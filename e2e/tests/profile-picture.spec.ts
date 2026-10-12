import { test, expect, type Locator } from '@playwright/test';
import { createPerson, openPersonTab, PNG_1x1, uid } from './helpers';

/** The image is not only embedded but was actually loaded (through the proxy) */
const expectLoaded = async (img: Locator) => {
  await expect(img).toHaveAttribute('src', /^\/uploads\//);
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
};

test('Upload a profile picture: appears on the detail page, in the list, in the family tree and in the media tab', async ({ page, request }) => {
  const name = `Paula${uid()}`;
  const personId = await createPerson(request, { firstName: name, lastName: 'Test', gender: 'FEMALE' });

  await page.goto(`/persons/${personId}`);
  const avatarButton = page.getByRole('button', { name: 'Profilbild hochladen' });
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
    name: 'portrait.png',
    mimeType: 'image/png',
    buffer: PNG_1x1,
  });
  await expectLoaded(avatarButton.locator('img'));

  // Personenliste
  await page.goto('/persons');
  await expectLoaded(
    page
      .getByRole('link')
      .filter({ hasText: `${name} Test` })
      .locator('img'),
  );

  // Family tree – with Paula as focus person, otherwise her node lies outside the visible area with a lot of test data
  // and the (lazy-loaded) image is never requested
  await page.goto(`/tree?person=${personId}`);
  await expectLoaded(page.locator('.react-flow__node', { hasText: `${name} Test` }).locator('img'));

  // Media tab: marked as profile picture; removing resets the avatar
  await openPersonTab(page, personId, 'Medien');
  await expect(page.getByText('Profilbild', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Profilbild entfernen' }).first().click();
  await expect(avatarButton.locator('img')).toHaveCount(0);
});

test('Non-image files are rejected as profile picture', async ({ page, request }) => {
  const personId = await createPerson(request, { firstName: `Pia${uid()}`, lastName: 'Test' });
  await page.goto(`/persons/${personId}`);
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
    name: 'urkunde.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
  });
  await expect(page.getByRole('alert')).toHaveText('Bitte eine Bilddatei auswählen.');
});
