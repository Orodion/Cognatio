import { afterEach, describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { GET_SOURCE_STATISTICS } from '@/features/sources/graphql/sourceQueries';
import { SET_HOME_PERSON } from '@/features/family-trees/graphql/familyTreeQueries';
import { vi } from 'vitest';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { GET_TREE_STATISTICS } from '../../graphql/statisticsQueries';
import { sourceStatistics, stats } from '@/test/statistics';
import type { TreeStatistics } from '../../lib/types';
import { StatisticsPage } from '../StatisticsPage';

const SURNAME_SCOPE = { kind: 'SURNAME', personId: null, surname: 'Muster', bornFrom: null, bornTo: null };

function Location() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname + search}</output>;
}

function setup({ entry = '/statistics', mocks }: { entry?: string; mocks?: MockedResponse[] } = {}) {
  const defaults: MockedResponse[] = [
    {
      request: { query: GET_TREE_STATISTICS, variables: { scope: null, language: 'cimode', ancestorsOf: null } },
      result: { data: { treeStatistics: stats() } },
      maxUsageCount: Infinity,
    },
    { request: { query: GET_SOURCE_STATISTICS }, result: { data: { sourceStatistics } }, maxUsageCount: Infinity },
  ];
  render(
    <MockedProvider mocks={[...(mocks ?? []), ...defaults]}>
      <MemoryRouter initialEntries={[entry]}>
        <StatisticsPage />
        <Location />
      </MemoryRouter>
    </MockedProvider>,
  );
}

const statisticsMock = (scope: unknown, values: Partial<TreeStatistics> = {}): MockedResponse => ({
  request: { query: GET_TREE_STATISTICS, variables: { scope, language: 'cimode', ancestorsOf: null } },
  result: { data: { treeStatistics: stats(values) } },
  maxUsageCount: Infinity,
});

afterEach(() => {
  useActiveTreeStore.setState({ treeId: null });
  useSettingsStore.setState({ statisticsScopes: {} });
});

