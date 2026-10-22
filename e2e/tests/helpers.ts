import { expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Unique name suffix so tests can share the database without interfering.
 * Letters only – the form's name validation does not allow digits.
 */
export const uid = () => Array.from({ length: 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');

/** Header with which a request names its family tree (without: the oldest) */
export const treeHeader = (tree?: string): Record<string, string> => (tree ? { 'X-Family-Tree-Id': tree } : {});

/** Uploads an import or backup file once (as the page does) and returns its id */
export async function uploadFile(request: APIRequestContext, purpose: 'import' | 'backup', buffer: Buffer, name = 'datei.zip'): Promise<string> {
  const res = await request.post(`/api/v1/${purpose}/upload`, { multipart: { file: { name, mimeType: 'application/zip', buffer } }, timeout: 120_000 });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()).uploadId;
}

/** Follows a job of the backend (import, restore) until it has finished; its answer as the route gives it */
export async function finishedJob<T = Record<string, unknown>>(
  request: APIRequestContext,
  jobId: string,
): Promise<{ state: string; status: number; result: T }> {
  for (;;) {
    const res = await request.get(`/api/v1/jobs/${jobId}`);
    expect(res.ok(), await res.text()).toBeTruthy();
    const job = await res.json();
    if (job.state !== 'running') {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

/** Imports a file through the API like the page: upload, start, follow the job; fails if the import fails */
export async function importViaApi<T = { familyTreeId: string; createdPersons: number; removedPersons: number }>(
  request: APIRequestContext,
  file: Buffer,
  fields: { strategy: string; target?: 'NEW' | 'CURRENT'; treeName?: string },
  tree?: string,
): Promise<T> {
  const uploadId = await uploadFile(request, 'import', file, 'export.zip');
  const start = await request.post('/api/v1/import/execute', { headers: treeHeader(tree), data: { uploadId, decisions: {}, ...fields } });
  expect(start.status(), await start.text()).toBe(202);
  const job = await finishedJob<T>(request, (await start.json()).jobId);
  expect(job.state, JSON.stringify(job.result)).toBe('done');
  return job.result;
}

/** GraphQL call through the frontend proxy (like the app itself), optionally in a given family tree */
export async function gql<T = Record<string, unknown>>(
  request: APIRequestContext,
  query: string,
  variables: Record<string, unknown> = {},
  tree?: string,
): Promise<T> {
  const res = await request.post('/graphql', { data: { query, variables }, headers: treeHeader(tree) });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.errors, JSON.stringify(body.errors)).toBeUndefined();
  return body.data as T;
}

export async function createPerson(
  request: APIRequestContext,
  data: { firstName: string; lastName?: string; gender?: 'MALE' | 'FEMALE' | 'UNKNOWN'; birthDate?: string },
  tree?: string,
): Promise<string> {
  const res = await gql<{ createPerson: { id: string } }>(request, 'mutation($data: PersonInput!) { createPerson(data: $data) { id } }', { data }, tree);
  return res.createPerson.id;
}

/** Create a relation – semantics: "personB is <type> of personA"; test data is saved even if it looks wrong */
export async function createRelation(request: APIRequestContext, personAId: string, personBId: string, type: string, tree?: string) {
  const res = await gql<{ createRelation: { id: string } }>(
    request,
    'mutation($data: RelationInput!) { createRelation(data: $data, confirmed: true) { id } }',
    { data: { personAId, personBId, type } },
    tree,
  );
  return res.createRelation.id;
}

export async function findPersonId(request: APIRequestContext, firstName: string): Promise<string | undefined> {
  const res = await gql<{ getPersons: { id: string; firstName: string }[] }>(request, '{ getPersons(includeDeleted: true) { id firstName } }');
  return res.getPersons.find((p) => p.firstName === firstName)?.id;
}

/** New family tree (via API) – returns its id */
export async function createTree(request: APIRequestContext, name: string): Promise<string> {
  const res = await gql<{ createFamilyTree: { id: string } }>(request, 'mutation($data: FamilyTreeInput!) { createFamilyTree(data: $data) { id } }', {
    data: { name },
  });
  return res.createFamilyTree.id;
}

/** Remove a family tree with its data permanently (clean-up after tests); already deleted ones are skipped */
export async function removeTree(request: APIRequestContext, id: string) {
  const { familyTrees } = await gql<{ familyTrees: { id: string }[] }>(request, '{ familyTrees { id } }');
  if (familyTrees.some((t) => t.id === id)) await gql(request, 'mutation($id: ID!) { deleteFamilyTree(id: $id) }', { id });
  const { deletedFamilyTrees } = await gql<{ deletedFamilyTrees: { id: string }[] }>(request, '{ deletedFamilyTrees { id } }');
  if (deletedFamilyTrees.some((t) => t.id === id)) await gql(request, 'mutation($id: ID!) { hardDeleteFamilyTree(id: $id) }', { id });
}

/** Open the detail page and choose a tab */
export async function openPersonTab(page: Page, personId: string, tab: 'Beziehungen' | 'Medien' | 'Übersicht' | 'Lebenslauf') {
  await page.goto(`/persons/${personId}`);
  await page.getByRole('navigation', { name: 'Bereiche der Person' }).getByRole('button', { name: tab }).click();
}

/** A 1×1 PNG for upload tests */
export const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
