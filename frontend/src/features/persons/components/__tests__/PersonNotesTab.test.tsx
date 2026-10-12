import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { GET_NOTES, CREATE_NOTE, UPDATE_NOTE, DELETE_NOTE } from '@/features/persons/graphql/noteQueries';
import { makePerson } from '@/test/fixtures';
import i18n from '@/i18n';
import { PersonNotesTab } from '../PersonNotesTab';

const person = makePerson({ id: 'p1' });
const note = (id: string, text: string) => ({
  __typename: 'Note',
  id,
  personId: 'p1',
  text,
  createdAt: '2025-09-16T05:20:00.000Z',
  updatedAt: '2025-09-16T05:20:00.000Z',
});

const notesMock = (notes: Array<ReturnType<typeof note>>): MockedResponse => ({
  request: { query: GET_NOTES, variables: { personId: 'p1' } },
  result: { data: { getNotes: notes } },
  maxUsageCount: Infinity,
});

function setup(mocks: MockedResponse[], filter?: string) {
  render(
    <MockedProvider mocks={mocks}>
      <PersonNotesTab person={person} filter={filter} />
    </MockedProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('PersonNotesTab', () => {
  it('limits a note to the length the backend accepts and counts the characters', async () => {
    setup([notesMock([])]);
    const field = await screen.findByPlaceholderText('notes.placeholder');
    expect(field).toHaveAttribute('maxLength', '10000');
    fireEvent.change(field, { target: { value: 'Hallo' } });
    expect(screen.getByText('notes.length')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-describedby', 'new-note-length');
  });

  it('shows the creation time of a note', async () => {
    setup([notesMock([note('n1', 'Erste Notiz')])]);
    expect(await screen.findByText('Erste Notiz')).toBeInTheDocument();
    // In the language of the app; in the tests that is "cimode", so the format is that of the machine
    expect(screen.getByText(new Date('2025-09-16T05:20:00.000Z').toLocaleString(i18n.language), { exact: false })).toBeInTheDocument();
  });

  it('shows an empty state and saves a trimmed new note', async () => {
    const result = vi.fn(() => ({ data: { createNote: note('n1', 'Neue Notiz') } }));
    setup([notesMock([]), { request: { query: CREATE_NOTE, variables: { data: { personId: 'p1', text: 'Neue Notiz' } } }, result }]);

    expect(await screen.findByText('notes.empty')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: /notes.save/ });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('notes.placeholder'), { target: { value: '  Neue Notiz  ' } });
    fireEvent.click(save);
    await waitFor(() => expect(result).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByPlaceholderText('notes.placeholder')).toHaveValue(''));
  });

  it('keeps line breaks and edits a note', async () => {
    const result = vi.fn(() => ({ data: { updateNote: note('n1', 'Geändert') } }));
    setup([
      notesMock([note('n1', 'Erste Zeile\nZweite Zeile')]),
      { request: { query: UPDATE_NOTE, variables: { id: 'n1', data: { text: 'Geändert' } } }, result },
    ]);

    expect(await screen.findByText(/Erste Zeile/)).toHaveClass('whitespace-pre-wrap');
    fireEvent.click(screen.getByRole('button', { name: 'notes.editLabel' }));
    const editor = screen.getByDisplayValue(/Erste Zeile/);
    fireEvent.change(editor, { target: { value: ' ' } });
    // Empty text cannot be saved
    expect(screen.getByRole('button', { name: /common.save/ })).toBeDisabled();

    fireEvent.change(editor, { target: { value: 'Geändert' } });
    fireEvent.click(screen.getByRole('button', { name: /common.save/ }));
    await waitFor(() => expect(result).toHaveBeenCalled());
  });

  it('discards changes on cancel', async () => {
    setup([notesMock([note('n1', 'Original')])]);
    fireEvent.click(await screen.findByRole('button', { name: 'notes.editLabel' }));
    fireEvent.change(screen.getByDisplayValue('Original'), { target: { value: 'Verworfen' } });
    fireEvent.click(screen.getByRole('button', { name: /common.cancel/ }));
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Verworfen')).not.toBeInTheDocument();
  });

  it('deletes only after confirmation', async () => {
    const result = vi.fn(() => ({ data: { deleteNote: true } }));
    setup([notesMock([note('n1', 'Weg damit')]), { request: { query: DELETE_NOTE, variables: { id: 'n1' } }, result }]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);

    const del = await screen.findByRole('button', { name: 'notes.deleteLabel' });
    fireEvent.click(del);
    expect(result).not.toHaveBeenCalled();
    fireEvent.click(del);
    await waitFor(() => expect(result).toHaveBeenCalled());
    expect(confirm).toHaveBeenCalledWith('notes.deleteConfirm');
  });

  describe('filter', () => {
    const notes = () => notesMock([note('n1', 'Erzählung von der Hochzeit'), note('n2', 'Quelle: Kirchenbuch Köln')]);

    it('lists only the matching notes and marks the hits; the box for a new note stays', async () => {
      setup([notes()], 'KOLN');
      expect(await screen.findByText(/Kirchenbuch/)).toBeInTheDocument();
      expect(screen.queryByText(/Erzählung/)).toBeNull();
      expect([...document.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['Köln']);
      expect(screen.getByPlaceholderText('notes.placeholder')).toBeInTheDocument();
    });

    it('says so if nothing matches', async () => {
      setup([notes()], 'xyz');
      expect(await screen.findByText('personDetail.filter.noMatches')).toBeInTheDocument();
      expect(screen.queryByText('notes.empty')).toBeNull();
    });

    it('shows the normal empty state if there are no notes at all', async () => {
      setup([notesMock([])], 'xyz');
      expect(await screen.findByText('notes.empty')).toBeInTheDocument();
    });
  });

  it('shows an error if the notes cannot be loaded', async () => {
    setup([{ request: { query: GET_NOTES, variables: { personId: 'p1' } }, error: new Error('down') }]);
    expect(await screen.findByText('notes.error')).toBeInTheDocument();
  });
});
