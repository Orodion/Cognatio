import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { GET_TREE_DATA } from '@/features/tree/graphql/treeQueries';
import { makePerson } from '@/test/fixtures';
import { focusIdOf, useSettingsStore } from '@/stores/settingsStore';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import { TreePage, TREE_NODE_LIMIT } from '../TreePage';

// The focus person is stored per family tree – the tests work in family tree t1
useActiveTreeStore.setState({ treeId: 't1' });
const focus = () => focusIdOf(useSettingsStore.getState().treeFocusIds, 't1');

// React Flow needs layout APIs that jsdom lacks – only the passed settings matter here
vi.mock('@/features/tree/components/FamilyTree', () => ({
  FamilyTree: (props: { view: string; focusId: string | null; visibleIds: Set<string> }) => (
    <div data-testid="tree">{`${props.view}|${props.focusId}|${[...props.visibleIds].sort().join(',')}`}</div>
  ),
}));

// Three generations: Otto → Anna → Emil; plus Udo without relations
const persons = [
  makePerson({ id: 'otto', firstName: 'Otto', lastName: 'Baum', birthDate: '1930' }),
  makePerson({ id: 'anna', firstName: 'Anna', lastName: 'Baum' }),
  makePerson({ id: 'emil', firstName: 'Emil', lastName: 'Baum' }),
  makePerson({ id: 'udo', firstName: 'Udo', lastName: 'Baum' }),
];
const relation = (id: string, personAId: string, personBId: string) => ({
  id,
  personAId,
  personBId,
  type: 'CHILD',
  label: null,
  active: true,
  note: null,
  startDate: null,
  endDate: null,
  createdAt: '',
  updatedAt: '',
});
const relations = [relation('r1', 'otto', 'anna'), relation('r2', 'anna', 'emil')];

