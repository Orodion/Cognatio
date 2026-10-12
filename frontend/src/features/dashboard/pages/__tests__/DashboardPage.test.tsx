import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { GET_PERSONS } from '@/features/persons/graphql/personQueries';
import { makePerson } from '@/test/fixtures';
import { DashboardPage } from '../DashboardPage';

function setup(persons: Array<ReturnType<typeof makePerson>>) {
  const mocks: MockedResponse[] = [
    { request: { query: GET_PERSONS, variables: { includeDeleted: false } }, result: { data: { getPersons: persons } }, maxUsageCount: Infinity },
  ];
  render(
    <MockedProvider mocks={mocks}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('DashboardPage', () => {
  it('counts persons and genders', async () => {
    setup([
      makePerson({ id: 'a', gender: 'MALE' }),
      makePerson({ id: 'b', gender: 'FEMALE' }),
      makePerson({ id: 'c', gender: 'FEMALE' }),
      makePerson({ id: 'd', gender: 'UNKNOWN' }),
    ]);
    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(screen.getByText('gender.MALE: 1')).toBeInTheDocument();
    expect(screen.getByText('gender.FEMALE: 2')).toBeInTheDocument();
  });

  it('lists the four most recently added persons as links, newest first', async () => {
    // The API returns times as ISO timestamps
    const at = (day: number) => new Date(Date.UTC(2026, 0, day)).toISOString();
    setup([
      makePerson({ id: 'alt', firstName: 'Alt', createdAt: at(1) }),
      makePerson({ id: 'neu', firstName: 'Neu', createdAt: at(9) }),
      makePerson({ id: 'mitte', firstName: 'Mitte', createdAt: at(5) }),
      makePerson({ id: 'fast', firstName: 'Fast', createdAt: at(8) }),
      makePerson({ id: 'etwas', firstName: 'Etwas', createdAt: at(6) }),
    ]);
    await screen.findByText('Neu Muster');
    // Only the entries of the list lead to individual persons
    const links = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/persons/'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/persons/neu', '/persons/fast', '/persons/etwas', '/persons/mitte']);
  });

  it('shows a hint without persons and opens the dialog for a new person', async () => {
    setup([]);
    expect(await screen.findByText('dashboard.noPersons')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /nav.tree/ })).toHaveAttribute('href', '/tree');
    expect(screen.getByRole('link', { name: /dashboard.openPersonList/ })).toHaveAttribute('href', '/persons');
    fireEvent.click(screen.getByRole('button', { name: /persons.newPerson/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent('form.createTitle');
  });
});
