import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { SET_LOG_LEVEL, SYSTEM_INFO } from '@/features/settings/graphql/systemQueries';
import { MCP_SETTINGS } from '@/features/settings/graphql/mcpQueries';
import { getClientLog, logClient } from '@/lib/clientLog';
import { GET_PERSONS } from '@/features/persons/graphql/personQueries';
import { makePerson } from '@/test/fixtures';
import i18n from '@/i18n';
import { focusIdOf, useSettingsStore } from '@/stores/settingsStore';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import { useThemeStore } from '@/stores/themeStore';
import { SettingsPage } from '../SettingsPage';

/** The blocks are closed by default */
const open = (...ids: string[]) => useSettingsStore.getState().setSectionsOpen(ids, true);

// The focus person is stored per family tree – the tests work in family tree t1
useActiveTreeStore.setState({ treeId: 't1' });
const focus = () => focusIdOf(useSettingsStore.getState().treeFocusIds, 't1');

const info = (overrides: Record<string, unknown> = {}) => ({
  __typename: 'SystemInfo',
  version: '1.2.3',
  database: 'ok',
  trees: 2,
  persons: 1234,
  deletedPersons: 2,
  media: 5,
  mediaBytes: 3 * 1024 * 1024,
  lastImportAt: '2026-09-20T08:00:00.000Z',
  lastBackupAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  backupCount: 14,
  backupDir: '/srv/cognatio/backups',
  logLevel: 'info',
  ...overrides,
});

/** Section "MCP" switched off */
const mcpOff: MockedResponse = {
  request: { query: MCP_SETTINGS },
  result: { data: { mcpSettings: { enabled: false, address: null, portChanged: false, permissions: [], excludedTrees: [] } } },
  maxUsageCount: Infinity,
};