function setup(url: string, data = { getPersons: persons, getRelations: relations }) {
  const mock: MockedResponse = {
    request: { query: GET_TREE_DATA },
    result: { data },
    maxUsageCount: Number.POSITIVE_INFINITY,
  };
  render(
    <MockedProvider mocks={[mock]}>
      <MemoryRouter initialEntries={[url]}>
        <TreePage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

function setupWithUnmount(url: string) {
  const mock: MockedResponse = {
    request: { query: GET_TREE_DATA },
    result: { data: { getPersons: persons, getRelations: relations } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  };
  return render(
    <MockedProvider mocks={[mock]}>
      <MemoryRouter initialEntries={[url]}>
        <TreePage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(() => useSettingsStore.setState({ treeView: 'tree', treeDepth: null, treeFocusIds: {}, treeExportVisibleOnly: false }));

describe('TreePage', () => {
  it('shows the whole tree without focus person; generations need a focus person', async () => {
    setup('/tree');
    expect(await screen.findByTestId('tree')).toHaveTextContent('tree|null|anna,emil,otto,udo');
    expect(screen.getByLabelText('tree.depth.label')).toBeDisabled();
    expect(screen.getByRole('group', { name: 'tree.export.label' })).toBeInTheDocument();
    expect(screen.getByText('tree.legend.label')).toBeInTheDocument();
  });

  it('asks for a focus person in the ancestor chart', async () => {
    setup('/tree?view=ancestors');
    expect(await screen.findByText('tree.needsFocus')).toBeInTheDocument();
    expect(screen.queryByTestId('tree')).not.toBeInTheDocument();
    // Without a graph there is nothing to export
    expect(screen.queryByRole('group', { name: 'tree.export.label' })).not.toBeInTheDocument();
  });

  it('reads view, focus person and generations from the URL', async () => {
    setup('/tree?view=descendants&person=otto&generations=2');
    expect(await screen.findByTestId('tree')).toHaveTextContent('descendants|otto|anna,emil,otto');
    expect(screen.getByLabelText('tree.view')).toHaveValue('descendants');
    expect(screen.getByLabelText('tree.focus.label')).toHaveValue('otto');
    expect(screen.getByLabelText('tree.depth.label')).toHaveValue('2');
  });

  it('opens with the default view and depth from the settings; the URL takes precedence', async () => {
    useSettingsStore.setState({ treeView: 'descendants', treeDepth: 2 });
    setup('/tree?person=otto');
    expect(await screen.findByTestId('tree')).toHaveTextContent('descendants|otto|');
    expect(screen.getByLabelText('tree.view')).toHaveValue('descendants');
    expect(screen.getByLabelText('tree.depth.label')).toHaveValue('2');

    // "All" stays selected although the default depth is 2
    fireEvent.change(screen.getByLabelText('tree.depth.label'), { target: { value: 'all' } });
    expect(screen.getByLabelText('tree.depth.label')).toHaveValue('all');
  });

  it('prefers view and generations from the URL over the defaults', async () => {
    useSettingsStore.setState({ treeView: 'descendants', treeDepth: 2 });
    setup('/tree?view=network&person=otto&generations=all');
    expect(await screen.findByTestId('tree')).toHaveTextContent('network|otto|');
    expect(screen.getByLabelText('tree.depth.label')).toHaveValue('all');
  });

  it('remembers the chosen focus person and opens with it next time', async () => {
    setup('/tree');
    await screen.findByTestId('tree');
    fireEvent.change(screen.getByLabelText('tree.focus.label'), { target: { value: 'anna' } });
    expect(focus()).toBe('anna');
  });

  it('opens with the stored focus person; the URL and removed persons take precedence', async () => {
    useSettingsStore.setState({ treeFocusIds: { t1: 'emil' }, treeDepth: 3 });
    const { unmount } = setupWithUnmount('/tree');
    expect(await screen.findByTestId('tree')).toHaveTextContent('tree|emil|');
    expect(screen.getByLabelText('tree.focus.label')).toHaveValue('emil');
    unmount();

    // A link with a focus person (e.g. "show tree") shows it without changing the stored one
    const fromLink = setupWithUnmount('/tree?person=otto');
    expect(await screen.findByTestId('tree')).toHaveTextContent('tree|otto|');
    expect(focus()).toBe('emil');
    fromLink.unmount();

    useSettingsStore.setState({ treeFocusIds: { t1: 'deleted' } });
    setup('/tree');
    expect(await screen.findByTestId('tree')).toHaveTextContent('tree|null|');

    // Choosing "none" forgets the stored focus person
    fireEvent.change(screen.getByLabelText('tree.focus.label'), { target: { value: '' } });
    expect(focus()).toBeNull();
  });

  it('stores every change in the view and opens the same way next time', async () => {
    const first = setupWithUnmount('/tree');
    await screen.findByTestId('tree');
    fireEvent.change(screen.getByLabelText('tree.view'), { target: { value: 'descendants' } });
    fireEvent.change(screen.getByLabelText('tree.focus.label'), { target: { value: 'otto' } });
    fireEvent.change(screen.getByLabelText('tree.depth.label'), { target: { value: '5' } });
    expect(useSettingsStore.getState()).toMatchObject({ treeView: 'descendants', treeDepth: 5 });
    expect(focus()).toBe('otto');
    first.unmount();

    // Opened again via the menu (without parameters in the address)
    setup('/tree');
    expect(await screen.findByTestId('tree')).toHaveTextContent('descendants|otto|anna,emil,otto');
    expect(screen.getByLabelText('tree.depth.label')).toHaveValue('5');

    fireEvent.change(screen.getByLabelText('tree.view'), { target: { value: 'tree' } });
    expect(useSettingsStore.getState().treeView).toBe('tree');
    fireEvent.change(screen.getByLabelText('tree.depth.label'), { target: { value: 'all' } });
    expect(useSettingsStore.getState().treeDepth).toBeNull();
  });

  it('ignores unknown URL values', async () => {
    setup('/tree?view=nonsense&person=weg&generations=7');
    expect(await screen.findByTestId('tree')).toHaveTextContent('tree|null|anna,emil,otto,udo');
  });

  it('switches view, focus person and generations', async () => {
    setup('/tree');
    await screen.findByTestId('tree');
    // Persons in alphabetical order in the selection
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options.indexOf('Anna Baum')).toBeLessThan(options.indexOf('Otto Baum (* 1930)'));

    fireEvent.change(screen.getByLabelText('tree.view'), { target: { value: 'ancestors' } });
    fireEvent.change(screen.getByLabelText('tree.focus.label'), { target: { value: 'emil' } });
    expect(screen.getByTestId('tree')).toHaveTextContent('ancestors|emil|anna,emil,otto');
    fireEvent.change(screen.getByLabelText('tree.depth.label'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('tree.depth.label'), { target: { value: 'all' } });
    expect(screen.getByTestId('tree')).toHaveTextContent('ancestors|emil|anna,emil,otto');
  });

  it('does not draw very large views automatically, but on request', async () => {
    const many = Array.from({ length: TREE_NODE_LIMIT + 1 }, (_, i) => makePerson({ id: `p${i}`, firstName: `P${i}` }));
    setup('/tree', { getPersons: many, getRelations: [] });
    expect(await screen.findByText('tree.tooMany')).toBeInTheDocument();
    expect(screen.queryByTestId('tree')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'tree.showAll' }));
    expect(screen.getByTestId('tree')).toBeInTheDocument();

    // A new selection (focus person) is treated normally again
    fireEvent.change(screen.getByLabelText('tree.focus.label'), { target: { value: 'p1' } });
    expect(screen.getByTestId('tree')).toHaveTextContent('tree|p1|p1');
  });
});
