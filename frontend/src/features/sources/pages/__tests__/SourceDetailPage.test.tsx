import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DELETE_CITATION, DELETE_SOURCE, GET_SOURCE, UNLINK_CITATION, UPDATE_SOURCE } from '@/features/sources/graphql/sourceQueries';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import { makeTree, treesMock } from '@/test/fixtures';
import { makeCitation, makeSource } from '@/test/citations';
import { SourceDetailPage } from '../SourceDetailPage';

const person = (id: string, firstName: string, more: Record<string, unknown> = {}) => ({
  __typename: 'Person',
  id,
  firstName,
  lastName: 'Muster',
  gender: 'UNKNOWN',
  birthDate: null,
  deathDate: null,
  isDeleted: false,
  ...more,
});
const anna = person('p1', 'Anna', { gender: 'FEMALE', birthDate: '01.02.1875', deathDate: '1950' });
const otto = person('p2', 'Otto', { gender: 'MALE' });
const link = (overrides: Record<string, unknown>) => ({
  __typename: 'CitationLink',
  kind: 'PERSON',
  fact: null,
  person: anna,
  eventId: null,
  eventTitle: null,
  eventDate: null,
  relationId: null,
  relationType: null,
  otherPerson: null,
  familyTreeId: 't1',
  familyTreeName: 'Familie Muster',
  ...overrides,
});
const scan = {
  __typename: 'Media',
  id: 'm1',
  personId: null,
  fileName: 'stored.jpg',
  originalFileName: 'Titelblatt.jpg',
  mimeType: 'image/jpeg',
  viewable: true,
  sizeBytes: 3,
  type: 'DOCUMENT',
  createdAt: '1',
  updatedAt: '1',
};

const source = makeSource({
  author: 'Pfarramt',
  repositoryId: 'r1',
  repository: { __typename: 'Repository', id: 'r1', name: 'Kirchenbuchamt' },
  callNumber: 'KB 12',
  media: [scan],
  linkCount: 3,
  citations: [
    {
      ...makeCitation({ text: 'Getraut am 3. Mai 1900', quality: 3, linkCount: 3 }),
      links: [
        link({ fact: 'BIRTH' }),
        link({ kind: 'EVENT', eventId: 'e1', eventTitle: 'Hochzeit', eventDate: '1900', person: otto }),
        link({ fact: 'NAME' }),
        // Otto has other facts here, so the relation is listed with him: Anna is his wife
        link({ kind: 'RELATION', relationId: 'r1', relationType: 'WIFE', person: otto, otherPerson: anna }),
        link({ person: person('p3', 'Lisa', { isDeleted: true }), familyTreeId: 't2', familyTreeName: 'Kraft' }),
      ],
    },
  ],
});

const sourceMock: MockedResponse = { request: { query: GET_SOURCE, variables: { id: 's1' } }, result: { data: { source } }, maxUsageCount: Infinity };

