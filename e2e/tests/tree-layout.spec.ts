import { test, expect, type APIRequestContext } from '@playwright/test';
import { createPerson, createRelation, uid } from './helpers';

/** Wide family with long names: three siblings, each with a partner, plus their children */
async function createWideFamily(request: APIRequestContext) {
  const id = uid();
  const person = (firstName: string, gender: 'MALE' | 'FEMALE') => createPerson(request, { firstName: `${firstName}${id}`, lastName: 'Ueberlappung', gender });
  const father = await person('Johann FriedrichWilhelm Maximilian', 'MALE');
  const mother = await person('Maria Barbara Katharina Sophie', 'FEMALE');
  await createRelation(request, father, mother, 'WIFE');
  for (const n of ['Anna', 'Berta', 'Clara']) {
    const child = await person(`${n} Elisabeth Charlotte`, 'FEMALE');
    const spouse = await person(`Ludwig ${n} Alexander Friedrich`, 'MALE');
    const grandchild = await person(`Enkel ${n}`, 'MALE');
    await createRelation(request, father, child, 'CHILD');
    await createRelation(request, child, spouse, 'HUSBAND');
    await createRelation(request, child, grandchild, 'CHILD');
  }
  return { father, id };
}

test('Cards in the family tree never overlap, even with long names', async ({ page, request }) => {
  const { father } = await createWideFamily(request);

  await page.goto(`/tree?person=${father}&view=descendants`);
  const cards = page.locator('.react-flow__node');
  await expect(cards.first()).toBeVisible();
  await expect.poll(() => cards.count()).toBeGreaterThanOrEqual(11);

  const rects = await cards.evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { name: el.textContent ?? '', left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }),
  );
  const overlaps: string[] = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      // A gap of at least one pixel in one direction is enough
      const separated = a.right <= b.left - 1 || b.right <= a.left - 1 || a.bottom <= b.top - 1 || b.bottom <= a.top - 1;
      if (!separated) overlaps.push(`${a.name} / ${b.name}`);
    }
  }
  expect(overlaps).toEqual([]);

  // All cards have the same width, long names wrap instead of widening the card
  const widths = new Set(rects.map((r) => Math.round(r.right - r.left)));
  expect(widths.size).toBe(1);
});
