import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { GET_PERSON_MEDIA, GET_LINKED_MEDIA, DELETE_MEDIA } from '@/features/persons/graphql/mediaQueries';
import { SET_PROFILE_PICTURE } from '@/features/persons/graphql/personQueries';
import { makePerson } from '@/test/fixtures';
import { uploadMedia } from '@/features/persons/lib/uploadMedia';
import { useSettingsStore } from '@/stores/settingsStore';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import { PersonMediaTab } from '../PersonMediaTab';

vi.mock('@/features/persons/lib/uploadMedia', () => ({ uploadMedia: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(uploadMedia).mockReset();
});

const media = (id: string, originalFileName: string, mimeType: string, extra: Record<string, unknown> = {}) => ({
  __typename: 'Media',
  id,
  personId: 'p1',
  fileName: `${id}.bin`,
  originalFileName,
  mimeType,
  sizeBytes: 1024 * 1024,
  type: 'PHOTO',
  createdAt: '1',
  updatedAt: '1',
  person: { __typename: 'Person', id: 'p1', firstName: 'Anna', lastName: 'Muster' },
  events: [],
  ...extra,
});
const linkedEvent = (id: string, title: string, personId = 'p1') => ({ __typename: 'Event', id, title, personId });

const person = makePerson({ id: 'p1', profilePictureId: 'photo' });
const list = [media('photo', 'portrait.jpg', 'image/jpeg'), media('doc', 'urkunde.pdf', 'application/pdf'), media('bild', 'hochzeit.png', 'image/png')];

function setup(extra: MockedResponse[] = [], linked: Array<ReturnType<typeof media>> = [], own = list, filter?: string) {
  const mocks: MockedResponse[] = [
    { request: { query: GET_PERSON_MEDIA, variables: { personId: 'p1' } }, result: { data: { getPersonMedia: own } }, maxUsageCount: Infinity },
    { request: { query: GET_LINKED_MEDIA, variables: { personId: 'p1' } }, result: { data: { getLinkedMedia: linked } }, maxUsageCount: Infinity },
    ...extra,
  ];
  render(
    <MockedProvider mocks={mocks}>
      <PersonMediaTab person={person} filter={filter} />
    </MockedProvider>,
  );
}

const card = (name: string) => screen.getByTitle(name).closest('.relative') as HTMLElement;

describe('PersonMediaTab', () => {
  it('lists images and documents and marks the profile picture', async () => {
    setup();
    expect(await screen.findByRole('img', { name: 'portrait.jpg' })).toBeInTheDocument();
    expect(within(card('portrait.jpg')).getByText('media.profilePicture')).toBeInTheDocument();
    // Documents have no profile picture action
    expect(within(card('urkunde.pdf')).queryByRole('button', { name: 'media.setProfilePicture' })).not.toBeInTheDocument();
    expect(within(card('portrait.jpg')).getByRole('button', { name: 'media.removeProfilePicture' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('sets another image as profile picture', async () => {
    const result = vi.fn(() => ({ data: { setProfilePicture: { ...person, profilePictureId: 'bild' } } }));
    setup([{ request: { query: SET_PROFILE_PICTURE, variables: { personId: 'p1', mediaId: 'bild' } }, result }]);
    await screen.findByTitle('hochzeit.png');
    fireEvent.click(within(card('hochzeit.png')).getByRole('button', { name: 'media.setProfilePicture' }));
    await waitFor(() => expect(result).toHaveBeenCalled());
  });

  it('deletes only after confirmation', async () => {
    const result = vi.fn(() => ({ data: { deleteMedia: true } }));
    setup([{ request: { query: DELETE_MEDIA, variables: { id: 'doc' } }, result }]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await screen.findByTitle('urkunde.pdf');

    const del = within(card('urkunde.pdf')).getByRole('button', { name: 'common.delete' });
    fireEvent.click(del);
    expect(result).not.toHaveBeenCalled();
    fireEvent.click(del);
    await waitFor(() => expect(result).toHaveBeenCalled());
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('uploads images as photos and documents as documents', async () => {
    vi.mocked(uploadMedia).mockResolvedValue({ ok: true });
    setup();
    await screen.findByTitle('urkunde.pdf');
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;

    fireEvent.change(input, { target: { files: [new File(['x'], 'neu.png', { type: 'image/png' })] } });
    await waitFor(() => expect(uploadMedia).toHaveBeenCalledWith(expect.any(File), 'p1', 'PHOTO'));
    fireEvent.change(input, { target: { files: [new File(['x'], 'brief.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(uploadMedia).toHaveBeenLastCalledWith(expect.any(File), 'p1', 'DOCUMENT'));
  });

  it('shows why an upload failed', async () => {
    vi.mocked(uploadMedia).mockResolvedValue({ ok: false, reason: 'FILE_TOO_LARGE' });
    setup();
    await screen.findByTitle('urkunde.pdf');
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File(['x'], 'riesig.png', { type: 'image/png' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('media.fileTooLarge');
  });

  it('shows which events a file is linked with and warns before deleting it', async () => {
    const result = vi.fn(() => ({ data: { deleteMedia: true } }));
    const karte = media('karte', 'karte.pdf', 'application/pdf', { events: [linkedEvent('e1', 'Umzug'), linkedEvent('e2', 'Hochzeit', 'p2')] });
    setup([{ request: { query: DELETE_MEDIA, variables: { id: 'karte' } }, result }], [], [karte]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    await screen.findByTitle('karte.pdf');
    expect(within(card('karte.pdf')).getByText('media.linkedWith')).toBeInTheDocument();
    fireEvent.click(within(card('karte.pdf')).getByRole('button', { name: 'common.delete' }));
    expect(confirm).toHaveBeenCalledWith('media.confirmDeleteLinked');
    expect(result).not.toHaveBeenCalled();
  });

  it('lists media of other persons that are linked with events of this person', async () => {
    const gruppe = media('gruppe', 'groupPhoto.jpg', 'image/jpeg', {
      personId: 'p2',
      person: { __typename: 'Person', id: 'p2', firstName: 'Karl', lastName: 'Muster' },
      events: [linkedEvent('e1', 'Hochzeit'), linkedEvent('e9', 'Taufe', 'p2')],
    });
    setup([], [gruppe]);

    const section = (await screen.findByRole('heading', { name: 'media.linkedTitle' })).closest('section')!;
    expect(within(section).getByRole('link', { name: 'groupPhoto.jpg' })).toHaveAttribute('href', '/uploads/gruppe.bin');
    expect(within(section).getByText('timeline.media.from')).toBeInTheDocument();
    // Only the events of this person, no actions for foreign files – but they can be saved
    expect(within(section).getByTitle('media.linkedWith')).toBeInTheDocument();
    expect(within(section).queryByRole('button')).not.toBeInTheDocument();
    expect(within(section).getByRole('link', { name: 'media.downloadButton: groupPhoto.jpg' })).toHaveAttribute('href', '/api/v1/media/gruppe/download');
  });

  it('offers every file for download under its original name, in the active family tree', async () => {
    useActiveTreeStore.setState({ treeId: 'tree 2' });
    setup();
    await screen.findByTitle('urkunde.pdf');
    const link = within(card('urkunde.pdf')).getByRole('link', { name: 'media.downloadButton: urkunde.pdf' });
    expect(link).toHaveAttribute('href', '/api/v1/media/doc/download?familyTree=tree%202');
    expect(link).toHaveAttribute('download', 'urkunde.pdf');
    useActiveTreeStore.setState({ treeId: null });
  });
});

describe('PersonMediaTab filter', () => {
  const gruppe = media('gruppe', 'groupPhoto.jpg', 'image/jpeg', {
    personId: 'p2',
    person: { __typename: 'Person', id: 'p2', firstName: 'Karl', lastName: 'Muster' },
    events: [linkedEvent('e1', 'Hochzeit')],
  });
  const karte = media('karte', 'karte.pdf', 'application/pdf', { events: [linkedEvent('e2', 'Umzug nach Köln')] });

  it('shows only the files with all words, marks the hits and finds files by their events', async () => {
    setup([], [], [...list, karte], 'PORTRAIT');
    await screen.findByTitle('portrait.jpg');
    expect(screen.queryByTitle('urkunde.pdf')).toBeNull();
    expect(screen.queryByTitle('karte.pdf')).toBeNull();
    expect([...document.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['portrait']);
  });

  it('searches the titles of the linked events', async () => {
    setup([], [], [...list, karte], 'koln');
    await screen.findByTitle('karte.pdf');
    expect(screen.queryByTitle('portrait.jpg')).toBeNull();
  });

  it('filters the files of other persons, too, also by the owner', async () => {
    setup([], [gruppe], list, 'karl');
    const section = (await screen.findByRole('heading', { name: 'media.linkedTitle' })).closest('section')!;
    expect(within(section).getByTitle('groupPhoto.jpg')).toBeInTheDocument();
    // no own file is left, the section speaks for itself
    expect(screen.queryByTitle('portrait.jpg')).toBeNull();
    expect(screen.queryByText('personDetail.filter.noMatches')).toBeNull();
    expect(screen.queryByText('media.empty')).toBeNull();
  });

  it('hides the section of foreign files without a hit', async () => {
    setup([], [gruppe], list, 'urkunde');
    await screen.findByTitle('urkunde.pdf');
    expect(screen.queryByRole('heading', { name: 'media.linkedTitle' })).toBeNull();
  });

  it('says so if nothing matches, but not for a person without files', async () => {
    setup([], [], list, 'xyz');
    expect(await screen.findByText('personDetail.filter.noMatches')).toBeInTheDocument();
  });

  it('shows the normal empty state if there are no files at all', async () => {
    setup([], [], [], 'xyz');
    expect(await screen.findByText('media.empty')).toBeInTheDocument();
  });
});

describe('PersonMediaTab view switch', () => {
  afterEach(() => useSettingsStore.setState({ mediaView: 'grid' }));

  it('switches between tiles and list, keeps all actions and remembers the choice', async () => {
    setup(
      [],
      [media('fremd', 'gruppe.jpg', 'image/jpeg', { personId: 'p2', person: { __typename: 'Person', id: 'p2', firstName: 'Karl', lastName: 'Muster' } })],
    );
    await screen.findByRole('img', { name: 'portrait.jpg' });
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'media.view.grid' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'media.view.list' }));

    expect(screen.getByRole('button', { name: 'media.view.list' })).toHaveAttribute('aria-pressed', 'true');
    // Own media and linked media of other persons are both shown as lists
    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(2);
    const rows = within(lists[0]).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByTitle('portrait.jpg')).toBeInTheDocument();
    expect(within(rows[0]).getByText('media.profilePicture')).toBeInTheDocument();
    expect(within(rows[0]).getByRole('button', { name: 'media.removeProfilePicture' })).toBeInTheDocument();
    expect(within(rows[1]).queryByRole('button', { name: 'media.setProfilePicture' })).not.toBeInTheDocument();
    expect(within(rows[1]).getByRole('button', { name: 'common.delete' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('link', { name: 'media.downloadButton: urkunde.pdf' })).toBeInTheDocument();
    expect(within(lists[1]).getByTitle('gruppe.jpg')).toBeInTheDocument();
    expect(useSettingsStore.getState().mediaView).toBe('list');

    fireEvent.click(screen.getByRole('button', { name: 'media.view.grid' }));
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('starts in list view if it was chosen before', async () => {
    useSettingsStore.setState({ mediaView: 'list' });
    setup();
    expect(await screen.findAllByRole('listitem')).toHaveLength(3);
  });
});
