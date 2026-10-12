import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { createPerson, createRelation, uid } from './helpers';

/**
 * Family over three generations:
 *   Otto ∞ Olga
 *   ├── Viktor ∞ Maria
 *   │   └── Karl
 *   │       └── Emil
 *   └── Udo
 */
async function createFamily(request: APIRequestContext) {
  const id = uid();
  const name = (firstName: string) => `${firstName}${id}`;
  const person = (firstName: string, gender: 'MALE' | 'FEMALE') => createPerson(request, { firstName: name(firstName), lastName: 'Baum', gender });

  const otto = await person('Otto', 'MALE');
  const olga = await person('Olga', 'FEMALE');
  const viktor = await person('Viktor', 'MALE');
  const maria = await person('Maria', 'FEMALE');
  const karl = await person('Karl', 'MALE');
  const emil = await person('Emil', 'MALE');
  const udo = await person('Udo', 'MALE');

  // Marriages first: children are then also assigned to the spouse automatically
  await createRelation(request, otto, olga, 'WIFE');
  await createRelation(request, viktor, maria, 'WIFE');
  await createRelation(request, otto, viktor, 'CHILD');
  await createRelation(request, otto, udo, 'CHILD');
  await createRelation(request, viktor, karl, 'CHILD');
  await createRelation(request, karl, emil, 'CHILD');

  return { ids: { otto, olga, viktor, maria, karl, emil, udo }, name };
}

const node = (page: Page, text: string) => page.locator('.react-flow__node', { hasText: `${text} Baum` });

async function expectVisible(page: Page, shown: string[], hidden: string[]) {
  for (const n of shown) await expect(node(page, n)).toBeVisible();
  for (const n of hidden) await expect(node(page, n)).toHaveCount(0);
}

test('Ancestor and descendant charts show the right generations', async ({ page, request }) => {
  const { ids, name } = await createFamily(request);

  // From the detail page into the family tree – the person becomes the focus person
  await page.goto(`/persons/${ids.karl}`);
  await page.getByRole('link', { name: 'Stammbaum anzeigen' }).click();
  await expect(page).toHaveURL(new RegExp(`/tree\\?person=${ids.karl}`));
  await expect(node(page, name('Karl')).locator('[data-focus="true"]')).toBeVisible();

  // Ancestor chart: only Karl and his ancestors
  await page.getByLabel('Ansicht').selectOption({ label: 'Vorfahrentafel' });
  await expect(page).toHaveURL(/view=ancestors/);
  await expectVisible(page, [name('Karl'), name('Viktor'), name('Maria'), name('Otto'), name('Olga')], [name('Emil'), name('Udo')]);

  // One generation less: the grandparents drop out
  await page.getByLabel('Generationen').selectOption('2');
  await expectVisible(page, [name('Viktor'), name('Otto')], [name('Emil')]);
  await page.getByLabel('Fokusperson', { exact: true }).selectOption({ label: `${name('Emil')} Baum` });
  await expectVisible(page, [name('Emil'), name('Karl'), name('Viktor'), name('Maria')], [name('Otto'), name('Olga')]);

  // Descendant chart from Otto: descendants including spouses, limited to two generations
  await page.getByLabel('Ansicht').selectOption({ label: 'Nachfahrentafel' });
  await page.getByLabel('Fokusperson', { exact: true }).selectOption({ label: `${name('Otto')} Baum` });
  await expectVisible(page, [name('Otto'), name('Olga'), name('Viktor'), name('Maria'), name('Udo'), name('Karl')], [name('Emil')]);
  await page.getByLabel('Generationen').selectOption({ label: 'Alle' });
  await expectVisible(page, [name('Emil')], []);

  // The view is kept on reload (the state is in the URL)
  await page.reload();
  await expect(page.getByLabel('Ansicht')).toHaveValue('descendants');
  await expectVisible(page, [name('Otto'), name('Emil')], []);
});

