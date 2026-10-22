import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useThemeStore } from '@/stores/themeStore';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import { makePerson, makeTree, treesMock } from '@/test/fixtures';
import { GET_DELETED_PERSONS } from '@/features/persons/graphql/personQueries';
import { GET_DELETED_FAMILY_TREES } from '@/features/family-trees/graphql/familyTreeQueries';
import { GET_DELETED_REPOSITORIES, GET_DELETED_SOURCES } from '@/features/sources/graphql/sourceQueries';
import { MCP_SETTINGS } from '@/features/settings/graphql/mcpQueries';
import { GET_OPEN_PLAUSIBILITY_ISSUES } from '@/features/plausibility/graphql/plausibilityQueries';
import { AppLayout } from '../AppLayout';
import { useActivityStore, type Activity } from '@/stores/activityStore';
import { notifyDataChange } from '@/lib/dataChanges';

afterEach(() => {
  delete window.cognatioPlatform;
  vi.restoreAllMocks();
  localStorage.removeItem('cognatio-language');
  useThemeStore.getState().setTheme('light');
  useActiveTreeStore.setState({ treeId: null });
});

// Sorted by name; t1 is the older one
const trees = [
  makeTree({ id: 't2', name: 'Familie Albrecht', createdAt: '2026-09-20T10:00:00.000Z' }),
  makeTree({ id: 't1', name: 'Familie Muster', createdAt: '2026-09-01T10:00:00.000Z' }),
];

function Page() {
  const location = useLocation();
  return <p data-testid="page">{location.pathname + location.search}</p>;
}

// The sidebar queries the recycle bin (also after every switch) – empty unless the test says otherwise; AI assistants are off;
// no possible errors
const emptyTrash: MockedResponse[] = [
  { request: { query: GET_OPEN_PLAUSIBILITY_ISSUES }, result: { data: { openPlausibilityIssues: 0 } }, maxUsageCount: Infinity },
  { request: { query: GET_DELETED_PERSONS }, result: { data: { getDeletedPersons: [] } }, maxUsageCount: Infinity },
  { request: { query: GET_DELETED_FAMILY_TREES }, result: { data: { deletedFamilyTrees: [] } }, maxUsageCount: Infinity },
  { request: { query: GET_DELETED_SOURCES }, result: { data: { deletedSources: [] } }, maxUsageCount: Infinity },
  { request: { query: GET_DELETED_REPOSITORIES }, result: { data: { deletedRepositories: [] } }, maxUsageCount: Infinity },
  {
    request: { query: MCP_SETTINGS },
    result: { data: { mcpSettings: { enabled: false, address: null, portChanged: false, permissions: [], excludedTrees: [] } } },
    maxUsageCount: Infinity,
  },
];

