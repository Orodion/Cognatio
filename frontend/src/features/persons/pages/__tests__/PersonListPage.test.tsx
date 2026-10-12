import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { GET_PERSONS, SEARCH, GET_DELETED_PERSONS, RESTORE_PERSON } from '@/features/persons/graphql/personQueries';
import { makePerson } from '@/test/fixtures';
import { PersonListPage, type DeletedPersonState } from '../PersonListPage';

const many = (n: number) => Array.from({ length: n }, (_, i) => makePerson({ id: `p${i}`, firstName: `Person${i}` }));
const deleted = makePerson({ id: 'weg', firstName: 'Otto', isDeleted: true, deletedAt: '1700000000000' });

function setup({
  persons = many(3),
  entry = '/persons',
  state,
  extraMocks = [],
}: { persons?: Array<ReturnType<typeof makePerson>>; entry?: string; state?: DeletedPersonState; extraMocks?: MockedResponse[] } = {}) {
  const mocks: MockedResponse[] = [
    { request: { query: GET_PERSONS, variables: { includeDeleted: false } }, result: { data: { getPersons: persons } }, maxUsageCount: Infinity },
    { request: { query: GET_DELETED_PERSONS }, result: { data: { getDeletedPersons: [deleted] } }, maxUsageCount: Infinity },
    ...extraMocks,
  ];
  render(
    <MockedProvider mocks={mocks}>
      <MemoryRouter initialEntries={[{ pathname: entry.split('?')[0], search: entry.includes('?') ? `?${entry.split('?')[1]}` : '', state }]}>
        <PersonListPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

const cards = () => screen.getAllByRole('link').filter((a) => /^\/persons\/p\d+$/.test(a.getAttribute('href') ?? ''));

describe('PersonListPage', () => {
  it('lists persons', async () => {
    setup();
    expect(await screen.findByText('Person0 Muster')).toBeInTheDocument();
    expect(cards()).toHaveLength(3);
    // The recycle bin is reached via the sidebar, not from the list
    expect(screen.queryByRole('link', { name: /trash.title/ })).not.toBeInTheDocument();
  });

  it('renders large lists step by step', async () => {
    setup({ persons: many(130) });
    await screen.findByText('Person0 Muster');
    expect(cards()).toHaveLength(60);
    fireEvent.click(screen.getByRole('button', { name: 'persons.showMore' }));
    expect(cards()).toHaveLength(120);
    fireEvent.click(screen.getByRole('button', { name: 'persons.showMore' }));
    expect(cards()).toHaveLength(130);
    expect(screen.queryByRole('button', { name: 'persons.showMore' })).not.toBeInTheDocument();
  });

  it('uses the search query from the URL', async () => {
    setup({
      entry: '/persons?q=Zora',
      extraMocks: [
        {
          request: { query: SEARCH, variables: { query: 'Zora', language: 'cimode' } },
          result: {
            data: {
              search: [
                { __typename: 'SearchResult', matchedIn: ['NAME'], person: makePerson({ id: 'p7', firstName: 'Zora' }) },
                { __typename: 'SearchResult', matchedIn: ['PHONETIC', 'NOTE'], person: makePerson({ id: 'p8', firstName: 'Sora' }) },
              ],
            },
          },
        },
      ],
    });
    expect(await screen.findByText('Zora Muster')).toBeInTheDocument();
    expect(cards()).toHaveLength(2);
    // Hits outside the name are explained, name hits are not
    expect(screen.getAllByText('search.foundVia')).toHaveLength(1);
    // The number of hits is in a status region and announced by screen readers
    expect(screen.getByText('persons.count')).toHaveAttribute('role', 'status');
  });

  it('offers to undo a deletion', async () => {
    const restore = vi.fn(() => ({ data: { restorePerson: { ...deleted, isDeleted: false, deletedAt: null } } }));
    setup({
      state: { deletedPerson: { id: 'weg', name: 'Otto Muster' } },
      extraMocks: [{ request: { query: RESTORE_PERSON, variables: { id: 'weg' } }, result: restore }],
    });
    expect((await screen.findByText('trash.movedToTrash')).closest('[role="status"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /trash.undo/ }));
    await waitFor(() => expect(restore).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('trash.movedToTrash')).not.toBeInTheDocument());
  });

  it('can dismiss the undo notice', async () => {
    setup({ state: { deletedPerson: { id: 'weg', name: 'Otto Muster' } } });
    await screen.findByText('trash.movedToTrash');
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }));
    expect(screen.queryByText('trash.movedToTrash')).not.toBeInTheDocument();
  });
});
