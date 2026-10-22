import { test, expect, type APIRequestContext } from '@playwright/test';
import { createPerson, createTree, gql, removeTree, uid } from './helpers';

// The backend of the tests (playwright.config.ts): assistants connect to it directly, not through the frontend
const MCP = 'http://127.0.0.1:4100/mcp';

/** A JSON-RPC request of an assistant */
function mcp(request: APIRequestContext, token: string | null, method: string, params: Record<string, unknown> = {}) {
  return request.post(MCP, {
    headers: { Accept: 'application/json, text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    data: { jsonrpc: '2.0', id: 1, method, params },
  });
}

/** The answer of a tool: its text parsed as JSON, or the error text */
async function callTool(request: APIRequestContext, token: string, name: string, args: Record<string, unknown>) {
  const res = await mcp(request, token, 'tools/call', { name, arguments: args });
  expect(res.ok(), await res.text()).toBeTruthy();
  const { result } = await res.json();
  const text = result.content[0].text as string;
  return result.isError ? { error: text } : { data: JSON.parse(text) };
}

test('AI assistants (MCP): switched on in the settings, an assistant reads and – once allowed – writes', async ({ page, request }) => {
  const name = uid();
  const treeName = `MCP ${name}`;
  const tree = await createTree(request, treeName);
  const personId = await createPerson(request, { firstName: 'Ida', lastName: `Mcp${name}`, birthDate: '1920' }, tree);
  let token = '';
  // A defined start: switched off (also after a run that was broken off)
  await gql(request, 'mutation { disableMcp { enabled } }');
  try {
    // Off at first: the endpoint does not exist
    expect((await mcp(request, 'irgendwas', 'tools/list')).status()).toBe(404);

    await page.goto('/settings#mcp');
    const section = page.getByRole('region', { name: 'KI-Assistenten (MCP)' });
    // The box follows the server: it is ticked once the backend has switched MCP on
    await section.getByLabel(/KI-Assistenten erlauben/).click();
    await expect(section.getByLabel(/KI-Assistenten erlauben/)).toBeChecked();
    await expect(section.getByText('Das Token wird nur jetzt angezeigt.', { exact: false })).toBeVisible();
    await expect(section.getByTestId('mcp-summary')).toHaveText('An – nur lesen');
    await expect(section.locator('#settings-mcp-address')).toHaveText(MCP);
    token = (await section.locator('#settings-mcp-token').textContent())!.trim();
    expect(token).toMatch(/^[\w-]{43}$/);
    await expect(section.locator('#settings-mcp-claude-code')).toContainText(
      `claude mcp add --transport http cognatio ${MCP} --header "Authorization: Bearer ${token}"`,
    );

    // An assistant connects, sees only reading tools and finds the person
    const init = await mcp(request, token, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e-client', version: '1' } });
    expect((await init.json()).result.serverInfo.name).toBe('cognatio');
    const tools = (await (await mcp(request, token, 'tools/list')).json()).result.tools.map((t: { name: string }) => t.name);
    expect(tools).toContain('search');
    expect(tools).not.toContain('add_event');
    const found = await callTool(request, token, 'search', { query: `Mcp${name}`, familyTree: treeName });
    expect(found.data.persons).toEqual([expect.objectContaining({ id: personId, name: `Ida Mcp${name}`, birth: { date: '1920', place: null } })]);
    expect((await mcp(request, null, 'tools/list')).status()).toBe(401);

    // "Write" for persons only after the warning
    const write = section.getByLabel('Personen, Lebensereignisse, Notizen, Beziehungen: Schreiben');
    await write.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Änderungen in „Personen, Lebensereignisse, Notizen, Beziehungen“ erlauben?');
    await dialog.getByRole('button', { name: 'Erlauben' }).click();
    await expect(write).toBeChecked();
    await expect(section.getByLabel('Personen, Lebensereignisse, Notizen, Beziehungen: Lesen')).toBeChecked();
    await expect(section.getByTestId('mcp-summary')).toHaveText('An – lesen und schreiben');

    // The assistant adds a life event; it is in the database and under "Vorgänge"
    const added = await callTool(request, token, 'add_event', {
      familyTree: treeName,
      personId,
      title: 'Taufe',
      category: 'BAPTISM',
      date: '1920-05-02',
      place: 'Leipzig',
    });
    expect(added.data).toMatchObject({ title: 'Taufe', date: '02.05.1920', datePrecision: 'EXACT', place: 'Leipzig' });
    const { getEvents } = await gql<{ getEvents: Array<{ title: string; place: string }> }>(
      request,
      'query($id: ID!) { getEvents(personId: $id) { title place } }',
      { id: personId },
      tree,
    );
    expect(getEvents).toEqual([{ title: 'Taufe', place: 'Leipzig' }]);
    await page
      .getByRole('navigation')
      .getByRole('link', { name: /Vorgänge/ })
      .click();
    await expect(page.getByTestId('activity-finished').first()).toContainText(`KI-Assistent: Ida Mcp${name}`, { timeout: 15_000 });
    await expect(page.getByTestId('activity-finished').first()).toContainText('e2e-client: Lebensereignis hinzugefügt.');

    // Deleting stays refused: "delete" was not granted
    const refused = await callTool(request, token, 'delete_event', { familyTree: treeName, personId, eventId: 'egal' });
    expect(refused.error).toBeTruthy();

    // A cycle is refused as in the app
    const cycle = await callTool(request, token, 'create_relation', { familyTree: treeName, personId, relatedPersonId: personId, relation: 'MOTHER' });
    expect(cycle.error).toBeTruthy();
  } finally {
    // Switched off again: the token is invalid at once
    await page.goto('/settings#mcp');
    const toggle = page.getByRole('region', { name: 'KI-Assistenten (MCP)' }).getByLabel(/KI-Assistenten erlauben/);
    if (await toggle.isChecked()) {
      await toggle.click();
      await expect(toggle).not.toBeChecked();
    }
    if (token) {
      expect((await mcp(request, token, 'tools/list')).status()).toBe(404);
    }
    await removeTree(request, tree);
  }
});
