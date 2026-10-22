import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { GET_EVENTS } from '@/features/persons/graphql/eventQueries';
import { GET_PERSON_RELATIONS } from '@/features/persons/graphql/relationQueries';
import { UNLINK_CITATION } from '@/features/sources/graphql/sourceQueries';
import { makePerson } from '@/test/fixtures';
import { factCitation, makeCitation, personCitationsMock } from '@/test/citations';
import { PersonSourcesTab } from '../PersonSourcesTab';

const person = makePerson({ id: 'p1', birthDate: '01.02.1900' });
const linkedPerson = (id: string, firstName: string) => ({
  __typename: 'Person',
  id,
  firstName,
  lastName: 'Muster',
  gender: 'UNKNOWN',
  birthDate: null,
  deathDate: null,
  isDeleted: false,
});
const personLink = (id: string, firstName: string, fact: string) => ({
  __typename: 'CitationLink',
  kind: 'PERSON',
  fact,
  person: linkedPerson(id, firstName),
  eventId: null,
  eventTitle: null,
  eventDate: null,
  relationId: null,
  relationType: null,
  otherPerson: null,
  familyTreeId: 't1',
  familyTreeName: 'Familie Muster',
});

const eventsMock: MockedResponse = {
  request: { query: GET_EVENTS, variables: { personId: 'p1' } },
  result: {
    data: {
      getEvents: [
        {
          __typename: 'Event',
          id: 'e1',
          personId: 'p1',
          date: '03.02.1900',
          datePrecision: 'EXACT',
          title: 'Taufe',
          category: 'BAPTISM',
          description: null,
          place: null,
          sortOrder: null,
          createdAt: '1',
          updatedAt: '1',
          media: [],
        },
      ],
    },
  },
  maxUsageCount: Infinity,
};
const relationsMock: MockedResponse = {
  request: { query: GET_PERSON_RELATIONS, variables: { personId: 'p1' } },
  result: { data: { getPersonRelations: [] } },
  maxUsageCount: Infinity,
};

function setup(mocks: MockedResponse[] = [], filter?: string) {
  render(
    <MockedProvider
      mocks={[
        personCitationsMock('p1', [
          factCitation('PERSON', { fact: 'BIRTH' }, 'c1', [personLink('p1', 'Anna', 'BIRTH'), personLink('p2', 'Otto', 'BIRTH')]),
          factCitation('EVENT', { eventId: 'e1' }, 'c2'),
        ]),
        eventsMock,
        relationsMock,
        ...mocks,
      ]}
    >
      <MemoryRouter>
        <PersonSourcesTab person={person} filter={filter} />
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('PersonSourcesTab', () => {
  it('groups the citations by fact in the order of the facts, with source, page and quality', async () => {
    setup();
    const birth = await screen.findByRole('region', { name: 'sources.facts.BIRTH (01.02.1900)' });
    expect(within(birth).getByRole('link', { name: 'Kirchenbuch St. Martin' })).toHaveAttribute('href', '/sources/s1');
    expect(within(birth).getByText('S. 12')).toBeInTheDocument();
    expect(within(birth).getByText('sources.quality.short.3')).toBeInTheDocument();
    // The citation supports a further fact: opening it lists the facts by person
    const toggle = within(birth).getByRole('button', { name: 'sources.citation.supports' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(birth).getByRole('link', { name: 'Otto Muster' })).toHaveAttribute('href', '/persons/p2');
    const regions = screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'));
    expect(regions).toEqual(['sources.facts.BIRTH (01.02.1900)', 'Taufe (03.02.1900)']);
  });

  it('filters by source, page, transcription and fact', async () => {
    setup([], 'Taufe');
    expect(await screen.findByRole('region', { name: 'Taufe (03.02.1900)' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'sources.facts.BIRTH (01.02.1900)' })).not.toBeInTheDocument();
  });

  it('removes the citation from a fact after asking; the citation itself stays', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const result = vi.fn(() => ({ data: { unlinkCitation: makeCitation() } }));
    setup([{ request: { query: UNLINK_CITATION, variables: { citationId: 'c1', target: { personId: 'p1', fact: 'BIRTH' } } }, result }]);
    const birth = await screen.findByRole('region', { name: 'sources.facts.BIRTH (01.02.1900)' });
    fireEvent.click(within(birth).getByRole('button', { name: 'sources.person.unlink' }));
    await waitFor(() => expect(result).toHaveBeenCalled());
  });
});