test('Change the focus person in the graph and network with siblings', async ({ page, request }) => {
  const { ids, name } = await createFamily(request);
  // Viktor and Udo are linked as siblings automatically via their common father

  await page.goto(`/tree?view=ancestors&person=${ids.emil}&generations=2`);
  await expectVisible(page, [name('Emil'), name('Karl'), name('Viktor')], [name('Otto')]);

  // The view opens centred on the focus person – fit everything first to click the others
  await page.locator('.react-flow__controls-fitview').click();
  // Make Viktor the focus person via the node button – now Otto and Olga are visible
  await page.getByRole('button', { name: `${name('Viktor')} Baum als Fokusperson wählen` }).click();
  await expect(page).toHaveURL(new RegExp(`person=${ids.viktor}`));
  await expectVisible(page, [name('Viktor'), name('Otto'), name('Olga')], [name('Emil')]);

  // Network: persons reachable via the sibling relation appear as well
  await page.getByLabel('Ansicht').selectOption({ label: 'Verwandtschaftsnetzwerk' });
  await expectVisible(page, [name('Udo'), name('Viktor')], []);
  await expect(page.locator('.react-flow__edge')).not.toHaveCount(0);
});

test('Export the family tree as PNG and SVG', async ({ page, request }) => {
  const { ids, name } = await createFamily(request);
  await page.goto(`/tree?view=descendants&person=${ids.otto}`);
  await expect(node(page, name('Emil'))).toBeVisible();

  for (const format of ['PNG', 'SVG'] as const) {
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: format, exact: true }).click()]);
    expect(download.suggestedFilename()).toMatch(new RegExp(`^family-tree-descendants-\\d{4}-\\d{2}-\\d{2}\\.${format.toLowerCase()}$`));
  }
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('Export only the visible area', async ({ page, request }) => {
  const { ids, name } = await createFamily(request);
  await page.goto(`/tree?view=descendants&person=${ids.otto}`);
  await expect(node(page, name('Emil'))).toBeVisible();

  const flow = page.locator('.react-flow');
  const box = (await flow.boundingBox())!;
  await page.getByLabel('Nur sichtbarer Ausschnitt').check();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PNG', exact: true }).click()]);
  const file = await download.path();
  const png = (await import('node:fs')).readFileSync(file);
  // PNG header: width/height from byte 16 – matches the area (double pixel density)
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  expect(width / height).toBeCloseTo(box.width / box.height, 1);
});

test('Family tree settings are remembered and the focus person is centred', async ({ page, request }) => {
  const { ids, name } = await createFamily(request);
  await page.goto('/tree');
  // Option with date of birth if known (none recorded here – only the name)
  await page.getByLabel('Fokusperson', { exact: true }).selectOption({ label: `${name('Emil')} Baum` });
  await page.getByLabel('Ansicht').selectOption({ label: 'Vorfahrentafel' });
  await page.getByLabel('Generationen').selectOption('2');

  // Opened again later via the menu: same settings, without parameters in the address
  await page.goto('/');
  await page.getByRole('navigation').getByRole('link', { name: 'Stammbaum' }).click();
  await expect(page).toHaveURL(/\/tree$/);
  await expect(page.getByLabel('Fokusperson', { exact: true })).toHaveValue(ids.emil);
  await expect(page.getByLabel('Ansicht')).toHaveValue('ancestors');
  await expect(page.getByLabel('Generationen')).toHaveValue('2');
  await expectVisible(page, [name('Emil'), name('Karl'), name('Viktor')], [name('Otto')]);

  // The focus person is in the centre of the family tree
  const pane = await page.getByTestId('family-tree').boundingBox();
  const focus = await node(page, name('Emil')).boundingBox();
  expect(Math.abs(focus!.x + focus!.width / 2 - (pane!.x + pane!.width / 2))).toBeLessThan(5);
});

test('Moving a card keeps the connection lines attached to it', async ({ page, request }) => {
  const { ids, name } = await createFamily(request);
  await page.goto(`/tree?person=${ids.otto}`);
  const olga = node(page, name('Olga'));
  await expect(olga).toBeVisible();

  const edgePaths = () => page.locator('.react-flow__edge-path').evaluateAll((els) => els.map((el) => el.getAttribute('d')));
  const before = await edgePaths();

  // Drag Olga down: the partner line must follow her centre, the family lines start on the partner line
  const box = (await olga.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 120, { steps: 8 });
  await page.mouse.up();

  await expect.poll(async () => JSON.stringify(await edgePaths())).not.toBe(JSON.stringify(before));
  const moved = (await olga.boundingBox())!;
  const centerY = moved.y + moved.height / 2;

  // The dashed partner line ends at the left side of Olga's card at her current centre height
  const partner = page.locator('.react-flow__edge-partner .react-flow__edge-path').first();
  const line = (await partner.boundingBox())!;
  const bottom = line.y + line.height;
  expect(Math.abs(bottom - centerY)).toBeLessThan(4);
});