function setup(result: MockedResponse['result'] = { data: { systemInfo: info() } }, error?: Error) {
  const mocks: MockedResponse[] = [
    { request: { query: SYSTEM_INFO }, ...(error ? { error } : { result }) },
    {
      request: { query: GET_PERSONS, variables: { includeDeleted: false } },
      result: { data: { getPersons: [makePerson({ id: 'p1', firstName: 'Anton' }), makePerson({ id: 'p2', firstName: 'Berta' })] } },
      maxUsageCount: Infinity,
    },
    mcpOff,
  ];
  render(
    <MockedProvider mocks={mocks}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(() => {
  localStorage.removeItem('cognatio-language');
  useSettingsStore.setState({ treeView: 'tree', treeDepth: null, treeFocusIds: {}, treeExportVisibleOnly: false, openSections: [] });
  useThemeStore.getState().setTheme('light');
  vi.restoreAllMocks();
});

describe('SettingsPage', () => {
  it('changes language and colour scheme of this device', async () => {
    // Do not really switch: the tests output keys instead of texts (cimode)
    const change = vi.spyOn(i18n, 'changeLanguage').mockResolvedValue(i18n.t);
    setup();
    fireEvent.change(screen.getByLabelText('header.language'), { target: { value: 'en' } });
    expect(change).toHaveBeenCalledWith('en');
    expect(localStorage.getItem('cognatio-language')).toBe('en');

    fireEvent.change(screen.getByLabelText('settings.display.theme'), { target: { value: 'dark' } });
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('offers "same as the operating system", which is also the setting of a first start', () => {
    const change = vi.spyOn(i18n, 'changeLanguage').mockResolvedValue(i18n.t);
    setup();
    const select = screen.getByLabelText('header.language');
    expect(select).toHaveValue('system');
    expect(screen.getByRole('option', { name: 'settings.system.languageSystem' })).toHaveValue('system');
    fireEvent.change(select, { target: { value: 'de' } });
    expect(select).toHaveValue('de');
    fireEvent.change(select, { target: { value: 'system' } });
    expect(select).toHaveValue('system');
    expect(localStorage.getItem('cognatio-language')).toBe('system');
    // jsdom reports English
    expect(change).toHaveBeenLastCalledWith('en');
  });

  it('stores the default view and generations of the family tree', () => {
    open('treeBehaviour');
    setup();
    fireEvent.change(screen.getByLabelText('settings.tree.view'), { target: { value: 'network' } });
    fireEvent.change(screen.getByLabelText('settings.tree.depth'), { target: { value: '3' } });
    expect(useSettingsStore.getState()).toMatchObject({ treeView: 'network', treeDepth: 3 });

    fireEvent.change(screen.getByLabelText('settings.tree.depth'), { target: { value: 'all' } });
    expect(useSettingsStore.getState().treeDepth).toBeNull();
  });

  it('shows and changes the focus person the family tree opens with', async () => {
    useSettingsStore.setState({ treeFocusIds: { t1: 'p2' } });
    open('treeBehaviour');
    setup();
    const select = screen.getByLabelText('settings.tree.focus');
    expect(await screen.findByRole('option', { name: 'Berta Muster' })).toBeInTheDocument();
    expect(select).toHaveValue('p2');
    fireEvent.change(select, { target: { value: '' } });
    expect(focus()).toBeNull();
    fireEvent.change(select, { target: { value: 'p1' } });
    expect(focus()).toBe('p1');
  });

  it('shows status, versions and data of the system in an always visible block', async () => {
    setup();
    const status = await screen.findByRole('group', { name: 'settings.system.status' });
    // Backend and database reachable, versions of backend and frontend below
    expect(within(status).getByText('settings.system.backend:')).toBeInTheDocument();
    expect(within(status).getAllByText('settings.system.reachable')).toHaveLength(2);
    expect(within(status).getByTestId('backend-version')).toHaveTextContent('1.2.3');
    expect(within(status).getByTestId('frontend-version')).toHaveTextContent(/^\d+\.\d+\.\d+/);

    const data = screen.getByRole('group', { name: 'settings.system.data' });
    expect(within(data).getByText('2')).toBeInTheDocument();
    expect(data).toHaveTextContent('settings.system.personsValue');
    expect(data).toHaveTextContent('settings.system.mediaValue');
    expect(within(data).getByLabelText('settings.system.logLevel')).toHaveValue('info');
    // Recent backup: no hint
    expect(screen.queryByText('settings.backup.outdated')).not.toBeInTheDocument();
    // Language and colour scheme are in the same block
    expect(screen.getByRole('heading', { name: 'settings.system.title' })).toBeInTheDocument();
    expect(screen.getByLabelText('header.language')).toBeInTheDocument();
  });

  it('changes the log level of the server', async () => {
    const mocks: MockedResponse[] = [
      { request: { query: SYSTEM_INFO }, result: { data: { systemInfo: info() } } },
      { request: { query: SET_LOG_LEVEL, variables: { level: 'debug' } }, result: { data: { setLogLevel: 'debug' } } },
      { request: { query: SYSTEM_INFO }, result: { data: { systemInfo: info({ logLevel: 'debug' }) } } },
    ];
    render(
      <MockedProvider mocks={mocks}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </MockedProvider>,
    );
    const select = await screen.findByLabelText('settings.system.logLevel');
    expect(screen.getByRole('option', { name: 'DEBUG' })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'debug' } });
    await waitFor(() => expect(screen.getByLabelText('settings.system.logLevel')).toHaveValue('debug'));
  });

  it('shows the backup details in the block "Data and backup"', async () => {
    open('data');
    setup();
    expect(await screen.findByText('/srv/cognatio/backups')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'nav.importExport' })).toHaveAttribute('href', '/import-export');
    expect(screen.getByRole('button', { name: 'settings.backup.download' })).toBeInTheDocument();
  });

  it('warns if there is no recent automatic backup', async () => {
    setup({ data: { systemInfo: info({ lastBackupAt: null, backupCount: 0, database: 'unreachable' }) } });
    expect(await screen.findByText('settings.backup.missing')).toBeInTheDocument();
    const status = screen.getByRole('group', { name: 'settings.system.status' });
    expect(within(status).getByText('settings.system.unreachable')).toBeInTheDocument();
  });

  it('warns about an outdated backup', async () => {
    setup({ data: { systemInfo: info({ lastBackupAt: '2020-01-01T00:00:00.000Z' }) } });
    expect(await screen.findByText('settings.backup.outdated')).toBeInTheDocument();
  });

  it('reports an unreachable server', async () => {
    setup(undefined, new Error('Network error'));
    expect(await screen.findByRole('alert')).toHaveTextContent('settings.system.serverUnreachable');
  });

  describe('collapsible blocks', () => {
    const header = (title: string) => screen.getByRole('button', { name: title });

    it('starts with all blocks closed and shows the current values instead', async () => {
      setup();
      for (const id of ['fontColors', 'treeAppearance', 'treeBehaviour', 'data']) {
        const button = header(`settings.sections.${id}`);
        expect(button).toHaveAttribute('aria-expanded', 'false');
      }
      // Summary of the appearance blocks (defaults: Inter · normal · green / curved · 3 px · normal · none)
      expect(header('settings.sections.fontColors')).toHaveAccessibleDescription(
        'settings.appearance.fonts.inter · settings.appearance.sizes.normal · settings.appearance.colors.green',
      );
      expect(header('settings.sections.treeAppearance')).toHaveAccessibleDescription(/settings\.appearance\.lineStyles\.curved · settings\.appearance\.px · /);
      // No fields while closed
      expect(screen.queryByLabelText('settings.tree.view')).not.toBeInTheDocument();
      expect(await screen.findByTestId('backend-version')).toBeInTheDocument();
    });

    it('opens and closes a block and remembers it on this device', () => {
      setup();
      fireEvent.click(header('settings.sections.treeBehaviour'));
      expect(header('settings.sections.treeBehaviour')).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByLabelText('settings.tree.view')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'settings.sections.treeBehaviour' })).toBeInTheDocument();
      expect(useSettingsStore.getState().openSections).toEqual(['treeBehaviour']);
      expect(JSON.parse(localStorage.getItem('cognatio-settings')!).state.openSections).toEqual(['treeBehaviour']);

      fireEvent.click(header('settings.sections.treeBehaviour'));
      expect(screen.queryByLabelText('settings.tree.view')).not.toBeInTheDocument();
      expect(useSettingsStore.getState().openSections).toEqual([]);
    });

    it('opens and closes all blocks at once, but never the system block', () => {
      setup();
      fireEvent.click(screen.getByRole('button', { name: 'settings.sections.expandAll' }));
      // Five blocks plus the always visible block "system" (also a region)
      expect(screen.getAllByRole('region')).toHaveLength(6);
      expect(useSettingsStore.getState().openSections).toHaveLength(5);

      fireEvent.click(screen.getByRole('button', { name: 'settings.sections.collapseAll' }));
      expect(screen.getAllByRole('region')).toHaveLength(1);
      expect(screen.getByLabelText('header.language')).toBeInTheDocument();
    });

    it('opens the block named in the link (/settings#data)', () => {
      render(
        <MockedProvider mocks={[{ request: { query: SYSTEM_INFO }, result: { data: { systemInfo: info() } } }, mcpOff]}>
          <MemoryRouter initialEntries={['/settings#data']}>
            <SettingsPage />
          </MemoryRouter>
        </MockedProvider>,
      );
      expect(header('settings.sections.data')).toHaveAttribute('aria-expanded', 'true');
      expect(header('settings.sections.fontColors')).toHaveAttribute('aria-expanded', 'false');
    });

    it('shows the appearance fields in their blocks', () => {
      open('fontColors', 'treeAppearance');
      setup();
      expect(screen.getByLabelText('settings.appearance.fields.font')).toBeInTheDocument();
      expect(screen.getByLabelText('settings.appearance.fields.lineStyle')).toBeInTheDocument();
      expect(screen.getByTestId('appearance-preview')).toBeInTheDocument();
    });
  });

  describe('search', () => {
    const search = () => screen.getByRole('combobox', { name: 'settings.search.label' });

    it('opens the block of a found setting and focuses the field', async () => {
      setup();
      expect(screen.queryByLabelText('settings.tree.view')).not.toBeInTheDocument();

      fireEvent.change(search(), { target: { value: 'settings.tree.view' } });
      const option = await screen.findByRole('option', { name: /settings\.tree\.view/ });
      expect(option).toHaveTextContent('settings.sections.treeBehaviour');
      fireEvent.click(option);

      const field = await screen.findByLabelText('settings.tree.view');
      await waitFor(() => expect(field).toHaveFocus());
      expect(useSettingsStore.getState().openSections).toContain('treeBehaviour');
      // The search field is empty again and the list is gone
      expect(search()).toHaveValue('');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('works with the keyboard: arrows choose, Enter goes to the setting, Escape clears', async () => {
      setup();
      fireEvent.change(search(), { target: { value: 'settings.appearance.fields.line' } });
      const options = await screen.findAllByRole('option');
      expect(options.length).toBeGreaterThan(1);
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      fireEvent.keyDown(search(), { key: 'ArrowDown' });
      expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
      expect(search()).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1].id);
      fireEvent.keyDown(search(), { key: 'Enter' });
      await waitFor(() => expect(useSettingsStore.getState().openSections).toContain('treeAppearance'));

      fireEvent.change(search(), { target: { value: 'settings' } });
      fireEvent.keyDown(search(), { key: 'Escape' });
      expect(search()).toHaveValue('');
    });

    it('focuses settings of the always visible block without opening anything', async () => {
      setup();
      fireEvent.change(search(), { target: { value: 'header.language' } });
      fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option'));
      await waitFor(() => expect(screen.getByLabelText('header.language')).toHaveFocus());
      expect(useSettingsStore.getState().openSections).toEqual([]);
    });

    it('says so if nothing matches', async () => {
      setup();
      fireEvent.change(search(), { target: { value: 'xyzzy' } });
      expect(await screen.findByText('settings.search.none')).toBeInTheDocument();
      expect(within(screen.getByRole('listbox')).queryByRole('option')).not.toBeInTheDocument();
    });
  });

  describe('logs', () => {
    it('deletes the logs only after a confirmation', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ cleared: true })));
      vi.stubGlobal('fetch', fetchMock);
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      setup();
      const button = await screen.findByRole('button', { name: 'settings.logs.clear' });

      // Declined: nothing happens
      fireEvent.click(button);
      expect(confirm).toHaveBeenCalledWith('settings.logs.confirmClear');
      expect(fetchMock).not.toHaveBeenCalled();

      confirm.mockReturnValue(true);
      fireEvent.click(button);
      expect(await screen.findByText('settings.logs.cleared')).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/logs', expect.objectContaining({ method: 'DELETE' }));
    });

    it('empties the log of this browser as well', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ cleared: true }))));
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      logClient('error', 'old problem');
      setup();
      fireEvent.click(await screen.findByRole('button', { name: 'settings.logs.clear' }));
      await screen.findByText('settings.logs.cleared');
      expect(getClientLog()).toEqual([]);
    });

    it('shows an error if the logs cannot be deleted', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ reason: 'LOG_CLEAR_FAILED' }), { status: 500 })));
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      setup();
      fireEvent.click(await screen.findByRole('button', { name: 'settings.logs.clear' }));
      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.queryByText('settings.logs.cleared')).not.toBeInTheDocument();
    });
  });
});
