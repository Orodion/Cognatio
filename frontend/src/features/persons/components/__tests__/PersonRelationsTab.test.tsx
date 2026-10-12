import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { GET_PERSON_RELATIONS } from '@/features/persons/graphql/relationQueries';
import { GET_TREE_DATA } from '@/features/tree/graphql/treeQueries';
import { makePerson } from '@/test/fixtures';
import { useSettingsStore } from '@/stores/settingsStore';
import { PersonRelationsTab } from '../PersonRelationsTab';

// The graph is the family tree component; it is tested on its own and needs a real browser layout
const familyTree = vi.hoisted(() => ({ props: null as null | { focusId: string | null; visibleIds: Set<string>; view: string } }));
vi.mock('@/features/tree/components/FamilyTree', () => ({
  FamilyTree: (props: { focusId: string | null; visibleIds: Set<string>; view: string }) => {
    familyTree.props = props;
    return <div data-testid="family-tree-mock">{[...props.visibleIds].sort().join(',')}</div>;
  },
}));

afterEach(() => {
  useSettingsStore.setState({ showRelationGraph: true });
  familyTree.props = null;
});

const relation = (id: string, role: string, other: ReturnType<typeof makePerson>) => ({
  __typename: 'PersonRelationDetail',
  id,
  type: role,
  role,
  label: null as string | null,
  note: null as string | null,
  active: true,
  startDate: null,
  endDate: null,
  otherPerson: other,
  createdAt: '1700000000000',
});

const person = makePerson({ id: 'me', firstName: 'Ich' });

const treeData = {
  request: { query: GET_TREE_DATA },
  result: {
    data: {
      getPersons: [person, makePerson({ id: 'v', firstName: 'Papa' }), makePerson({ id: 'weit', firstName: 'Weit' })],
      getRelations: [
        {
          __typename: 'Relation',
          id: 'r2',
          personAId: 'me',
          personBId: 'v',
          type: 'FATHER',
          label: null,
          active: true,
          note: null,
          startDate: null,
          endDate: null,
          createdAt: '1',
          updatedAt: '1',
        },
      ],
    },
  },
};

