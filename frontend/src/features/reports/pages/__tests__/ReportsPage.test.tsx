import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { makePerson } from '@/test/fixtures';
import { DEFAULT_REPORT_OPTIONS, useSettingsStore } from '@/stores/settingsStore';
import { REPORT_PERSONS, REPORT_TREE } from '../../graphql/reportQueries';
import { ReportsPage } from '../ReportsPage';
import { GET_TREE_STATISTICS } from '@/features/statistics/graphql/statisticsQueries';
import { GET_SOURCE_STATISTICS } from '@/features/sources/graphql/sourceQueries';
import { sourceStatistics, stats } from '@/test/statistics';

const persons = [
  makePerson({ id: 'me', firstName: 'Max', lastName: 'Kraft', gender: 'MALE', birthDate: '04.01.1950', birthPlace: 'Köln', deathDate: '1.2.2020' }),
  makePerson({ id: 'dad', firstName: 'Otto', lastName: 'Kraft', gender: 'MALE', birthDate: '1920' }),
  makePerson({ id: 'mum', firstName: 'Erna', lastName: 'Kraft', gender: 'FEMALE', birthDate: '1925', phone: '0221 123' }),
  makePerson({ id: 'wife', firstName: 'Lena', lastName: 'Kraft', gender: 'FEMALE', birthDate: '1955' }),
  makePerson({ id: 'kid', firstName: 'Paul', lastName: 'Kraft', gender: 'MALE', birthDate: '01.03.1980' }),
];
const relation = (id: string, personAId: string, type: string, personBId: string, startDate: string | null = null) => ({
  __typename: 'Relation',
  id,
  personAId,
  personBId,
  type,
  label: null,
  active: true,
  startDate,
  endDate: null,
});
const relations = [
  relation('r1', 'me', 'FATHER', 'dad'),
  relation('r2', 'me', 'MOTHER', 'mum'),
  relation('r3', 'dad', 'WIFE', 'mum', '1948-06-12T00:00:00.000Z'),
  relation('r4', 'me', 'WIFE', 'wife', '1978-05-20T00:00:00.000Z'),
  relation('r5', 'kid', 'FATHER', 'me'),
  relation('r6', 'kid', 'MOTHER', 'wife'),
];
const details = (id: string) => ({
  __typename: 'ReportPerson',
  id,
  events:
    id === 'me'
      ? [
          {
            __typename: 'Event',
            id: 'e1',
            personId: 'me',
            date: '1968',
            datePrecision: 'YEAR',
            title: 'Abitur',
            category: 'OTHER',
            description: null,
            place: 'Bonn',
            sortOrder: null,
            createdAt: '1',
            updatedAt: '1',
          },
        ]
      : [],
  notes: id === 'me' ? [{ __typename: 'Note', id: 'n1', personId: 'me', text: 'Liebte Gärten.', createdAt: '1', updatedAt: '1' }] : [],
  media: [],
  citations:
    id === 'me'
      ? [
          {
            __typename: 'FactCitation',
            kind: 'PERSON',
            fact: 'BIRTH',
            eventId: null,
            relationId: null,
            citation: {
              __typename: 'Citation',
              id: 'c1',
              sourceId: 's1',
              page: '12',
              date: null,
              text: null,
              quality: 3,
              createdAt: '1',
              updatedAt: '1',
              linkCount: 1,
              source: { __typename: 'Source', id: 's1', title: 'Taufbuch St. Martin', type: 'CHURCH_BOOK', abbreviation: null, author: null, repository: null },
            },
          },
        ]
      : [],
});

