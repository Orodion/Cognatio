import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { GET_TREE_DATA } from '@/features/tree/graphql/treeQueries';
import { makePerson } from '@/test/fixtures';
import { StatisticsPage } from '../StatisticsPage';

const relation = (id: string, personAId: string, personBId: string, type: string) => ({
  id,
  personAId,
  personBId,
  type,
  label: null,
  active: true,
  note: null,
  startDate: null,
  endDate: null,
  createdAt: '',
  updatedAt: '',
});

function setup(persons: Array<ReturnType<typeof makePerson>>, relations: Array<ReturnType<typeof relation>> = []) {
  const mock: MockedResponse = {
    request: { query: GET_TREE_DATA },
    result: { data: { getPersons: persons, getRelations: relations } },
  };
  render(
    <MockedProvider mocks={[mock]}>
      <MemoryRouter>
        <StatisticsPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('StatisticsPage', () => {
  it('shows an empty state without persons', async () => {
    setup([]);
    expect(await screen.findByText('statistics.empty')).toBeInTheDocument();
  });

  it('shows key figures, charts and the generation table', async () => {
    setup(
      [
        makePerson({ id: 'a', firstName: 'Anna', lastName: 'Muster', birthDate: '1900', deathDate: '1980', birthPlace: 'Köln' }),
        makePerson({ id: 'b', firstName: 'Bert', lastName: 'Muster', birthDate: '1990', birthPlace: 'Köln' }),
      ],
      [relation('r1', 'a', 'b', 'CHILD')],
    );

    expect(await screen.findByText('statistics.kpi.persons')).toBeInTheDocument();
    // Earliest birth year with a link to the person
    expect(screen.getByRole('link', { name: 'Anna Muster' })).toHaveAttribute('href', '/persons/a');

    const surnames = screen.getByRole('list', { name: 'statistics.surnames.title' });
    const row = within(surnames).getByText('Muster').closest('li')!;
    expect(row).toHaveTextContent('2');
    // Hover/focus shows the share
    fireEvent.focus(row);
    expect(within(row).getByRole('tooltip')).toHaveTextContent('100');

    expect(screen.getByRole('list', { name: 'statistics.places.title' })).toHaveTextContent('Köln');
    expect(screen.getByRole('list', { name: 'statistics.ages.deceased' })).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(table).toHaveTextContent('1900');
    expect(table).toHaveTextContent('1990');
  });
});