function renderTab(relations: Array<ReturnType<typeof relation>>, filter?: string) {
  const mocks = [
    treeData,
    {
      request: { query: GET_PERSON_RELATIONS, variables: { personId: 'me' } },
      result: { data: { getPersonRelations: relations } },
    },
  ];
  render(
    <MockedProvider mocks={mocks}>
      <MemoryRouter>
        <PersonRelationsTab person={person} filter={filter} />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('PersonRelationsTab', () => {
  // Regression: concrete roles (MOTHER, WIFE …) used to be assigned to no group and were not shown
  it('groups concrete roles into parents, children, partners and siblings', async () => {
    renderTab([
      relation('r1', 'MOTHER', makePerson({ id: 'm', firstName: 'Mama' })),
      relation('r2', 'FATHER', makePerson({ id: 'v', firstName: 'Papa' })),
      relation('r3', 'WIFE', makePerson({ id: 'e', firstName: 'Eva' })),
      relation('r4', 'CHILD', makePerson({ id: 'k', firstName: 'Kai' })),
      relation('r5', 'SIBLING', makePerson({ id: 'g', firstName: 'Gina' })),
      relation('r6', 'OTHER', makePerson({ id: 's', firstName: 'Sam' })),
    ]);

    // Every group is a named region
    const group = (key: string) => screen.findByRole('region', { name: key });

    expect(await screen.findByText('relations.title (6)')).toBeInTheDocument();

    const parents = await group('relations.roles.PARENT');
    expect(within(parents).getByText('Mama Muster')).toBeInTheDocument();
    expect(within(parents).getByText('Papa Muster')).toBeInTheDocument();
    expect(within(parents).getByText('relations.types.MOTHER')).toBeInTheDocument();

    expect(within(await group('relations.roles.PARTNER')).getByText('Eva Muster')).toBeInTheDocument();
    expect(within(await group('relations.roles.CHILD')).getByText('Kai Muster')).toBeInTheDocument();
    expect(within(await group('relations.roles.SIBLING')).getByText('Gina Muster')).toBeInTheDocument();
    expect(within(await group('relations.roles.OTHER')).getByText('Sam Muster')).toBeInTheDocument();
  });

  it('shows the empty state without relations', async () => {
    renderTab([]);
    expect(await screen.findByText('relations.empty')).toBeInTheDocument();
  });

  it('shows the graph above the list, not instead of it, and hides it on request', async () => {
    renderTab([relation('r2', 'FATHER', makePerson({ id: 'v', firstName: 'Papa' }))]);

    // both at once: the family tree of the persons around the viewed person (viewed person as focus) and the list
    expect(await screen.findByTestId('family-tree-mock')).toHaveTextContent('me,v');
    expect(familyTree.props?.focusId).toBe('me');
    expect(familyTree.props?.view).toBe('tree');
    expect(screen.getByRole('region', { name: 'relations.graph.label' })).toBeInTheDocument();
    const parents = await screen.findByRole('region', { name: 'relations.roles.PARENT' });
    expect(within(parents).getByText('Papa Muster')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'relations.graph.button' });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(button);

    expect(screen.queryByTestId('family-tree-mock')).toBeNull();
    expect(screen.getByRole('region', { name: 'relations.roles.PARENT' })).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(useSettingsStore.getState().showRelationGraph).toBe(false);

    fireEvent.click(button);
    expect(await screen.findByTestId('family-tree-mock')).toBeInTheDocument();
  });

  it('shows the empty state instead of an empty graph', async () => {
    renderTab([]);
    expect(await screen.findByText('relations.empty')).toBeInTheDocument();
    expect(screen.queryByTestId('family-tree-mock')).toBeNull();
  });

  describe('filter', () => {
    const relations = () => [
      relation('r2', 'FATHER', makePerson({ id: 'v', firstName: 'Papa' })),
      { ...relation('r3', 'WIFE', makePerson({ id: 'e', firstName: 'Eva' })), label: 'Zweite Ehe', note: 'Standesamt Köln' },
    ];

    it('shows only the matching relations, marks the hits and takes the graph along', async () => {
      renderTab(relations(), 'EVA');
      expect(await screen.findByText('relations.title (1)')).toBeInTheDocument();
      expect(screen.queryByText(/Papa/)).toBeNull();
      expect([...document.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['Eva']);
      // the persons of the remaining relations and the viewed person; Papa is gone
      expect(screen.getByTestId('family-tree-mock')).toHaveTextContent(/^me$/);
    });

    it('keeps the graph with relations that are all left', async () => {
      renderTab(relations(), 'papa');
      expect(await screen.findByText('relations.title (1)')).toBeInTheDocument();
      expect(screen.getByTestId('family-tree-mock')).toHaveTextContent('me,v');
    });

    it('also searches the kind of relation', async () => {
      // the test translation returns the keys
      renderTab(relations(), 'types.father');
      expect(await screen.findByText('relations.title (1)')).toBeInTheDocument();
      expect(screen.getByText('Papa Muster')).toBeInTheDocument();
    });

    it('finds a relation by words of its label and of its note', async () => {
      renderTab(relations(), 'zweite köln');
      expect(await screen.findByText('relations.title (1)')).toBeInTheDocument();
      expect([...document.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['Zweite', 'Köln']);
    });

    it('says so if nothing matches', async () => {
      renderTab(relations(), 'xyz');
      expect(await screen.findByText('personDetail.filter.noMatches')).toBeInTheDocument();
      expect(screen.queryByText('relations.empty')).toBeNull();
      // only the viewed person is left in the graph
      expect(screen.getByTestId('family-tree-mock')).toHaveTextContent(/^me$/);
    });
  });
});
