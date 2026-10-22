import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { DISABLE_MCP, ENABLE_MCP, MCP_SETTINGS, RENEW_MCP_TOKEN, SET_MCP_EXCLUDED_TREES, SET_MCP_PERMISSIONS } from '@/features/settings/graphql/mcpQueries';
import { makeTree, treesMock } from '@/test/fixtures';
import { McpSection } from '../McpSection';

// Tests run in cimode: texts are the keys themselves
const AREAS: Array<[string, string[]]> = [
  ['persons', ['off', 'read', 'write', 'delete']],
  ['backup', ['off', 'read', 'delete']],
];

const settings = (enabled: boolean, levels: Record<string, string> = {}, excludedTrees: string[] = []) => ({
  __typename: 'McpSettings',
  enabled,
  address: enabled ? 'http://127.0.0.1:4000/mcp' : null,
  portChanged: false,
  permissions: AREAS.map(([area, offered]) => ({ __typename: 'McpPermission', area, level: enabled ? (levels[area] ?? 'read') : 'off', levels: offered })),
  excludedTrees,
});

const query = (value: ReturnType<typeof settings>, maxUsageCount = Infinity): MockedResponse => ({
  request: { query: MCP_SETTINGS },
  result: { data: { mcpSettings: value } },
  maxUsageCount,
});

const trees = treesMock([makeTree({ id: 't1', name: 'Familie Muster' }), makeTree({ id: 't2', name: 'Familie Albrecht' })]);

function setup(mocks: MockedResponse[]) {
  render(
    <MockedProvider mocks={[trees, ...mocks]}>
      <McpSection />
    </MockedProvider>,
  );
}

