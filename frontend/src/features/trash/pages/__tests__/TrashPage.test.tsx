import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { GET_DELETED_PERSONS, RESTORE_PERSON, HARD_DELETE_PERSON } from '@/features/persons/graphql/personQueries';
import { GET_DELETED_FAMILY_TREES, HARD_DELETE_FAMILY_TREE, RESTORE_FAMILY_TREE } from '@/features/family-trees/graphql/familyTreeQueries';
import { makePerson, makeTree, treesMock } from '@/test/fixtures';
import { GET_DELETED_REPOSITORIES, GET_DELETED_SOURCES, HARD_DELETE_SOURCE, RESTORE_REPOSITORY } from '@/features/sources/graphql/sourceQueries';
import { makeRepository, makeSource } from '@/test/citations';
import type { FamilyTree } from '@/features/family-trees/types/familyTree';
import { TrashPage } from '../TrashPage';

afterEach(() => {
  vi.restoreAllMocks();
});

const deleted = makePerson({ id: 'd1', firstName: 'Otto', isDeleted: true, deletedAt: '1700000000000' });

const deletedTree = makeTree({ id: 't9', name: 'Familie Alt', isDeleted: true, deletedAt: '2026-09-29T10:00:00.000Z', personCount: 3 });

const libraryMocks = (sources: unknown[] = [], repositories: unknown[] = []): MockedResponse[] => [
  { request: { query: GET_DELETED_SOURCES }, result: { data: { deletedSources: sources } }, maxUsageCount: Number.POSITIVE_INFINITY },
  { request: { query: GET_DELETED_REPOSITORIES }, result: { data: { deletedRepositories: repositories } }, maxUsageCount: Number.POSITIVE_INFINITY },
];

function setup(mocks: MockedResponse[], trash = [deleted], trees: FamilyTree[] = [], open: FamilyTree[] = [makeTree()], library = libraryMocks()) {
  const listMock: MockedResponse = {
    request: { query: GET_DELETED_PERSONS },
    result: { data: { getDeletedPersons: trash } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  };
  const treeMock: MockedResponse = {
    request: { query: GET_DELETED_FAMILY_TREES },
    result: { data: { deletedFamilyTrees: trees } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  };
  render(
    <MockedProvider mocks={[listMock, treeMock, treesMock(open), ...library, ...mocks]}>
      <MemoryRouter>
        <TrashPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('TrashPage', () => {
  it('lists sources and archives in the recycle bin – they belong to all family trees', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const hardDelete = vi.fn(() => ({ data: { hardDeleteSource: true } }));
    const restore = vi.fn(() => ({ data: { restoreRepository: { __typename: 'Repository', id: 'r1' } } }));
    setup(
      [
        { request: { query: HARD_DELETE_SOURCE, variables: { id: 's1' } }, result: hardDelete },
        { request: { query: RESTORE_REPOSITORY, variables: { id: 'r1' } }, result: restore },
      ],
      [],
      [],
      [makeTree()],
      libraryMocks(
        [makeSource({ isDeleted: true, deletedAt: '2026-10-13T10:00:00.000Z', citationCount: 2, linkCount: 5 })],
        [makeRepository({ isDeleted: true })],
      ),
    );
    const section = await screen.findByRole('region', { name: 'trash.library.title' });
    expect(section).toHaveTextContent('Kirchenbuch St. Martin');
    expect(section).toHaveTextContent('Standesamt Musterstadt');
    fireEvent.click(screen.getAllByRole('button', { name: 'trash.library.deleteForeverLabel' })[0]);
    expect(window.confirm).toHaveBeenCalledWith('trash.library.deleteSourceConfirm');
    await waitFor(() => expect(hardDelete).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole('button', { name: 'trash.library.restoreLabel' })[1]);
    await waitFor(() => expect(restore).toHaveBeenCalled());
  });

  it('shows the empty state', async () => {
    setup([], []);
    expect(await screen.findByText('trash.emptyPersons')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'trash.personsTitle' })).toBeInTheDocument();
    // Without deleted family trees no section of their own
    expect(screen.queryByRole('heading', { name: 'familyTrees.trash.title' })).not.toBeInTheDocument();
  });

  it('shows only the deleted family trees when there is no family tree', async () => {
    setup([], [deleted], [deletedTree], []);
    expect(await screen.findByRole('region', { name: 'familyTrees.trash.title' })).toHaveTextContent('Familie Alt');
    // Deleted persons belong to a family tree – without one there are none to show
    expect(screen.queryByRole('region', { name: 'trash.personsTitle' })).not.toBeInTheDocument();
    expect(screen.queryByText('Otto')).not.toBeInTheDocument();
  });

  it('restores a deleted family tree', async () => {
    const restore = vi.fn(() => ({ data: { restoreFamilyTree: { ...deletedTree, isDeleted: false, deletedAt: null } } }));
    setup([{ request: { query: RESTORE_FAMILY_TREE, variables: { id: 't9' } }, result: restore }], [], [deletedTree]);

    const section = await screen.findByRole('region', { name: 'familyTrees.trash.title' });
    expect(section).toHaveTextContent('Familie Alt');
    fireEvent.click(screen.getByRole('button', { name: 'familyTrees.trash.restoreLabel' }));
    await waitFor(() => expect(restore).toHaveBeenCalled());
  });

  it('deletes a family tree permanently only after confirmation', async () => {
    const hardDelete = vi.fn(() => ({ data: { hardDeleteFamilyTree: true } }));
    setup([{ request: { query: HARD_DELETE_FAMILY_TREE, variables: { id: 't9' } }, result: hardDelete }], [], [deletedTree]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);

    const button = await screen.findByRole('button', { name: 'familyTrees.trash.deleteForeverLabel' });
    fireEvent.click(button);
    expect(hardDelete).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(confirm).toHaveBeenLastCalledWith('familyTrees.trash.deleteForeverConfirm');
    await waitFor(() => expect(hardDelete).toHaveBeenCalled());
  });

  it('restores a person', async () => {
    const restore = vi.fn(() => ({ data: { restorePerson: { ...deleted, isDeleted: false, deletedAt: null } } }));
    setup([{ request: { query: RESTORE_PERSON, variables: { id: 'd1' } }, result: restore }]);

    fireEvent.click(await screen.findByRole('button', { name: /trash.restore/ }));
    await waitFor(() => expect(restore).toHaveBeenCalled());
  });

  it('deletes permanently only after confirmation', async () => {
    const hardDelete = vi.fn(() => ({ data: { hardDeletePerson: true } }));
    setup([{ request: { query: HARD_DELETE_PERSON, variables: { id: 'd1' } }, result: hardDelete }]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);

    const button = await screen.findByRole('button', { name: /trash.deleteForever/ });
    fireEvent.click(button);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(hardDelete).not.toHaveBeenCalled();

    fireEvent.click(button);
    await waitFor(() => expect(hardDelete).toHaveBeenCalled());
  });

  it('shows a translated error if the server refuses', async () => {
    setup([
      {
        request: { query: RESTORE_PERSON, variables: { id: 'd1' } },
        result: { errors: [{ message: 'x', extensions: { reason: 'PERSON_NOT_FOUND' } }] },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: /trash.restore/ }));
    expect(await screen.findByText('apiErrors.PERSON_NOT_FOUND')).toBeInTheDocument();
  });
});