function setup(mocks: MockedResponse[] = []) {
  useActiveTreeStore.setState({ treeId: 't1' });
  render(
    <MockedProvider mocks={[sourceMock, treesMock([makeTree()]), ...mocks]}>
      <MemoryRouter initialEntries={['/sources/s1']}>
        <Routes>
          <Route path="/sources/:id" element={<SourceDetailPage />} />
          <Route path="/sources" element={<p>list</p>} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('SourceDetailPage', () => {
  it('shows the fields, the scans and every citation with the facts it supports, also in other family trees', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'Kirchenbuch St. Martin' })).toBeInTheDocument();
    expect(screen.getByText('Kirchenbuchamt')).toBeInTheDocument();
    expect(screen.getByText('KB 12')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Titelblatt.jpg' })).toBeInTheDocument();
    const citation = screen.getByRole('region', { name: 'S. 12' });
    expect(within(citation).getByText('Getraut am 3. Mai 1900')).toBeInTheDocument();
    expect(within(citation).getByText('sources.quality.3')).toBeInTheDocument();
    // Labelled parts of the entry
    expect(within(citation).getByText('sources.citation.text')).toBeInTheDocument();
    expect(within(citation).getByText('sources.detail.supportsCount')).toBeInTheDocument();
    // Every person once, with life years, linking to the person
    const persons = within(citation)
      .getAllByRole('link')
      .map((a) => [a.textContent, a.getAttribute('href')]);
    expect(persons).toEqual([
      ['Anna Muster', '/persons/p1'],
      ['Otto Muster', '/persons/p2'],
      ['Lisa Muster', '/persons/p3'],
    ]);
    expect(within(citation).getByText('(1875 - 1950)')).toBeInTheDocument();
    // The facts of each person as chips, in the order person, name, birth, death, events, relations
    const facts = within(citation)
      .getAllByRole('list', { name: 'sources.detail.factsOf' })
      .map((list) =>
        within(list)
          .getAllByRole('listitem')
          .map((li) => li.textContent),
      );
    expect(facts).toEqual([['sources.facts.NAME', 'sources.facts.BIRTH'], ['Hochzeit (1900)', 'relations.types.WIFE: Anna Muster'], ['sources.facts.GENERAL']]);
    // The family tree is named only for persons of another family tree; persons in the recycle bin are marked
    expect(within(citation).getAllByText('Kraft')).toHaveLength(1);
    expect(within(citation).queryByText(/Familie Muster/)).not.toBeInTheDocument();
    expect(within(citation).getByText('sources.detail.inTrash')).toBeInTheDocument();
  });

  it('removes the link of one fact after asking', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const result = vi.fn(() => ({ data: { unlinkCitation: makeCitation() } }));
    setup([{ request: { query: UNLINK_CITATION, variables: { citationId: 'c1', target: { personId: 'p1', fact: 'NAME' } } }, result }]);
    const [first] = await screen.findAllByRole('button', { name: 'sources.detail.unlink' });
    fireEvent.click(first);
    expect(window.confirm).toHaveBeenCalledWith('sources.detail.unlinkConfirm');
    await waitFor(() => expect(result).toHaveBeenCalled());
  });

  it('removes a scan of the source by saving the source without it', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const result = vi.fn(() => ({ data: { updateSource: { ...source, media: [] } } }));
    setup([
      {
        request: {
          query: UPDATE_SOURCE,
          variables: {
            id: 's1',
            data: {
              type: 'CHURCH_BOOK',
              title: 'Kirchenbuch St. Martin',
              author: 'Pfarramt',
              publication: null,
              abbreviation: null,
              text: null,
              repositoryId: 'r1',
              callNumber: 'KB 12',
              note: null,
              mediaIds: [],
            },
          },
        },
        result,
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'sources.scans.remove' }));
    await waitFor(() => expect(result).toHaveBeenCalled());
  });

  it('deletes a citation after naming the number of facts it supports', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const result = vi.fn(() => ({ data: { deleteCitation: true } }));
    setup([{ request: { query: DELETE_CITATION, variables: { id: 'c1' } }, result }]);
    fireEvent.click(await screen.findByRole('button', { name: 'sources.detail.deleteCitation' }));
    expect(window.confirm).toHaveBeenCalledWith('sources.detail.deleteCitationConfirm');
    await waitFor(() => expect(result).toHaveBeenCalled());
  });

  it('moves the source into the recycle bin and goes back to the list', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const result = vi.fn(() => ({ data: { deleteSource: true } }));
    setup([{ request: { query: DELETE_SOURCE, variables: { id: 's1' } }, result }]);
    fireEvent.click(await screen.findByRole('button', { name: 'common.delete' }));
    await waitFor(() => expect(result).toHaveBeenCalled());
    expect(await screen.findByText('list')).toBeInTheDocument();
  });

  it('says so when the source does not exist', async () => {
    useActiveTreeStore.setState({ treeId: 't1' });
    render(
      <MockedProvider mocks={[{ request: { query: GET_SOURCE, variables: { id: 'gone' } }, result: { data: { source: null } } }, treesMock()]}>
        <MemoryRouter initialEntries={['/sources/gone']}>
          <Routes>
            <Route path="/sources/:id" element={<SourceDetailPage />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    );
    expect(await screen.findByText('sources.detail.notFound')).toBeInTheDocument();
  });
});