describe('McpSection', () => {
  it('is off at first and switching on shows address, token and the commands once', async () => {
    const enable: MockedResponse = {
      request: { query: ENABLE_MCP },
      result: { data: { enableMcp: { __typename: 'McpToken', token: 'geheim-123', settings: settings(true) } } },
    };
    setup([query(settings(false), 1), enable, query(settings(true))]);
    const toggle = await screen.findByLabelText(/settings.mcp.enable/);
    expect(toggle).not.toBeChecked();
    expect(screen.queryByText('settings.mcp.connect')).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(await screen.findByText('geheim-123')).toBeInTheDocument();
    expect(screen.getByText('http://127.0.0.1:4000/mcp')).toBeInTheDocument();
    expect(
      screen.getByText(/claude mcp add --transport http cognatio http:\/\/127\.0\.0\.1:4000\/mcp --header "Authorization: Bearer geheim-123"/),
    ).toBeInTheDocument();
    expect(screen.getByText(/"Authorization": "Bearer geheim-123"/)).toBeInTheDocument();
    expect(screen.getByText('settings.mcp.tokenOnce')).toBeInTheDocument();
  });

  it('shows no token later, but makes a new one on request and copies it', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const renew: MockedResponse = {
      request: { query: RENEW_MCP_TOKEN },
      result: { data: { renewMcpToken: { __typename: 'McpToken', token: 'neu-456', settings: settings(true) } } },
    };
    setup([query(settings(true)), renew]);
    expect(await screen.findByText('settings.mcp.tokenHidden')).toBeInTheDocument();
    expect(screen.getByTestId('mcp-summary')).toHaveTextContent('settings.mcp.summary.readOnly');

    fireEvent.click(screen.getByRole('button', { name: 'settings.mcp.renew' }));
    expect(await screen.findByText('neu-456')).toBeInTheDocument();
    // Address, token, command, JSON block: the second one is the token
    fireEvent.click(screen.getAllByRole('button', { name: 'settings.mcp.copy' })[1]);
    expect(await screen.findByText('settings.mcp.copied')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('neu-456');
  });

  it('shows the permissions as boxes; a higher level includes the lower ones', async () => {
    setup([query(settings(true, { persons: 'write' }))]);
    expect(await screen.findByLabelText('settings.mcp.areas.persons.name: settings.mcp.columns.read')).toBeChecked();
    expect(screen.getByLabelText('settings.mcp.areas.persons.name: settings.mcp.columns.write')).toBeChecked();
    expect(screen.getByLabelText('settings.mcp.areas.persons.name: settings.mcp.columns.delete')).not.toBeChecked();
    // Backup has no "write"
    expect(screen.queryByLabelText('settings.mcp.areas.backup.name: settings.mcp.columns.write')).not.toBeInTheDocument();
    expect(screen.getByLabelText('settings.mcp.areas.backup.name: settings.mcp.columns.delete')).not.toBeChecked();
  });

  it('warns before "write" and changes nothing on cancel', async () => {
    const save: MockedResponse = {
      request: { query: SET_MCP_PERMISSIONS, variables: { permissions: [{ area: 'persons', level: 'write' }] } },
      result: { data: { setMcpPermissions: settings(true, { persons: 'write' }) } },
    };
    setup([query(settings(true)), save]);
    const write = await screen.findByLabelText('settings.mcp.areas.persons.name: settings.mcp.columns.write');

    fireEvent.click(write);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('settings.mcp.warning.write.text')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'common.cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(write).not.toBeChecked();

    fireEvent.click(write);
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'settings.mcp.warning.confirm' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('lowers a level without asking: unticking "read" switches the area off', async () => {
    const lower: MockedResponse = {
      request: { query: SET_MCP_PERMISSIONS, variables: { permissions: [{ area: 'backup', level: 'off' }] } },
      result: { data: { setMcpPermissions: settings(true, { backup: 'off' }) } },
    };
    setup([query(settings(true), 1), lower, query(settings(true, { backup: 'off' }))]);
    fireEvent.click(await screen.findByLabelText('settings.mcp.areas.backup.name: settings.mcp.columns.read'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('settings.mcp.areas.backup.name: settings.mcp.columns.read')).not.toBeChecked());
  });

  it('shows a change at once and keeps the other boxes usable while it is saved', async () => {
    const slow: MockedResponse = {
      request: { query: SET_MCP_PERMISSIONS, variables: { permissions: [{ area: 'backup', level: 'off' }] } },
      result: { data: { setMcpPermissions: settings(true, { backup: 'off' }) } },
      delay: 500,
    };
    setup([query(settings(true), 1), slow]);
    fireEvent.click(await screen.findByLabelText('settings.mcp.areas.backup.name: settings.mcp.columns.read'));
    expect(screen.getByLabelText('settings.mcp.areas.backup.name: settings.mcp.columns.read')).not.toBeChecked();
    expect(screen.getByLabelText('settings.mcp.areas.persons.name: settings.mcp.columns.read')).toBeEnabled();
    expect(screen.getByLabelText('settings.mcp.areas.persons.name: settings.mcp.columns.read')).toBeChecked();
  });

  it('sets a level for all areas at once after one warning', async () => {
    const all: MockedResponse = {
      request: {
        query: SET_MCP_PERMISSIONS,
        variables: {
          permissions: [
            { area: 'persons', level: 'delete' },
            { area: 'backup', level: 'delete' },
          ],
        },
      },
      result: { data: { setMcpPermissions: settings(true, { persons: 'delete', backup: 'delete' }) } },
    };
    setup([query(settings(true), 1), all, query(settings(true, { persons: 'delete', backup: 'delete' }))]);
    fireEvent.click(await screen.findByLabelText('settings.mcp.allAreas: settings.mcp.columns.delete'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('settings.mcp.warning.delete.text')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'settings.mcp.warning.confirm' }));
    await waitFor(() => expect(screen.getByLabelText('settings.mcp.areas.backup.name: settings.mcp.columns.delete')).toBeChecked());
    expect(screen.getByLabelText('settings.mcp.allAreas: settings.mcp.columns.delete')).toBeChecked();
    expect(screen.getByTestId('mcp-summary')).toHaveTextContent('settings.mcp.summary.everything');
  });

  it('hides a family tree from assistants', async () => {
    const exclude: MockedResponse = {
      request: { query: SET_MCP_EXCLUDED_TREES, variables: { ids: ['t2'] } },
      result: { data: { setMcpExcludedTrees: settings(true, {}, ['t2']) } },
    };
    setup([query(settings(true)), exclude]);
    const albrecht = await screen.findByLabelText('Familie Albrecht');
    expect(albrecht).toBeChecked();
    fireEvent.click(albrecht);
    await waitFor(() => expect(screen.getByLabelText('Familie Muster')).toBeChecked());
  });

  it('hides and shows all family trees at once', async () => {
    const none: MockedResponse = {
      request: { query: SET_MCP_EXCLUDED_TREES, variables: { ids: ['t1', 't2'] } },
      result: { data: { setMcpExcludedTrees: settings(true, {}, ['t1', 't2']) } },
    };
    const all: MockedResponse = {
      request: { query: SET_MCP_EXCLUDED_TREES, variables: { ids: [] } },
      result: { data: { setMcpExcludedTrees: settings(true) } },
    };
    setup([query(settings(true, {}, ['t2']), 1), all, query(settings(true), 1), none, query(settings(true, {}, ['t1', 't2']))]);
    const allTrees = (await screen.findByLabelText('settings.mcp.allTrees')) as HTMLInputElement;
    // One of two is visible: partly ticked
    expect(allTrees.indeterminate).toBe(true);

    fireEvent.click(allTrees);
    await waitFor(() => expect(screen.getByLabelText('Familie Albrecht')).toBeChecked());
    expect(allTrees).toBeChecked();

    fireEvent.click(allTrees);
    await waitFor(() => expect(screen.getByLabelText('Familie Muster')).not.toBeChecked());
    expect(screen.getByLabelText('Familie Albrecht')).not.toBeChecked();
  });

  it('selects the text and says so when copying is not possible', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => Promise.reject(new Error('denied'))) } });
    Object.defineProperty(document, 'execCommand', { value: () => false, configurable: true });
    setup([query(settings(true))]);
    fireEvent.click((await screen.findAllByRole('button', { name: 'settings.mcp.copy' }))[0]);
    expect(await screen.findByRole('alert')).toHaveTextContent('settings.mcp.copyFailed');
    expect(window.getSelection()?.toString()).toBe('http://127.0.0.1:4000/mcp');
  });

  it('switches off', async () => {
    const disable: MockedResponse = { request: { query: DISABLE_MCP }, result: { data: { disableMcp: settings(false) } } };
    setup([query(settings(true)), disable]);
    fireEvent.click(await screen.findByLabelText(/settings.mcp.enable/));
    await waitFor(() => expect(screen.getByLabelText(/settings.mcp.enable/)).not.toBeDisabled());
  });
});