function setup(url: string) {
  const mocks: MockedResponse[] = [
    { request: { query: REPORT_TREE }, result: { data: { getPersons: persons, getRelations: relations } }, maxUsageCount: Infinity },
    {
      request: { query: REPORT_PERSONS },
      variableMatcher: () => true,
      result: (variables: { ids: string[] }) => ({ data: { reportPersons: variables.ids.map(details) } }),
      maxUsageCount: Infinity,
    } as MockedResponse,
    {
      request: { query: GET_TREE_STATISTICS },
      variableMatcher: () => true,
      result: { data: { treeStatistics: stats() } },
      maxUsageCount: Infinity,
    } as MockedResponse,
    { request: { query: GET_SOURCE_STATISTICS }, result: { data: { sourceStatistics } }, maxUsageCount: Infinity },
  ];
  render(
    <MockedProvider mocks={mocks}>
      <MemoryRouter initialEntries={[url]}>
        <ReportsPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(() => {
  useSettingsStore.setState({ reportOptions: DEFAULT_REPORT_OPTIONS });
  delete window.cognatioPlatform;
  vi.restoreAllMocks();
});

describe('ReportsPage', () => {
  it('asks for a starting person first', async () => {
    setup('/reports');
    expect(await screen.findByText('reports.choosePersonHint')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reports.print/ })).toBeDisabled();
  });

  it('shows the person sheet with relatives, life events, notes and the sources as footnotes', async () => {
    setup('/reports?person=me');
    const report = await screen.findByTestId('report');
    expect(within(report).getByRole('heading', { name: 'Max Kraft', level: 2 })).toBeInTheDocument();
    expect(report).toHaveTextContent('04.01.1950, Köln1');
    expect(report).toHaveTextContent('Otto Kraft (* 1920)');
    expect(report).toHaveTextContent('Lena Kraft (* 1955) · reports.marriedOn');
    expect(report).toHaveTextContent('Paul Kraft (* 1980)');
    expect(report).toHaveTextContent('Abitur, Bonn');
    expect(report).toHaveTextContent('Liebte Gärten.');
    expect(report).toHaveTextContent('Taufbuch St. Martin, reports.citationPage');
    // Contact data is off by default
    expect(report).not.toHaveTextContent('0221');
  });

  it('leaves out notes and sources when switched off and remembers the choice', async () => {
    setup('/reports?person=me');
    const report = await screen.findByTestId('report');
    fireEvent.click(screen.getByLabelText('reports.options.notes'));
    fireEvent.click(screen.getByLabelText('reports.options.sources'));
    expect(report).not.toHaveTextContent('Liebte Gärten.');
    expect(report).not.toHaveTextContent('Taufbuch');
    expect(useSettingsStore.getState().reportOptions).toMatchObject({ notes: false, sources: false });
  });

  it('shows living persons only with name and year of birth when asked to', async () => {
    useSettingsStore.setState({ reportOptions: { ...DEFAULT_REPORT_OPTIONS, hideLiving: true } });
    setup('/reports?person=kid');
    const report = await screen.findByTestId('report');
    expect(report).toHaveTextContent('reports.livingHidden');
    expect(report).not.toHaveTextContent('01.03.1980');
  });

  it('lists the ancestors with Kekulé numbers and the wedding of the parents', async () => {
    setup('/reports?type=ancestors&person=me');
    const report = await screen.findByTestId('report');
    const rows = within(report)
      .getAllByRole('row')
      .map((row) => row.textContent);
    expect(rows).toEqual([
      expect.stringMatching(/^1Max Kraft/),
      expect.stringMatching(/^2Otto Kraft.*reports.marriedOn/),
      expect.stringMatching(/^3Erna Kraft/),
    ]);
  });

  it('lists the descendants with d’Aboville numbers and their partners', async () => {
    setup('/reports?type=descendants&person=dad');
    const report = await screen.findByTestId('report');
    expect(report).toHaveTextContent(
      /1Otto Kraft.*reports.partner: Erna Kraft.*reports.marriedOn.*1\.1Max Kraft.*reports.partner: Lena Kraft.*1\.1\.1Paul Kraft/,
    );
  });

  it('shows one family sheet per partner with the children of the couple', async () => {
    setup('/reports?type=family&person=me');
    const report = await screen.findByTestId('report');
    expect(within(report).getByRole('heading', { name: 'Max Kraft & Lena Kraft', level: 2 })).toBeInTheDocument();
    expect(within(report).getByRole('cell', { name: 'Paul Kraft' })).toBeInTheDocument();
  });

  it('prints only a copy of the report and cleans up afterwards', async () => {
    setup('/reports?person=me');
    await screen.findByTestId('report');
    let printed: { title: string; text: string; page: string } | null = null;
    vi.spyOn(window, 'print').mockImplementation(() => {
      const root = document.getElementById('report-print-root')!;
      printed = { title: document.title, text: root.textContent ?? '', page: root.querySelector('style')!.textContent ?? '' };
      expect(document.documentElement).toHaveClass('report-printing');
    });
    fireEvent.click(screen.getByRole('button', { name: /reports.print/ }));
    await waitFor(() => expect(printed).not.toBeNull());
    expect(printed!.title).toBe('reports.types.person – Max Kraft');
    expect(printed!.text).toContain('Abitur');
    expect(printed!.page).toMatch(/@page \{ size: (A4|letter)/);
    expect(document.getElementById('report-print-root')).toBeNull();
    expect(document.documentElement).not.toHaveClass('report-printing');
  });

  it('saves the PDF through the desktop app when it can', async () => {
    const savePdf = vi.fn(async () => {
      expect(document.getElementById('report-print-root')).not.toBeNull();
      return true;
    });
    window.cognatioPlatform = { savePdf };
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    setup('/reports?person=me&type=ancestors');
    await screen.findByTestId('report');
    expect(screen.queryByText('reports.pdfHint')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reports.savePdf/ }));
    await waitFor(() => expect(savePdf).toHaveBeenCalledWith('reports.types.ancestors – Max Kraft'));
    expect(print).not.toHaveBeenCalled();
  });
});

describe('ReportsPage – statistics', () => {
  it('prints all figures of the statistics for a scope as tables', async () => {
    setup('/reports?type=statistics&scope=surname&surname=Muster');
    const report = await screen.findByTestId('report');
    expect(await within(report).findByText('statistics.completeness.title')).toBeInTheDocument();
    expect(within(report).getByText('statistics.records.kinds.longestLife')).toBeInTheDocument();
    expect(within(report).getByText('1900–1909')).toBeInTheDocument();
    // No start person, but the scope of the statistics
    expect(screen.queryByLabelText('reports.start')).not.toBeInTheDocument();
    expect(screen.getByLabelText('statistics.scope.surname')).toHaveValue('Muster');
    await waitFor(() => expect(screen.getByRole('button', { name: /reports.print/ })).toBeEnabled());
  });
});
