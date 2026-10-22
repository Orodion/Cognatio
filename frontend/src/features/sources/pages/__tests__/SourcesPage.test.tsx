import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { DELETE_REPOSITORY, GET_REPOSITORIES, GET_SOURCES } from '@/features/sources/graphql/sourceQueries';
import { makeRepository, makeSource } from '@/test/citations';
import { SourcesPage } from '../SourcesPage';

const inTree = [makeSource(), makeSource({ id: 's3', title: 'Neu angelegt', type: 'LETTER', citationCount: 0, linkCount: 0, treeLinkCount: 0 })];
const all = [...inTree, makeSource({ id: 's2', title: 'Volkszählung 1900', type: 'CENSUS', linkCount: 4, treeLinkCount: 0 })];

const mocks: MockedResponse[] = [
  { request: { query: GET_SOURCES, variables: { scope: 'TREE' } }, result: { data: { sources: inTree } }, maxUsageCount: Infinity },
  { request: { query: GET_SOURCES, variables: { scope: 'ALL' } }, result: { data: { sources: all } }, maxUsageCount: Infinity },
  {
    request: { query: GET_REPOSITORIES },
    result: { data: { repositories: [makeRepository({ address: 'Rathausplatz 1', sourceCount: 2 })] } },
    maxUsageCount: Infinity,
  },
];

function setup(extra: MockedResponse[] = []) {
  render(
    <MockedProvider mocks={[...mocks, ...extra]}>
      <MemoryRouter>
        <SourcesPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('SourcesPage', () => {
  it('lists the sources of the family tree and the unused ones, all family trees on request', async () => {
    setup();
    expect(await screen.findByRole('link', { name: 'Kirchenbuch St. Martin' })).toHaveAttribute('href', '/sources/s1');
    expect(screen.getByText('sources.list.unused')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Volkszählung 1900' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'sources.list.allTrees' }));
    expect(await screen.findByRole('link', { name: 'Volkszählung 1900' })).toBeInTheDocument();
    expect(screen.getByText('sources.list.otherTrees')).toBeInTheDocument();
  });

  it('filters by kind and text', async () => {
    setup();
    await screen.findByRole('link', { name: 'Kirchenbuch St. Martin' });
    fireEvent.change(screen.getByRole('combobox', { name: 'sources.fields.type' }), { target: { value: 'LETTER' } });
    expect(screen.queryByRole('link', { name: 'Kirchenbuch St. Martin' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Neu angelegt' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'sources.list.filter' }), { target: { value: 'nichts' } });
    expect(screen.getByText('sources.list.noMatches')).toBeInTheDocument();
  });

  it('shows the archives and moves one into the recycle bin after asking', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const result = vi.fn(() => ({ data: { deleteRepository: true } }));
    setup([{ request: { query: DELETE_REPOSITORY, variables: { id: 'r1' } }, result }]);
    fireEvent.click(screen.getByRole('button', { name: 'sources.area.repositories' }));
    expect(await screen.findByText('Standesamt Musterstadt')).toBeInTheDocument();
    expect(screen.getByText('Rathausplatz 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'sources.repositories.delete' }));
    expect(window.confirm).toHaveBeenCalledWith('sources.repositories.deleteConfirm');
    await waitFor(() => expect(result).toHaveBeenCalled());
  });
});