function setup(url = '/persons', mocks: MockedResponse[] = [treesMock(trees)]) {
  render(
    <MockedProvider mocks={[...mocks, ...emptyTrash]}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="*" element={<Page />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('AppLayout', () => {
  it('shows the pages only once the open family tree is known – the oldest if none was chosen yet', async () => {
    setup('/persons');
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('common.loading');

    expect(await screen.findByTestId('page')).toBeInTheDocument();
    expect(useActiveTreeStore.getState().treeId).toBe('t1');
    expect(screen.getByLabelText('familyTrees.active')).toHaveValue('t1');
  });

  it('replaces a stored family tree that no longer exists', async () => {
    useActiveTreeStore.setState({ treeId: 'deleted' });
    setup('/');
    await screen.findByTestId('page');
    expect(useActiveTreeStore.getState().treeId).toBe('t1');
  });

  it('switches the family tree and leaves the page of a person of the previous one', async () => {
    useActiveTreeStore.setState({ treeId: 't1' });
    setup('/persons/p1');
    expect(await screen.findByTestId('page')).toHaveTextContent('/persons/p1');

    fireEvent.change(screen.getByLabelText('familyTrees.active'), { target: { value: 't2' } });
    expect(useActiveTreeStore.getState().treeId).toBe('t2');
    await waitFor(() => expect(screen.getByTestId('page')).toHaveTextContent(/^\/persons$/));
  });

  it('shows the recycle bin at the end of the navigation with the number of deleted entries', async () => {
    const trash: MockedResponse[] = [
      {
        request: { query: GET_DELETED_PERSONS },
        result: { data: { getDeletedPersons: [makePerson({ id: 'd1', isDeleted: true }), makePerson({ id: 'd2', isDeleted: true })] } },
      },
      { request: { query: GET_DELETED_FAMILY_TREES }, result: { data: { deletedFamilyTrees: [makeTree({ id: 't9', isDeleted: true })] } } },
    ];
    setup('/trash', [treesMock(trees), ...trash]);
    const link = await screen.findByRole('link', { name: /nav.trash/ });
    expect(link).toHaveAttribute('href', '/trash');
    expect(link).toHaveAttribute('aria-current', 'page');
    // Two persons and one family tree; as text for screen readers
    expect(await within(link).findByText('3')).toBeInTheDocument();
    expect(within(link).getByText('nav.trashCount')).toHaveClass('sr-only');
    // Set apart at the end of the navigation, followed only by the settings and the help
    const links = within(screen.getByRole('navigation')).getAllByRole('link');
    expect(links.slice(-3)).toEqual([link, screen.getByRole('link', { name: 'nav.settings' }), screen.getByRole('link', { name: 'nav.help' })]);
  });

  it('groups the areas under headings and shows the number of open possible errors', async () => {
    setup('/persons', [
      treesMock(trees),
      { request: { query: GET_OPEN_PLAUSIBILITY_ISSUES }, result: { data: { openPlausibilityIssues: 4 } }, maxUsageCount: Infinity },
    ]);
    const evaluate = await screen.findByRole('group', { name: 'nav.groups.evaluate' });
    expect(
      within(evaluate)
        .getAllByRole('link')
        .map((l) => l.getAttribute('href')),
    ).toEqual(['/tree', '/statistics', '/checks', '/reports']);
    expect(within(screen.getByRole('group', { name: 'nav.groups.manage' })).getByRole('link', { name: 'nav.importExport' })).toBeInTheDocument();
    const checks = within(evaluate).getByRole('link', { name: /nav.plausibility/ });
    expect(await within(checks).findByText('4')).toBeInTheDocument();
    expect(within(checks).getByText('nav.plausibilityOpen')).toHaveClass('sr-only');
  });

  it('counts the open possible errors again after a change on the same page', async () => {
    let open = 2;
    setup('/persons', [
      treesMock(trees),
      { request: { query: GET_OPEN_PLAUSIBILITY_ISSUES }, result: () => ({ data: { openPlausibilityIssues: open } }), maxUsageCount: Infinity },
    ]);
    const checks = await screen.findByRole('link', { name: /nav.plausibility/ });
    expect(await within(checks).findByText('2')).toBeInTheDocument();
    // e.g. a relation corrected in a dialog: no change of page
    open = 1;
    act(() => notifyDataChange());
    expect(await within(checks).findByText('1')).toBeInTheDocument();
  });

  it('opens the help for the current page', async () => {
    setup('/persons/p1');
    await screen.findByTestId('page');
    expect(screen.getByRole('link', { name: 'header.help' })).toHaveAttribute('href', '/help#persons');
    expect(screen.getByRole('link', { name: 'nav.help' })).toHaveAttribute('href', '/help');
  });

  it('shows no number with an empty recycle bin', async () => {
    const empty: MockedResponse[] = [
      { request: { query: GET_DELETED_PERSONS }, result: { data: { getDeletedPersons: [] } } },
      { request: { query: GET_DELETED_FAMILY_TREES }, result: { data: { deletedFamilyTrees: [] } } },
    ];
    setup('/', [treesMock(trees), ...empty]);
    await screen.findByTestId('page');
    await waitFor(() => expect(screen.getByRole('link', { name: 'nav.trash' })).toBeInTheDocument());
    expect(screen.queryByText('nav.trashCount')).not.toBeInTheDocument();
  });

  it('works without a family tree: pages that need one offer to create, import or restore one', async () => {
    useActiveTreeStore.setState({ treeId: 'in-trash' });
    const inTrash: MockedResponse = {
      request: { query: GET_DELETED_FAMILY_TREES },
      result: { data: { deletedFamilyTrees: [makeTree({ id: 'in-trash', isDeleted: true })] } },
      maxUsageCount: Infinity,
    };
    setup('/persons', [treesMock([]), inTrash]);

    expect(await screen.findByRole('heading', { name: 'familyTrees.none.title' })).toBeInTheDocument();
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
    // The trashed one is no longer named in requests
    expect(useActiveTreeStore.getState().treeId).toBeNull();
    expect(screen.getByRole('button', { name: 'familyTrees.create' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'familyTrees.none.import' })).toHaveAttribute('href', '/import-export');
    expect(await screen.findByRole('link', { name: 'familyTrees.none.trash' })).toHaveAttribute('href', '/trash');
    // The selection says so; the recycle bin still counts the family tree
    expect(screen.getByLabelText('familyTrees.active')).toBeDisabled();
    expect(screen.getByRole('option', { name: 'familyTrees.none.option' })).toBeInTheDocument();
    expect(await within(screen.getByRole('link', { name: /nav.trash/ })).findByText('1')).toBeInTheDocument();
  });

  it('shows the pages that need no family tree also without one', async () => {
    for (const url of ['/family-trees', '/import-export', '/trash', '/settings', '/help']) {
      const { unmount } = render(
        <MockedProvider mocks={[treesMock([]), ...emptyTrash]}>
          <MemoryRouter initialEntries={[url]}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="*" element={<Page />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </MockedProvider>,
      );
      expect(await screen.findByTestId('page')).toHaveTextContent(url);
      unmount();
    }
  });

  it('reports when the family trees cannot be loaded', async () => {
    setup('/', [{ request: { query: treesMock().request.query }, error: new Error('down') }]);
    expect(await screen.findByRole('alert')).toHaveTextContent('familyTrees.loadError');
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
  });

  it('offers a skip link to the main content', () => {
    setup();
    expect(screen.getByRole('link', { name: 'app.skipToContent' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });

  it('marks the current page in the navigation', () => {
    setup('/persons');
    expect(screen.getByRole('link', { name: 'nav.persons' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'nav.dashboard' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'nav.settings' })).toHaveAttribute('href', '/settings');
  });

  it('searches persons from the header and clears the search', async () => {
    setup('/');
    await screen.findByTestId('page');
    const search = screen.getByLabelText('header.searchPlaceholder');
    fireEvent.change(search, { target: { value: ' Anna Maier ' } });
    fireEvent.submit(search.closest('form')!);
    expect(screen.getByTestId('page')).toHaveTextContent('/persons?q=Anna%20Maier');
    // The search bar takes over the term from the address
    expect(search).toHaveValue('Anna Maier');

    fireEvent.change(search, { target: { value: '  ' } });
    fireEvent.submit(search.closest('form')!);
    expect(screen.getByTestId('page')).toHaveTextContent(/^\/persons$/);
  });

  it('switches the colour scheme but offers no language switch (language is set under Settings)', () => {
    setup();
    expect(screen.queryByLabelText('header.language')).toBeNull();
    expect(screen.queryByRole('button', { name: 'RU' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'header.darkMode' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(screen.getByRole('button', { name: 'header.lightMode' })).toBeInTheDocument();
  });
});

describe('Quit button', () => {
  it('is not there in the browser, where the user closes the tab', async () => {
    setup('/');
    await screen.findByTestId('page');
    expect(screen.queryByRole('button', { name: 'nav.quit' })).not.toBeInTheDocument();
  });

  it('quits the Windows app through its platform layer', async () => {
    const quit = vi.fn().mockResolvedValue(undefined);
    window.cognatioPlatform = { quit };
    setup('/');
    await screen.findByTestId('page');
    fireEvent.click(screen.getByRole('button', { name: 'nav.quit' }));
    expect(quit).toHaveBeenCalledTimes(1);
  });
});

describe('Activity in the sidebar', () => {
  afterEach(() => useActivityStore.setState({ activities: [] }));

  const activity = (change: Partial<Activity>): Activity => ({
    id: Math.random().toString(),
    kind: 'import',
    label: 'a.zip',
    state: 'running',
    phase: 'media',
    done: 0,
    total: 0,
    startedAt: 0,
    seen: false,
    ...change,
  });

  it('counts the running operations and marks one that failed and was not seen yet', async () => {
    useActivityStore.setState({ activities: [activity({}), activity({}), activity({ state: 'failed' })] });
    setup('/persons');
    await screen.findByTestId('page');
    const link = screen.getByRole('link', { name: /nav.activity/ });
    expect(link).toHaveAttribute('href', '/activity');
    expect(link).toHaveTextContent('2');
    expect(link).toHaveTextContent('nav.activityRunning');
    expect(link).toHaveTextContent('nav.activityFailed');
  });

  it('shows the plain entry without operations', async () => {
    setup('/persons');
    await screen.findByTestId('page');
    expect(screen.getByRole('link', { name: 'nav.activity' })).toBeInTheDocument();
  });
});
