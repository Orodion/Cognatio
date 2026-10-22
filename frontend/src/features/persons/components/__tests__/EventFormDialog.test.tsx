import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { CREATE_EVENT, UPDATE_EVENT } from '@/features/persons/graphql/eventQueries';
import { GET_PERSON_MEDIA } from '@/features/persons/graphql/mediaQueries';
import { GET_PERSONS } from '@/features/persons/graphql/personQueries';
import type { TimelineEvent } from '@/features/persons/types/event';
import { makePerson } from '@/test/fixtures';
import { uploadMedia } from '@/features/persons/lib/uploadMedia';
import { EventFormDialog } from '../EventFormDialog';

vi.mock('@/features/persons/lib/uploadMedia', async (original) => ({
  ...(await original<typeof import('@/features/persons/lib/uploadMedia')>()),
  uploadMedia: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(uploadMedia).mockReset();
});

const owner = (id: string, firstName: string) => ({ __typename: 'Person', id, firstName, lastName: 'Muster' });
const medium = (id: string, personId: string, originalFileName: string, mimeType = 'image/jpeg') => ({
  __typename: 'Media',
  id,
  personId,
  fileName: `${id}.bin`,
  originalFileName,
  mimeType,
  viewable: true,
  sizeBytes: 10,
  type: 'PHOTO',
  createdAt: '1',
  updatedAt: '1',
  person: owner(personId, personId === 'p1' ? 'Anna' : 'Karl'),
  events: [],
});
const mediaMock = (personId: string, list: Array<ReturnType<typeof medium>>): MockedResponse => ({
  request: { query: GET_PERSON_MEDIA, variables: { personId } },
  result: { data: { getPersonMedia: list } },
  maxUsageCount: Infinity,
});

const saved = (data: Record<string, unknown>) => ({
  __typename: 'Event',
  id: 'e1',
  personId: 'p1',
  date: null,
  datePrecision: null,
  description: null,
  place: null,
  sortOrder: null,
  createdAt: '1',
  updatedAt: '1',
  media: [],
  ...data,
});

function setup(event: TimelineEvent | null, mock: MockedResponse, extra: MockedResponse[] = []) {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  render(
    <MockedProvider mocks={[mock, ...extra]}>
      <EventFormDialog open onClose={onClose} currentPersonId="p1" event={event} onSuccess={onSuccess} />
    </MockedProvider>,
  );
  return { onClose, onSuccess };
}

describe('EventFormDialog', () => {
  it('creates an event and derives precision and sort key from the date', async () => {
    const result = vi.fn((vars: { data: Record<string, unknown> }) => ({ data: { createEvent: saved(vars.data) } }));
    const { onClose, onSuccess } = setup(null, { request: { query: CREATE_EVENT }, variableMatcher: () => true, result });

    fireEvent.change(screen.getByLabelText(/timeline.form.title/), { target: { value: ' Taufe ' } });
    fireEvent.change(screen.getByLabelText(/timeline.form.category/), { target: { value: 'BAPTISM' } });
    fireEvent.change(screen.getByLabelText(/timeline.form.date/), { target: { value: 'um 1980' } });
    expect(screen.getByLabelText(/timeline.form.location/)).toHaveAttribute('list', 'place-suggestions');
    fireEvent.change(screen.getByLabelText(/timeline.form.location/), { target: { value: 'Köln' } });
    fireEvent.click(screen.getByRole('button', { name: /common.save/ }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
    expect(result.mock.calls[0][0].data).toMatchObject({
      personId: 'p1',
      title: 'Taufe',
      category: 'BAPTISM',
      date: 'um 1980',
      datePrecision: 'APPROXIMATE',
      sortOrder: 19800101,
      place: 'Köln',
    });
  });

  it('rejects an invalid date without saving', async () => {
    const result = vi.fn();
    setup(null, { request: { query: CREATE_EVENT }, variableMatcher: () => true, result });
    fireEvent.change(screen.getByLabelText(/timeline.form.title/), { target: { value: 'Umzug' } });
    fireEvent.change(screen.getByLabelText(/timeline.form.date/), { target: { value: '31.02.1980' } });
    fireEvent.click(screen.getByRole('button', { name: /common.save/ }));

    expect(await screen.findByText('form.errors.invalidDate')).toBeInTheDocument();
    expect(result).not.toHaveBeenCalled();
  });

  it('edits an existing event; old ISO dates are shown in the input format', async () => {
    const event = saved({ title: 'Hochzeit', category: 'WEDDING', date: '1990-05-01' }) as unknown as TimelineEvent;
    const result = vi.fn((vars: { id: string; data: Record<string, unknown> }) => ({ data: { updateEvent: saved({ ...vars.data, id: vars.id }) } }));
    const { onSuccess } = setup(event, { request: { query: UPDATE_EVENT }, variableMatcher: () => true, result });

    expect(screen.getByLabelText(/timeline.form.title/)).toHaveValue('Hochzeit');
    expect(screen.getByLabelText(/timeline.form.date/)).toHaveValue('01.05.1990');
    fireEvent.click(screen.getByRole('button', { name: /common.save/ }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(result.mock.calls[0][0]).toMatchObject({ id: 'e1', data: { date: '01.05.1990', datePrecision: 'EXACT', sortOrder: 19900501 } });
    // The person of an event cannot be changed, so the update does not send it
    expect(result.mock.calls[0][0].data).not.toHaveProperty('personId');
  });

  it('sends emptied fields as null, so the backend clears them', async () => {
    const event = saved({ title: 'Umzug', category: 'MOVE', date: '1990', place: 'Köln', description: 'Mit der Bahn' }) as unknown as TimelineEvent;
    const result = vi.fn((vars: { id: string; data: Record<string, unknown> }) => ({ data: { updateEvent: saved({ ...vars.data, id: vars.id }) } }));
    const { onSuccess } = setup(event, { request: { query: UPDATE_EVENT }, variableMatcher: () => true, result });

    fireEvent.change(screen.getByLabelText(/timeline.form.date/), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/timeline.form.location/), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/timeline.form.description/), { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: /common.save/ }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(result.mock.calls[0][0].data).toMatchObject({ date: null, datePrecision: null, sortOrder: null, place: null, description: null });
  });

  it('links own media and media of other persons, uploads new files and removes links', async () => {
    const karte = medium('karte', 'p1', 'karte.png');
    const event = saved({ title: 'Umzug', category: 'MOVE', media: [karte] }) as unknown as TimelineEvent;
    const result = vi.fn((vars: { id: string; data: Record<string, unknown> }) => ({ data: { updateEvent: saved({ ...vars.data, id: vars.id }) } }));
    vi.mocked(uploadMedia).mockResolvedValue({ ok: true, id: 'neu' });
    const { onSuccess } = setup(event, { request: { query: UPDATE_EVENT }, variableMatcher: () => true, result }, [
      mediaMock('p1', [karte, medium('photo', 'p1', 'haus.jpg')]),
      mediaMock('p2', [medium('gruppe', 'p2', 'groupPhoto.jpg')]),
      {
        request: { query: GET_PERSONS, variables: { includeDeleted: false } },
        result: { data: { getPersons: [makePerson({ id: 'p1' }), makePerson({ id: 'p2', firstName: 'Karl' })] } },
        maxUsageCount: Infinity,
      },
    ]);

    // The existing link is shown; the person's own media are offered first
    expect(screen.getByText('karte.png')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /timeline.media.pickExisting/ }));
    const own = await screen.findByRole('button', { name: /haus.jpg/ });
    expect(screen.getByRole('button', { name: 'timeline.media.ownMedia' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTitle('karte.png')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(own);

    // Group photo of another person (the person of the event is not offered)
    fireEvent.click(screen.getByRole('button', { name: 'timeline.media.otherMedia' }));
    expect(screen.queryByRole('option', { name: /Anna Muster/ })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('option', { name: /Karl Muster/ }));
    expect(screen.getByText('timeline.media.mediaOf')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /groupPhoto.jpg/ }));
    // In the list of links with the owner
    const linkedItem = screen.getByText('timeline.media.from').closest('li')!;
    expect(within(linkedItem).getByText('groupPhoto.jpg')).toBeInTheDocument();

    // Remove the link and queue a new file
    const karteItem = screen.getByText('karte.png', { selector: 'li span span' }).closest('li')!;
    fireEvent.click(within(karteItem).getByRole('button', { name: 'timeline.media.unlink' }));
    const plan = new File(['x'], 'lageplan.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('event-media-input'), { target: { files: [plan] } });
    expect(screen.getByText('lageplan.pdf')).toBeInTheDocument();
    expect(screen.getByText('timeline.media.uploadOnSave')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /common.save/ }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(result.mock.calls[0][0].data.mediaIds).toEqual(['photo', 'gruppe']);
    expect(uploadMedia).toHaveBeenCalledWith(plan, 'p1', 'DOCUMENT', 'e1');
  });

  it('accepts large files (no limit per file) and can drop a pending file', async () => {
    const result = vi.fn((vars: { data: Record<string, unknown> }) => ({ data: { createEvent: saved(vars.data) } }));
    const { onSuccess } = setup(null, { request: { query: CREATE_EVENT }, variableMatcher: () => true, result });
    fireEvent.change(screen.getByLabelText(/timeline.form.title/), { target: { value: 'Umzug' } });
    expect(screen.getByText('timeline.media.none')).toBeInTheDocument();

    const big = new File(['x'], 'film.mp4', { type: 'video/mp4' });
    Object.defineProperty(big, 'size', { value: 5 * 1024 ** 3 });
    fireEvent.change(screen.getByTestId('event-media-input'), { target: { files: [big] } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('film.mp4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'timeline.media.removeFile' }));
    expect(screen.getByText('timeline.media.none')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /common.save/ }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(result.mock.calls[0][0].data.mediaIds).toEqual([]);
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it('keeps the event and names the files that could not be uploaded', async () => {
    const result = vi.fn((vars: { data: Record<string, unknown> }) => ({ data: { createEvent: saved({ ...vars.data, id: 'e9' }) } }));
    vi.mocked(uploadMedia).mockResolvedValue({ ok: false, reason: 'UPLOAD_FAILED' });
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { onSuccess } = setup(null, { request: { query: CREATE_EVENT }, variableMatcher: () => true, result });
    fireEvent.change(screen.getByLabelText(/timeline.form.title/), { target: { value: 'Umzug' } });
    const photo = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByTestId('event-media-input'), { target: { files: [photo] } });
    fireEvent.click(screen.getByRole('button', { name: /common.save/ }));

    await waitFor(() => expect(alert).toHaveBeenCalledWith('timeline.media.uploadFailed'));
    expect(uploadMedia).toHaveBeenCalledWith(photo, 'p1', 'PHOTO', 'e9');
    expect(onSuccess).toHaveBeenCalled();
  });
});
