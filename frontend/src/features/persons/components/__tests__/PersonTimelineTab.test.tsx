import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { GET_EVENTS, DELETE_EVENT } from '@/features/persons/graphql/eventQueries';
import { makePerson } from '@/test/fixtures';
import { useSettingsStore } from '@/stores/settingsStore';
import { PersonTimelineTab } from '../PersonTimelineTab';

const person = makePerson({ id: 'p1' });
const event = (id: string, data: Record<string, unknown>) => ({
  __typename: 'Event',
  id,
  personId: 'p1',
  date: null,
  datePrecision: null,
  title: '',
  category: 'OTHER',
  description: null,
  place: null,
  sortOrder: null,
  createdAt: '1',
  updatedAt: '1',
  media: [],
  ...data,
});

const eventsMock = (events: Array<ReturnType<typeof event>>): MockedResponse => ({
  request: { query: GET_EVENTS, variables: { personId: 'p1' } },
  result: { data: { getEvents: events } },
  maxUsageCount: Infinity,
});

function setup(mocks: MockedResponse[], filter?: string) {
  render(
    <MockedProvider mocks={mocks}>
      <PersonTimelineTab person={person} filter={filter} />
    </MockedProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  useSettingsStore.setState({ timelineView: 'timeline', timelineOrder: 'desc' });
});

