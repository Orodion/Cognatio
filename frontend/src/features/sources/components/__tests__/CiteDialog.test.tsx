import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { CREATE_CITATION, CREATE_SOURCE, GET_REPOSITORIES, GET_SOURCE_CITATIONS, GET_SOURCES, LINK_CITATION } from '@/features/sources/graphql/sourceQueries';
import type { PersonFact } from '@/features/sources/lib/personFacts';
import { makeCitation, makeSource } from '@/test/citations';
import { CiteDialog } from '../CiteDialog';

const facts: PersonFact[] = [
  { key: 'PERSON:GENERAL', target: { personId: 'p1', fact: 'GENERAL' }, label: 'Person' },
  { key: 'PERSON:BIRTH', target: { personId: 'p1', fact: 'BIRTH' }, label: 'Geburt' },
  { key: 'EVENT:e1', target: { eventId: 'e1' }, label: 'Taufe' },
];

const sourcesMock: MockedResponse = {
  request: { query: GET_SOURCES, variables: { scope: 'ALL' } },
  result: { data: { sources: [makeSource(), makeSource({ id: 's2', title: 'Standesamtsregister', type: 'CIVIL_REGISTER' })] } },
  maxUsageCount: Infinity,
};
const repositoriesMock: MockedResponse = { request: { query: GET_REPOSITORIES }, result: { data: { repositories: [] } }, maxUsageCount: Infinity };

function setup(mocks: MockedResponse[], factKey = 'PERSON:BIRTH') {
  const onClose = vi.fn();
  render(
    <MockedProvider mocks={[sourcesMock, repositoriesMock, ...mocks]}>
      <CiteDialog open onClose={onClose} facts={facts} factKey={factKey} />
    </MockedProvider>,
  );
  return { onClose };
}

describe('CiteDialog', () => {
  it('links a citation of the source that exists already – e.g. the marriage entry cited for the bride as well', async () => {
    const result = vi.fn(() => ({ data: { linkCitation: makeCitation({ id: 'c9' }) } }));
    const { onClose } = setup([
      {
        request: { query: GET_SOURCE_CITATIONS, variables: { id: 's1' } },
        result: { data: { source: { __typename: 'Source', id: 's1', citations: [makeCitation({ id: 'c9', page: 'Nr. 117', linkCount: 3 })] } } },
        maxUsageCount: Infinity,
      },
      { request: { query: LINK_CITATION, variables: { citationId: 'c9', targets: [{ personId: 'p1', fact: 'BIRTH' }] } }, result },
    ]);

    fireEvent.click(await screen.findByRole('radio', { name: /Kirchenbuch St. Martin/ }));
    fireEvent.click(await screen.findByRole('radio', { name: /Nr. 117/ }));
    fireEvent.click(screen.getByRole('button', { name: 'sources.cite.save' }));

    await waitFor(() => expect(result).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('creates a new source and a new citation of it for the chosen fact', async () => {
    const created = vi.fn(() => ({ data: { createSource: makeSource({ id: 'new-source', title: 'Taufbuch' }) } }));
    const cited = vi.fn(() => ({ data: { createCitation: makeCitation({ id: 'new-citation', sourceId: 'new-source' }) } }));
    setup(
      [
        {
          request: {
            query: CREATE_SOURCE,
            variables: {
              data: {
                type: 'CHURCH_BOOK',
                title: 'Taufbuch',
                author: null,
                publication: null,
                abbreviation: null,
                repositoryId: null,
                callNumber: null,
                text: null,
                note: null,
              },
            },
          },
          result: created,
        },
        {
          request: {
            query: CREATE_CITATION,
            variables: {
              data: { sourceId: 'new-source', page: 'S. 3', date: null, datePrecision: null, text: null, quality: 3, note: null },
              targets: [{ eventId: 'e1' }],
            },
          },
          result: cited,
        },
      ],
      'EVENT:e1',
    );

    fireEvent.click(await screen.findByRole('radio', { name: 'sources.cite.newSource' }));
    fireEvent.change(screen.getByLabelText(/sources.fields.title/), { target: { value: ' Taufbuch ' } });
    fireEvent.change(screen.getByLabelText('sources.citation.page'), { target: { value: 'S. 3' } });
    fireEvent.change(screen.getByLabelText('sources.citation.quality'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'sources.cite.save' }));

    await waitFor(() => expect(created).toHaveBeenCalled());
    await waitFor(() => expect(cited).toHaveBeenCalled());
  });

  it('asks for a source and for the title of a new one', async () => {
    setup([]);
    fireEvent.click(await screen.findByRole('button', { name: 'sources.cite.save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('sources.cite.chooseSource');
    fireEvent.click(screen.getByRole('radio', { name: 'sources.cite.newSource' }));
    fireEvent.click(screen.getByRole('button', { name: 'sources.cite.save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('sources.fields.titleRequired');
  });

  it('filters the sources while typing', async () => {
    setup([]);
    expect(await screen.findByRole('radio', { name: /Kirchenbuch/ })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'sources.cite.searchSource' }), { target: { value: 'standes' } });
    expect(screen.queryByRole('radio', { name: /Kirchenbuch/ })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Standesamtsregister/ })).toBeInTheDocument();
  });
});