describe('StatisticsPage', () => {
  it('shows the key figures, each leading to its persons', async () => {
    setup();
    const persons = await screen.findByRole('group', { name: 'statistics.kpi.persons' });
    expect(within(persons).getByRole('link', { name: '2' })).toHaveAttribute('href', '/persons?filter=all');
    expect(within(persons).getByRole('link', { name: 'statistics.kpi.male' })).toHaveAttribute('href', '/persons?filter=gender%3AMALE');
    const families = screen.getByRole('group', { name: 'statistics.kpi.families' });
    expect(within(families).getByRole('link', { name: 'statistics.kpi.unconnected' })).toHaveAttribute('href', '/persons?filter=unconnected');
    // Earliest birth year with a link to the person
    expect(screen.getByRole('link', { name: 'Anna Muster' })).toHaveAttribute('href', '/persons/a');
  });

  it('shows the charts in tabs, their bars leading to the persons', async () => {
    setup();
    await screen.findByRole('group', { name: 'statistics.kpi.persons' });

    fireEvent.click(screen.getByRole('button', { name: 'statistics.tabs.names' }));
    const surnames = screen.getByRole('list', { name: 'statistics.surnames.title' });
    const bar = within(surnames).getByRole('link');
    expect(bar).toHaveAttribute('href', '/persons?filter=surname%3AMuster');
    // Hover/focus shows the share
    fireEvent.focus(bar);
    expect(within(bar).getByRole('tooltip')).toHaveTextContent('100');
    expect(screen.getByTestId('location')).toHaveTextContent('/statistics?tab=names');

    fireEvent.click(screen.getByRole('button', { name: 'statistics.tabs.lives' }));
    expect(within(screen.getByRole('list', { name: 'statistics.ages.deceased' })).getByRole('link')).toHaveAttribute('href', '/persons?filter=deathAge%3A80');

    fireEvent.click(screen.getByRole('button', { name: 'statistics.tabs.ancestors' }));
    const table = screen.getByRole('table', { name: 'statistics.generations.title' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getAllByRole('link')[1]).toHaveAttribute('href', '/persons?filter=generation%3A2');

    fireEvent.click(screen.getByRole('button', { name: 'statistics.tabs.sources' }));
    const sources = await screen.findByRole('list', { name: 'statistics.sources.mostCited' });
    expect(within(sources).getByText('Kirchenbuch St. Martin')).toBeInTheDocument();
    expect(within(sources).getByRole('link')).toHaveAttribute('href', '/sources/s1');
  });

  it('shows what is still missing, each gap leading to its persons', async () => {
    setup();
    const table = await screen.findByRole('table', { name: 'statistics.completeness.title' });
    expect(screen.getAllByText(/^50\s?%$/)[0]).toBeInTheDocument();
    expect(within(table).getByRole('link', { name: 'statistics.completeness.missingCount' })).toHaveAttribute('href', '/persons?filter=missing%3Afather');
    expect(within(table).getAllByRole('row')).toHaveLength(3);
  });

  it('shows the ancestors of a person per generation, lets choose another start and make it the home person', async () => {
    const homeMock = vi.fn(() => ({ data: { setHomePerson: { __typename: 'FamilyTree', id: 't1' } } }));
    setup({
      entry: '/statistics?tab=ancestors',
      mocks: [{ request: { query: SET_HOME_PERSON, variables: { personId: 'a' } }, result: homeMock } as MockedResponse],
    });
    const table = await screen.findByRole('table', { name: 'statistics.ancestors.title' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(within(rows[2]).getAllByRole('link')[0]).toHaveAttribute('href', '/persons?filter=ancestors%3Aa%3A2');
    expect(within(rows[2]).getByRole('link', { name: '2' })).toHaveAttribute('href', '/persons?filter=openEnds%3Aa%3A2');
    expect(screen.getByText('statistics.ancestors.collapse')).toBeInTheDocument();
    expect(screen.getByText('statistics.ancestors.noHome')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'statistics.ancestors.makeHome' }));
    await waitFor(() => expect(homeMock).toHaveBeenCalled());
  });

  it('shows births, deaths and weddings per decade, each bar leading to its persons', async () => {
    setup();
    const chart = await screen.findByRole('list', { name: 'statistics.timeline.chart' });
    expect(within(chart).getAllByRole('listitem')).toHaveLength(3);
    expect(within(chart).getByRole('link', { name: 'statistics.timeline.bar' })).toHaveAttribute('href', '/persons?filter=bornDecade%3A1900');
    fireEvent.click(screen.getByRole('button', { name: 'statistics.timeline.measures.deaths' }));
    expect(screen.getByRole('button', { name: 'statistics.timeline.measures.deaths' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(chart).getByRole('link')).toHaveAttribute('href', '/persons?filter=diedDecade%3A1980');
    expect(screen.getByRole('link', { name: 'statistics.timeline.withoutBirths' })).toHaveAttribute('href', '/persons?filter=noBirthYear');
  });

  it('shows lives through time with the persons behind each mean', async () => {
    setup({ entry: '/statistics?tab=lives' });
    const table = await screen.findByRole('table', { name: 'statistics.lives.measures.lifespan' });
    const row = within(table).getAllByRole('row')[1];
    expect(row).toHaveTextContent('1900–1999');
    expect(within(row).getByText('statistics.years')).toBeInTheDocument();
    expect(within(row).getAllByRole('link')[0]).toHaveAttribute('href', '/persons?filter=lives%3Alifespan%3A1900%3Afemale');
    fireEvent.click(screen.getByRole('button', { name: 'statistics.lives.measures.firstChild' }));
    expect(screen.getByRole('table', { name: 'statistics.lives.measures.firstChild' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'statistics.lives.children.title' })).getByRole('link')).toHaveAttribute(
      'href',
      '/persons?filter=children%3A1',
    );
    expect(screen.getByText('statistics.lives.ageGap.womanOlderMean')).toBeInTheDocument();
  });

  it('shows first names and migration, each leading to its persons', async () => {
    setup({ entry: '/statistics?tab=names' });
    const men = await screen.findByRole('list', { name: 'statistics.firstNames.male' });
    expect(within(men).getByRole('link')).toHaveAttribute('href', '/persons?filter=firstName%3Amale%3Aall%3AJohann');
    const fashion = screen.getByRole('table', { name: 'statistics.firstNames.fashion' });
    expect(within(fashion).getByRole('link', { name: 'Johann' })).toHaveAttribute('href', '/persons?filter=firstName%3Amale%3A1800%3AJohann');
    expect(screen.getByRole('link', { name: 'statistics.migration.stayed' })).toHaveAttribute('href', '/persons?filter=stayed%3Ayes');
    expect(within(screen.getByRole('list', { name: 'statistics.migration.moves' })).getByRole('link')).toHaveAttribute(
      'href',
      '/persons?filter=move%3AHalle%7CBerlin',
    );
    const places = screen.getByRole('table', { name: 'statistics.migration.places' });
    expect(places).toHaveTextContent('1850–1920');
    expect(within(places).getByRole('link', { name: '4' })).toHaveAttribute('href', '/persons?filter=place%3AHalle');
    expect(screen.getByText('statistics.migration.morePlaces')).toBeInTheDocument();
  });

  it('shows the records with their holders and marks a possible error', async () => {
    setup({ entry: '/statistics?tab=lives' });
    expect(await screen.findByText('statistics.records.kinds.longestLife')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Anna Muster' })[0]).toHaveAttribute('href', '/persons/a');
    expect(screen.getByText('statistics.records.ties')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'statistics.records.possibleError' })).toHaveAttribute('href', '/checks');
  });

  it('copies the figures of a card as CSV and offers the report for printing', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    setup({ entry: '/statistics?scope=surname&surname=Muster&tab=names', mocks: [statisticsMock(SURNAME_SCOPE, { total: 7 })] });
    await screen.findByRole('list', { name: 'statistics.surnames.title' });
    expect(screen.getByRole('link', { name: 'statistics.print' })).toHaveAttribute('href', '/reports?type=statistics&scope=surname&surname=Muster');

    fireEvent.click(screen.getAllByRole('button', { name: 'statistics.csv.copy' })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0]).toEqual(['statistics.surnames.title\tstatistics.generations.persons\r\nMuster\t2']);
    expect(await screen.findByText('statistics.csv.copied')).toBeInTheDocument();
  });

  it('shows an empty state without persons', async () => {
    setup({ mocks: [statisticsMock(null, { total: 0 })] });
    expect(await screen.findByText('statistics.empty')).toBeInTheDocument();
  });

  it('takes the scope from the URL and keeps it in the links to the persons', async () => {
    setup({ entry: '/statistics?scope=surname&surname=Muster', mocks: [statisticsMock(SURNAME_SCOPE, { total: 7 })] });
    const persons = await screen.findByRole('group', { name: 'statistics.kpi.persons' });
    expect(within(persons).getByRole('link', { name: '7' })).toHaveAttribute('href', '/persons?filter=all&scope=surname&surname=Muster');
    expect(screen.getByLabelText('statistics.scope.label', { selector: 'select' })).toHaveValue('surname');
    expect(screen.getByLabelText('statistics.scope.surname')).toHaveValue('Muster');
  });

  it('changes the scope and remembers it for the family tree', async () => {
    useActiveTreeStore.setState({ treeId: 't1' });
    setup({ mocks: [statisticsMock(SURNAME_SCOPE, { total: 7 })] });
    await screen.findByRole('group', { name: 'statistics.kpi.persons' });

    fireEvent.change(screen.getByLabelText('statistics.scope.label', { selector: 'select' }), { target: { value: 'surname' } });
    fireEvent.change(screen.getByLabelText('statistics.scope.surname'), { target: { value: 'Muster' } });
    fireEvent.blur(screen.getByLabelText('statistics.scope.surname'));

    expect(await screen.findByRole('link', { name: '7' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/statistics?scope=surname&surname=Muster');
    expect(useSettingsStore.getState().statisticsScopes).toEqual({ t1: 'scope=surname&surname=Muster' });

    fireEvent.click(screen.getByRole('button', { name: 'statistics.scope.reset' }));
    expect(await screen.findByRole('link', { name: '2' })).toBeInTheDocument();
    expect(useSettingsStore.getState().statisticsScopes).toEqual({ t1: '' });
  });

  it('keeps a chosen kind that waits for its name while years are typed, and applies both together', async () => {
    const scope = { ...SURNAME_SCOPE, bornFrom: 1800 };
    setup({ mocks: [statisticsMock(scope, { total: 3 })] });
    await screen.findByRole('group', { name: 'statistics.kpi.persons' });

    fireEvent.change(screen.getByLabelText('statistics.scope.label', { selector: 'select' }), { target: { value: 'surname' } });
    fireEvent.change(screen.getByLabelText('statistics.scope.born.fromLabel'), { target: { value: '1800' } });
    fireEvent.blur(screen.getByLabelText('statistics.scope.born.fromLabel'));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/statistics$/);
    expect(screen.getByLabelText('statistics.scope.label', { selector: 'select' })).toHaveValue('surname');

    fireEvent.change(screen.getByLabelText('statistics.scope.surname'), { target: { value: 'Muster' } });
    fireEvent.blur(screen.getByLabelText('statistics.scope.surname'));
    expect(await screen.findByRole('link', { name: '3' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/statistics?scope=surname&surname=Muster&from=1800');
  });

  it('opens with the scope used last in the family tree', async () => {
    useActiveTreeStore.setState({ treeId: 't1' });
    useSettingsStore.setState({ statisticsScopes: { t1: 'scope=surname&surname=Muster' } });
    setup({ entry: '/statistics?tab=names', mocks: [statisticsMock(SURNAME_SCOPE, { total: 7 })] });
    expect(await screen.findByRole('list', { name: 'statistics.surnames.title' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/statistics?scope=surname&surname=Muster&tab=names');
  });

  it('offers to reset a scope that does not fit the family tree', async () => {
    const scope = { kind: 'ANCESTORS', personId: 'gone', surname: null, bornFrom: null, bornTo: null };
    setup({
      entry: '/statistics?scope=ancestors&person=gone',
      mocks: [
        {
          request: { query: GET_TREE_STATISTICS, variables: { scope, language: 'cimode', ancestorsOf: null } },
          result: { errors: [{ message: 'x', extensions: { reason: 'PERSON_NOT_FOUND' } }] },
        } as MockedResponse,
      ],
    });
    expect(await screen.findByText('statistics.scope.invalid')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'statistics.scope.reset' })[1]);
    expect(await screen.findByRole('link', { name: '2' })).toBeInTheDocument();
  });
});
