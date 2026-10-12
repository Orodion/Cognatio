import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CREATE_FAMILY_TREE, DELETE_FAMILY_TREE, UPDATE_FAMILY_TREE } from '@/features/family-trees/graphql/familyTreeQueries';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import { makeTree, treesMock } from '@/test/fixtures';
import { FamilyTreesPage } from '../FamilyTreesPage';

const muster = makeTree({ id: 't1', name: 'Familie Muster', personCount: 12, description: 'Väterliche Seite' });
const otto = makeTree({ id: 't2', name: 'Familie Otto', personCount: 1 });

function Location() {
  const { pathname } = useLocation();
  return <p data-testid="location">{pathname}</p>;
}

function setup(mocks: MockedResponse[] = [], trees = [muster, otto], later?: typeof trees) {
  // later: list after a change (e.g. with the newly created family tree)
  const lists = later ? [{ ...treesMock(trees), maxUsageCount: 1 }, treesMock(later)] : [treesMock(trees)];
  render(
    <MockedProvider mocks={[...lists, ...mocks]}>
      <MemoryRouter initialEntries={['/family-trees']}>
        <Routes>
          <Route path="/family-trees" element={<FamilyTreesPage />} />
          <Route path="*" element={<Location />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );
}

const card = (name: string) => screen.getByRole('listitem', { name });

beforeEach(() => useActiveTreeStore.setState({ treeId: 't1' }));
afterEach(() => vi.restoreAllMocks());

describe('FamilyTreesPage', () => {
  it('lists the family trees and marks the open one', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'Familie Muster' })).toBeInTheDocument();
    const open = card('Familie Muster');
    expect(open).toHaveAttribute('aria-current', 'true');
    expect(within(open).getByText('familyTrees.activeBadge')).toBeInTheDocument();
    expect(within(open).getByText('Väterliche Seite')).toBeInTheDocument();
    expect(within(open).getByText(/familyTrees.persons/)).toBeInTheDocument();
    // The open one does not need to be opened
    expect(within(open).queryByRole('button', { name: 'familyTrees.open' })).not.toBeInTheDocument();
    expect(within(card('Familie Otto')).getByRole('button', { name: 'familyTrees.open' })).toBeInTheDocument();
  });

  it('opens another family tree on the dashboard', async () => {
    setup();
    fireEvent.click(within(await screen.findByRole('listitem', { name: 'Familie Otto' })).getByRole('button', { name: 'familyTrees.open' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'));
    expect(useActiveTreeStore.getState().treeId).toBe('t2');
  });

  it('creates a family tree and opens it', async () => {
    const created = makeTree({ id: 't3', name: 'Familie Neu', personCount: 0 });
    setup(
      [
        {
          request: { query: CREATE_FAMILY_TREE, variables: { data: { name: 'Familie Neu', description: null } } },
          result: { data: { createFamilyTree: created } },
        },
      ],
      [muster, otto],
      [muster, otto, created],
    );
    fireEvent.click(await screen.findByRole('button', { name: 'familyTrees.create' }));
    const dialog = screen.getByRole('dialog', { name: 'familyTrees.form.createTitle' });

    // It does not work without a name
    fireEvent.click(within(dialog).getByRole('button', { name: 'familyTrees.form.create' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('familyTrees.form.nameRequired');

    fireEvent.change(within(dialog).getByLabelText(/familyTrees.form.name/), { target: { value: '  Familie Neu ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'familyTrees.form.create' }));
    await waitFor(() => expect(useActiveTreeStore.getState().treeId).toBe('t3'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Stays open as soon as the list knows it
    expect(await screen.findByRole('heading', { name: 'Familie Neu' })).toBeInTheDocument();
    expect(useActiveTreeStore.getState().treeId).toBe('t3');
  });

  it('renames a family tree', async () => {
    const renamed = { ...otto, name: 'Familie Otto-Berg' };
    setup([
      {
        request: { query: UPDATE_FAMILY_TREE, variables: { id: 't2', data: { name: 'Familie Otto-Berg', description: null } } },
        result: { data: { updateFamilyTree: renamed } },
      },
    ]);
    fireEvent.click(within(await screen.findByRole('listitem', { name: 'Familie Otto' })).getByRole('button', { name: 'familyTrees.rename' }));
    const name = screen.getByLabelText(/familyTrees.form.name/);
    expect(name).toHaveValue('Familie Otto');
    fireEvent.change(name, { target: { value: 'Familie Otto-Berg' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // Renaming opens nothing
    expect(useActiveTreeStore.getState().treeId).toBe('t1');
  });

  it('moves the open family tree to the trash after switching to another one', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    let deleted = false;
    setup([
      {
        request: { query: DELETE_FAMILY_TREE, variables: { id: 't1' } },
        result: () => {
          deleted = true;
          return { data: { deleteFamilyTree: true } };
        },
      },
    ]);
    fireEvent.click(within(await screen.findByRole('listitem', { name: 'Familie Muster' })).getByRole('button', { name: 'familyTrees.deleteLabel' }));
    expect(confirm).toHaveBeenCalledWith('familyTrees.deleteConfirm');
    await waitFor(() => expect(deleted).toBe(true));
    expect(useActiveTreeStore.getState().treeId).toBe('t2');
  });

  it('moves the last family tree to the trash, too, and leaves it without opening another', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    let deleted = false;
    setup(
      [
        {
          request: { query: DELETE_FAMILY_TREE, variables: { id: 't1' } },
          result: () => {
            deleted = true;
            return { data: { deleteFamilyTree: true } };
          },
        },
      ],
      [muster],
      [],
    );
    const remove = await screen.findByRole('button', { name: 'familyTrees.deleteLabel' });
    expect(remove).toBeEnabled();
    fireEvent.click(remove);
    await waitFor(() => expect(deleted).toBe(true));
    expect(useActiveTreeStore.getState().treeId).toBeNull();
    // The empty list says what can be done now
    expect(await screen.findByText('familyTrees.none.text')).toBeInTheDocument();
  });
});
