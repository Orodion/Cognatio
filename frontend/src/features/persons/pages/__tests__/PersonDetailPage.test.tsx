import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { GET_PERSON, DELETE_PERSON, RESTORE_PERSON, HARD_DELETE_PERSON } from '@/features/persons/graphql/personQueries';
import { LOCATE_PERSON } from '@/features/family-trees/graphql/familyTreeQueries';
import { makePerson, makeTree, treesMock } from '@/test/fixtures';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import { PersonDetailPage } from '../PersonDetailPage';

// The tabs have their own tests – here only which one is shown matters
vi.mock('@/features/persons/components/PersonOverviewTab', () => ({ PersonOverviewTab: () => <div>Reiter Übersicht</div> }));
// The tabs show the filter they get
vi.mock('@/features/persons/components/PersonTimelineTab', () => ({
  PersonTimelineTab: ({ filter }: { filter: string }) => (
    <div>
      Reiter Lebenslauf<output>{filter}</output>
    </div>
  ),
}));
vi.mock('@/features/persons/components/PersonRelationsTab', () => ({
  PersonRelationsTab: ({ filter }: { filter: string }) => (
    <div>
      Reiter Beziehungen<output>{filter}</output>
    </div>
  ),
}));
vi.mock('@/features/persons/components/PersonNotesTab', () => ({
  PersonNotesTab: ({ filter }: { filter: string }) => (
    <div>
      Reiter Notizen<output>{filter}</output>
    </div>
  ),
}));
vi.mock('@/features/persons/components/PersonMediaTab', () => ({
  PersonMediaTab: ({ filter }: { filter: string }) => (
    <div>
      Reiter Medien<output>{filter}</output>
    </div>
  ),
}));

afterEach(() => {
  vi.restoreAllMocks();
  useActiveTreeStore.setState({ treeId: 't1' });
});