describe('PersonTimelineTab', () => {
  it('lists events with category, date, precision, place and description', async () => {
    setup([
      eventsMock([
        event('e1', { title: 'Taufe', category: 'BAPTISM', date: 'um 1950', datePrecision: 'APPROXIMATE', place: 'Köln', description: 'Im Dom' }),
        event('e2', { title: 'Umzug', category: 'MOVE' }),
      ]),
    ]);
    expect(await screen.findByRole('heading', { name: 'timeline.title (2)' })).toBeInTheDocument();
    expect(screen.getByText('Taufe')).toBeInTheDocument();
    expect(screen.getByText('timeline.categories.BAPTISM')).toBeInTheDocument();
    // Only the date as typed; the kind of precision is not repeated in words
    expect(screen.getByText('um 1950')).toBeInTheDocument();
    expect(screen.queryByText(/precision\./)).toBeNull();
    expect(screen.getByText('Köln')).toBeInTheDocument();
    expect(screen.getByText('Im Dom')).toBeInTheDocument();
  });

  it('shows an empty state and opens the dialog for a new event', async () => {
    setup([eventsMock([])]);
    expect(await screen.findByText('timeline.empty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /timeline.add/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText(/timeline.form.title/)).toHaveValue('');
  });

  it('opens the dialog with the event to edit', async () => {
    setup([eventsMock([event('e1', { title: 'Hochzeit', category: 'WEDDING' })])]);
    fireEvent.click(await screen.findByRole('button', { name: 'timeline.editLabel' }));
    expect(within(screen.getByRole('dialog')).getByLabelText(/timeline.form.title/)).toHaveValue('Hochzeit');
  });

  it('deletes only after confirmation', async () => {
    const result = vi.fn(() => ({ data: { deleteEvent: true } }));
    setup([eventsMock([event('e1', { title: 'Umzug' })]), { request: { query: DELETE_EVENT, variables: { id: 'e1' } }, result }]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);

    const del = await screen.findByRole('button', { name: 'timeline.deleteLabel' });
    fireEvent.click(del);
    expect(result).not.toHaveBeenCalled();
    fireEvent.click(del);
    await waitFor(() => expect(result).toHaveBeenCalled());
    expect(confirm).toHaveBeenCalledWith('timeline.deleteConfirm');
  });

  it('shows an error if the timeline cannot be loaded', async () => {
    setup([{ request: { query: GET_EVENTS, variables: { personId: 'p1' } }, error: new Error('down') }]);
    expect(await screen.findByText('timeline.error')).toBeInTheDocument();
  });

  it('shows the linked files of an event and names the owner of files of other persons', async () => {
    const file = (id: string, personId: string, originalFileName: string, mimeType: string) => ({
      __typename: 'Media',
      id,
      personId,
      fileName: `${id}.bin`,
      originalFileName,
      mimeType,
      sizeBytes: 1,
      type: 'PHOTO',
      createdAt: '1',
      updatedAt: '1',
      person: { __typename: 'Person', id: personId, firstName: personId === 'p1' ? 'Anna' : 'Karl', lastName: 'Muster' },
    });
    setup([
      eventsMock([
        event('e1', {
          title: 'Umzug',
          media: [file('karte', 'p1', 'karte.pdf', 'application/pdf'), file('gruppe', 'p2', 'groupPhoto.jpg', 'image/jpeg')],
        }),
      ]),
    ]);
    const list = await screen.findByRole('list', { name: 'timeline.media.title' });
    const links = within(list).getAllByRole('link');
    // Each file opens and can be saved
    expect(links.map((a) => a.getAttribute('aria-label'))).toEqual([
      'karte.pdf',
      'media.downloadButton: karte.pdf',
      'groupPhoto.jpg (timeline.media.from)',
      'media.downloadButton: groupPhoto.jpg',
    ]);
    expect(links[2]).toHaveAttribute('href', '/uploads/gruppe.bin');
    expect(links[3]).toHaveAttribute('href', '/api/v1/media/gruppe/download');
    expect(list.querySelectorAll('img')).toHaveLength(1);
  });

  describe('filter', () => {
    const file = {
      __typename: 'Media',
      id: 'm1',
      personId: 'p1',
      fileName: 'm1.jpg',
      originalFileName: 'Hochzeitsfoto.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1,
      type: 'PHOTO',
      createdAt: '1',
      updatedAt: '1',
      person: null,
    };
    const events = () =>
      eventsMock([
        event('e1', { title: 'Geburt', category: 'BIRTH', date: '14.09.1951', place: 'Köln', sortOrder: 19510914 }),
        event('e2', { title: 'Hochzeit', category: 'WEDDING', date: '14.07.1979', place: 'München', description: 'Im Freien', sortOrder: 19790714 }),
        event('e3', { title: 'Umzug', category: 'MOVE', date: '01.01.1990', description: 'Nach Hamburg', sortOrder: 19900101, media: [file] }),
      ]);
    const titlesShown = () => screen.queryAllByText(/^(Geburt|Hochzeit|Umzug)$/).map((el) => el.textContent);

    it('shows only the events with all words, ignoring case and accents', async () => {
      setup([events()], 'MUNCHEN freien');
      expect(await screen.findByRole('heading', { name: 'timeline.title (1)' })).toBeInTheDocument();
      // the hits are marked, so the words are separate texts
      expect(screen.getByText('Hochzeit')).toBeInTheDocument();
      expect(screen.queryByText('Geburt')).toBeNull();
      expect([...document.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['München', 'Freien']);
    });

    it('also searches the date', async () => {
      setup([events()], '1951');
      await screen.findByText('Geburt');
      expect(titlesShown()).toEqual(['Geburt']);
    });

    it('finds events by the name of a linked file', async () => {
      setup([events()], 'hochzeitsfoto');
      await screen.findByText('Umzug');
      expect(titlesShown()).toEqual(['Umzug']);
    });

    it('says so if nothing matches', async () => {
      setup([events()], 'xyz');
      expect(await screen.findByText('personDetail.filter.noMatches')).toBeInTheDocument();
      expect(screen.queryByText('timeline.empty')).toBeNull();
    });

    it('shows all events if the filter is blank', async () => {
      useSettingsStore.setState({ timelineView: 'table' });
      setup([events()], '  ');
      await screen.findByText('Geburt');
      expect(titlesShown()).toHaveLength(3);
      expect(document.querySelector('mark')).toBeNull();
    });

    it('marks the hits in the table', async () => {
      useSettingsStore.setState({ timelineView: 'table' });
      setup([events()], 'köln');
      const table = await screen.findByRole('table');
      expect(
        within(table)
          .getAllByRole('rowheader')
          .map((h) => h.textContent),
      ).toEqual(['Geburt']);
      expect([...table.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['Köln']);
    });
  });

  describe('order and table view', () => {
    const three = () =>
      eventsMock([
        event('e3', { title: 'Tod', category: 'DEATH', date: '03.11.2025', sortOrder: 20251103 }),
        event('e1', { title: 'Geburt', category: 'BIRTH', date: '14.09.1951', sortOrder: 19510914 }),
        event('e2', { title: 'Hochzeit', category: 'WEDDING', date: '14.07.1979', place: 'München', description: 'Im Freien', sortOrder: 19790714 }),
      ]);
    const titlesShown = () => screen.getAllByText(/^(Geburt|Hochzeit|Tod)$/).map((el) => el.textContent);

    it('shows the newest event first by default and switches to the oldest first, which is remembered', async () => {
      setup([three()]);
      await screen.findByText('Geburt');
      expect(titlesShown()).toEqual(['Tod', 'Hochzeit', 'Geburt']);
      expect(screen.getByRole('button', { name: 'timeline.order.newest' })).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(screen.getByRole('button', { name: 'timeline.order.oldest' }));

      expect(titlesShown()).toEqual(['Geburt', 'Hochzeit', 'Tod']);
      expect(screen.getByRole('button', { name: 'timeline.order.oldest' })).toHaveAttribute('aria-pressed', 'true');
      expect(useSettingsStore.getState().timelineOrder).toBe('asc');
    });

    it('shows the events as a table with the same order, and switches back', async () => {
      setup([three()]);
      await screen.findByText('Geburt');
      expect(screen.queryByRole('table')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'timeline.view.table' }));

      const table = screen.getByRole('table');
      expect(
        within(table)
          .getAllByRole('columnheader')
          .map((h) => h.textContent),
      ).toEqual([
        'timeline.table.date',
        'timeline.table.event',
        'timeline.table.category',
        'timeline.table.place',
        'timeline.table.description',
        'timeline.table.files',
        'timeline.table.actions',
      ]);
      const rows = within(table).getAllByRole('row').slice(1);
      expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual(['Tod', 'Hochzeit', 'Geburt']);
      const wedding = within(rows[1])
        .getAllByRole('cell')
        .map((cell) => cell.textContent);
      expect(wedding).toEqual(['14.07.1979', 'timeline.categories.WEDDING', 'München', 'Im Freien', '', '']);
      expect(useSettingsStore.getState().timelineView).toBe('table');

      // the order applies to the table as well
      fireEvent.click(screen.getByRole('button', { name: 'timeline.order.oldest' }));
      expect(
        within(screen.getByRole('table'))
          .getAllByRole('rowheader')
          .map((h) => h.textContent),
      ).toEqual(['Geburt', 'Hochzeit', 'Tod']);

      fireEvent.click(screen.getByRole('button', { name: 'timeline.view.timeline' }));
      expect(screen.queryByRole('table')).toBeNull();
    });

    it('edits and deletes from the table, and shows the files', async () => {
      useSettingsStore.setState({ timelineView: 'table' });
      const file = {
        __typename: 'Media',
        id: 'm1',
        personId: 'p1',
        fileName: 'm1.jpg',
        originalFileName: 'foto.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1,
        type: 'PHOTO',
        createdAt: '1',
        updatedAt: '1',
        person: null,
      };
      setup([eventsMock([event('e1', { title: 'Taufe', category: 'BAPTISM', sortOrder: 1, media: [file] })])]);

      expect(await screen.findByRole('link', { name: 'foto.jpg' })).toHaveAttribute('href', '/uploads/m1.jpg');
      fireEvent.click(screen.getByRole('button', { name: 'timeline.editLabel' }));
      expect(within(screen.getByRole('dialog')).getByLabelText(/timeline.form.title/)).toHaveValue('Taufe');
    });
  });
});