/** Shows where navigation went (path and passed state) */
function Location() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}|${JSON.stringify(location.state)}`}</div>;
}

const trees = [makeTree({ id: 't1' }), makeTree({ id: 't2', name: 'Familie Otto' })];
const locate = (treeId: string | null): MockedResponse => ({
  request: { query: LOCATE_PERSON, variables: { id: 'p1' } },
  result: { data: { locatePerson: treeId } },
  maxUsageCount: Infinity,
});

function setup(person: ReturnType<typeof makePerson> | null, mocks: MockedResponse[] = [], personMocks?: MockedResponse[]) {
  useActiveTreeStore.setState({ treeId: 't1' });
  const personMock: MockedResponse = {
    request: { query: GET_PERSON, variables: { id: 'p1' } },
    result: { data: { getPerson: person } },
    maxUsageCount: Infinity,
  };
  render(
    <MockedProvider mocks={[...(personMocks ?? [personMock]), treesMock(trees), ...mocks]}>
      <MemoryRouter initialEntries={['/persons/p1']}>
        <Routes>
          <Route path="/trash" element={<Location />} />
          <Route path="/persons/:id" element={<PersonDetailPage />} />
          <Route path="*" element={<Location />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );
}

const tab = (name: string) => screen.getByRole('button', { name });

describe('PersonDetailPage', () => {
  it('shows the person with the overview first and switches tabs', async () => {
    setup(makePerson({ id: 'p1', firstName: 'Anna' }));
    expect(await screen.findByRole('heading', { name: 'Anna Muster' })).toBeInTheDocument();
    expect(screen.getByText('Reiter Übersicht')).toBeInTheDocument();
    expect(tab('personDetail.tabs.overview')).toHaveAttribute('aria-current', 'true');

    for (const [key, content] of [
      ['timeline', 'Reiter Lebenslauf'],
      ['relations', 'Reiter Beziehungen'],
      ['notes', 'Reiter Notizen'],
      ['media', 'Reiter Medien'],
    ]) {
      fireEvent.click(tab(`personDetail.tabs.${key}`));
      expect(screen.getByText(content)).toBeInTheDocument();
      expect(tab(`personDetail.tabs.${key}`)).toHaveAttribute('aria-current', 'true');
      expect(tab('personDetail.tabs.overview')).not.toHaveAttribute('aria-current');
    }
  });

  describe('filter field', () => {
    it('is not offered in the overview, and filters the tab that is open', async () => {
      setup(makePerson({ id: 'p1', firstName: 'Anna' }));
      await screen.findByRole('heading', { name: 'Anna Muster' });
      expect(screen.queryByRole('searchbox')).toBeNull();

      for (const key of ['timeline', 'relations', 'notes', 'media']) {
        fireEvent.click(tab(`personDetail.tabs.${key}`));
        expect(screen.getByRole('searchbox', { name: `personDetail.filter.placeholder.${key}` })).toBeInTheDocument();
      }

      fireEvent.click(tab('personDetail.tabs.overview'));
      expect(screen.queryByRole('searchbox')).toBeNull();
    });

    it('keeps the text when switching between the tabs, and clears it with Esc or the X', async () => {
      setup(makePerson({ id: 'p1', firstName: 'Anna' }));
      await screen.findByRole('heading', { name: 'Anna Muster' });
      fireEvent.click(tab('personDetail.tabs.timeline'));
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Geburt' } });
      expect(screen.getByText('Reiter Lebenslauf').querySelector('output')).toHaveTextContent('Geburt');

      fireEvent.click(tab('personDetail.tabs.notes'));
      expect(screen.getByRole('searchbox')).toHaveValue('Geburt');
      expect(screen.getByText('Reiter Notizen').querySelector('output')).toHaveTextContent('Geburt');

      fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });
      expect(screen.getByRole('searchbox')).toHaveValue('');
      expect(screen.getByText('Reiter Notizen').querySelector('output')).toBeEmptyDOMElement();

      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Taufe' } });
      fireEvent.click(screen.getByRole('button', { name: 'common.clear' }));
      expect(screen.getByRole('searchbox')).toHaveValue('');
    });
  });

  it('says so if the person does not exist', async () => {
    setup(null, [locate(null)]);
    expect(await screen.findByText('personDetail.notFound')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /common.back/ })).toHaveAttribute('href', '/persons');
    expect(useActiveTreeStore.getState().treeId).toBe('t1');
  });

  it('opens the family tree of a person from another one (e.g. a link from another tab)', async () => {
    const anna = makePerson({ id: 'p1', firstName: 'Anna' });
    setup(
      null,
      [locate('t2')],
      [
        { request: { query: GET_PERSON, variables: { id: 'p1' } }, result: { data: { getPerson: null } } },
        { request: { query: GET_PERSON, variables: { id: 'p1' } }, result: { data: { getPerson: anna } }, maxUsageCount: Infinity },
      ],
    );
    expect(await screen.findByRole('heading', { name: 'Anna Muster' })).toBeInTheDocument();
    expect(useActiveTreeStore.getState().treeId).toBe('t2');
    expect(screen.queryByText('personDetail.notFound')).not.toBeInTheDocument();
  });

  it('moves the person to the recycle bin after confirmation and offers undo in the list', async () => {
    const result = vi.fn(() => ({ data: { deletePerson: true } }));
    setup(makePerson({ id: 'p1', firstName: 'Anna' }), [{ request: { query: DELETE_PERSON, variables: { id: 'p1' } }, result }]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);

    fireEvent.click(await screen.findByRole('button', { name: /personDetail.delete/ }));
    expect(result).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /personDetail.delete/ }));

    expect(await screen.findByTestId('location')).toHaveTextContent('/persons|{"deletedPerson":{"id":"p1","name":"Anna Muster"}}');
    expect(confirm).toHaveBeenCalledWith('personDetail.deleteConfirm');
  });

  it('restores a person from the recycle bin', async () => {
    const result = vi.fn(() => ({ data: { restorePerson: makePerson({ id: 'p1' }) } }));
    setup(makePerson({ id: 'p1', isDeleted: true }), [{ request: { query: RESTORE_PERSON, variables: { id: 'p1' } }, result }]);
    fireEvent.click(await screen.findByRole('button', { name: /trash.restore/ }));
    await waitFor(() => expect(result).toHaveBeenCalled());
  });

  it('deletes a person for good only after confirmation', async () => {
    const result = vi.fn(() => ({ data: { hardDeletePerson: true } }));
    setup(makePerson({ id: 'p1', isDeleted: true }), [{ request: { query: HARD_DELETE_PERSON, variables: { id: 'p1' } }, result }]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(await screen.findByRole('button', { name: /trash.deleteForever/ }));
    expect(await screen.findByTestId('location')).toHaveTextContent('/trash');
    expect(result).toHaveBeenCalled();
  });

  it('opens the edit dialog', async () => {
    setup(makePerson({ id: 'p1', firstName: 'Anna' }));
    fireEvent.click(await screen.findByRole('button', { name: /personDetail.edit/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent('form.editTitle');
  });
});
