import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { GraphQLError } from 'graphql';
import { SET_PROFILE_PICTURE } from '@/features/persons/graphql/personQueries';
import { uploadMedia } from '@/features/persons/lib/uploadMedia';
import { makePerson, makeTree, treesMock } from '@/test/fixtures';
import { SET_HOME_PERSON } from '@/features/family-trees/graphql/familyTreeQueries';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import type { Person } from '@/features/persons/types/person';
import { PersonProfileHeader } from '../PersonProfileHeader';
import { factCitation, personCitationsMock } from '@/test/citations';
import { PersonOverviewTab } from '../PersonOverviewTab';

vi.mock('@/features/persons/lib/uploadMedia', () => ({ uploadMedia: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(uploadMedia).mockReset();
});

function setup(person: Person, mocks: MockedResponse[] = []) {
  const handlers = {
    onDelete: vi.fn(),
    onEdit: vi.fn(),
    onRestore: vi.fn(),
    onHardDelete: vi.fn(),
    onProfilePictureChange: vi.fn(),
  };
  render(
    <MockedProvider mocks={mocks}>
      <MemoryRouter>
        <PersonProfileHeader person={person} {...handlers} />
      </MemoryRouter>
    </MockedProvider>,
  );
  return handlers;
}

const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!;
const choose = (file: File) => fireEvent.change(fileInput(), { target: { files: [file] } });

describe('PersonProfileHeader', () => {
  it('makes the person the home person of the family tree, or no longer', async () => {
    useActiveTreeStore.setState({ treeId: 't1' });
    const setHome = vi.fn(() => ({ data: { setHomePerson: makeTree({ homePerson: null }) } }));
    setup(makePerson({ id: 'p1' }), [
      treesMock([
        makeTree({
          homePerson: { __typename: 'Person', id: 'p1', title: null, firstName: 'Anna', middleName: null, lastName: 'Muster', birthName: null } as never,
        }),
      ]),
      { request: { query: SET_HOME_PERSON, variables: { personId: null } }, result: setHome },
    ]);
    const button = await screen.findByRole('button', { name: /personDetail.homePerson/, pressed: true });
    fireEvent.click(button);
    await waitFor(() => expect(setHome).toHaveBeenCalled());
    useActiveTreeStore.setState({ treeId: null });
  });

  it('says why the home person could not be set', async () => {
    useActiveTreeStore.setState({ treeId: 't1' });
    const refused = new GraphQLError('The person is not in this family tree.', { extensions: { code: 'BAD_USER_INPUT', reason: 'PERSON_NOT_FOUND' } });
    setup(makePerson({ id: 'p1' }), [
      treesMock([makeTree()]),
      { request: { query: SET_HOME_PERSON, variables: { personId: 'p1' } }, result: { errors: [refused] } },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: /personDetail.homePerson/, pressed: false }));
    expect(await screen.findByRole('alert')).toHaveTextContent('apiErrors.PERSON_NOT_FOUND');
    useActiveTreeStore.setState({ treeId: null });
  });

  it('shows name, nickname, life dates, age and profession and offers the actions', () => {
    const handlers = setup(makePerson({ id: 'p1', firstName: 'Anna', lastName: 'Muster', nickname: 'Anni', birthDate: '1950', occupation: 'Lehrerin' }));
    expect(screen.getByRole('heading', { name: 'Anna Muster' })).toBeInTheDocument();
    expect(screen.getByText('"Anni"')).toBeInTheDocument();
    expect(screen.getByText('Lehrerin')).toBeInTheDocument();
    expect(screen.getByText('persons.years')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /personDetail.showTree/ })).toHaveAttribute('href', '/tree?person=p1');

    fireEvent.click(screen.getByRole('button', { name: /personDetail.edit/ }));
    fireEvent.click(screen.getByRole('button', { name: /personDetail.delete/ }));
    expect(handlers.onEdit).toHaveBeenCalled();
    expect(handlers.onDelete).toHaveBeenCalled();
  });

  it('offers restore and final deletion for a person in the recycle bin', () => {
    const handlers = setup(makePerson({ id: 'p1', isDeleted: true, deletedAt: '1758000000000' }));
    expect(screen.getByRole('status')).toHaveTextContent('trash.deletedOn');
    expect(screen.queryByRole('button', { name: /personDetail.edit/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'media.uploadProfilePicture' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /trash.restore/ }));
    fireEvent.click(screen.getByRole('button', { name: /trash.deleteForever/ }));
    expect(handlers.onRestore).toHaveBeenCalled();
    expect(handlers.onHardDelete).toHaveBeenCalled();
  });

  it('uploads a new profile picture', async () => {
    vi.mocked(uploadMedia).mockResolvedValue({ ok: true });
    const { onProfilePictureChange } = setup(makePerson({ id: 'p1' }));
    choose(new File(['x'], 'bild.png', { type: 'image/png' }));
    await waitFor(() => expect(onProfilePictureChange).toHaveBeenCalled());
    expect(uploadMedia).toHaveBeenCalledWith(expect.any(File), 'p1', 'PROFILE_PICTURE');
  });

  it('accepts only images and explains failed uploads', async () => {
    setup(makePerson({ id: 'p1' }));
    choose(new File(['x'], 'brief.pdf', { type: 'application/pdf' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('media.imageRequired');
    expect(uploadMedia).not.toHaveBeenCalled();

    vi.mocked(uploadMedia).mockResolvedValue({ ok: false, reason: 'NOT_ENOUGH_SPACE', values: { needed: '6 GB', free: '1 GB' } });
    choose(new File(['x'], 'riesig.png', { type: 'image/png' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('apiErrors.NOT_ENOUGH_SPACE'));
  });

  it('removes the profile picture and reports errors', async () => {
    const person = makePerson({ id: 'p1', profilePictureUrl: '/uploads/a.png', profilePictureId: 'm1' });
    const ok = vi.fn(() => ({ data: { setProfilePicture: { ...person, profilePictureId: null, profilePictureUrl: null } } }));
    const { onProfilePictureChange } = setup(person, [
      { request: { query: SET_PROFILE_PICTURE, variables: { personId: 'p1', mediaId: null } }, result: ok },
      {
        request: { query: SET_PROFILE_PICTURE, variables: { personId: 'p1', mediaId: null } },
        result: { errors: [new GraphQLError('nein', { extensions: { reason: 'PERSON_NOT_FOUND' } })] },
      },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'media.removeProfilePicture' }));
    await waitFor(() => expect(onProfilePictureChange).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'media.removeProfilePicture' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onProfilePictureChange).toHaveBeenCalledTimes(1);
  });
});

describe('PersonOverviewTab', () => {
  it('marks name, birth and death that have citations; a click opens the sources', async () => {
    const onShowSources = vi.fn();
    render(
      <MockedProvider mocks={[personCitationsMock('p1', [factCitation('PERSON', { fact: 'BIRTH' }), factCitation('PERSON', { fact: 'BIRTH' }, 'c2')])]}>
        <PersonOverviewTab person={makePerson({ birthDate: '01.02.1900' })} onShowSources={onShowSources} />
      </MockedProvider>,
    );
    const mark = await screen.findByRole('button', { name: 'sources.mark.label' });
    expect(mark).toHaveTextContent('2');
    // Only the birth has citations
    expect(screen.getAllByRole('button', { name: 'sources.mark.label' })).toHaveLength(1);
    fireEvent.click(mark);
    expect(onShowSources).toHaveBeenCalled();
  });

  it('lists all fields with translated values and placeholders for empty ones', () => {
    render(
      <MockedProvider mocks={[personCitationsMock('p1')]}>
        <PersonOverviewTab
          person={makePerson({
            firstName: 'Anna',
            gender: 'FEMALE',
            maritalStatus: 'MARRIED',
            languages: ['de', 'Plattdeutsch'],
            occupation: null,
          })}
        />
      </MockedProvider>,
    );
    const value = (label: string) => screen.getByText(label).nextElementSibling;
    expect(value('personDetail.fields.firstName')).toHaveTextContent('Anna');
    expect(value('personDetail.fields.gender')).toHaveTextContent('gender.FEMALE');
    expect(value('personDetail.fields.maritalStatus')).toHaveTextContent('maritalStatus.MARRIED');
    expect(value('personDetail.fields.occupation')).toHaveTextContent('—');
    // Known codes as language names, older free texts unchanged
    expect(value('personDetail.fields.languages')).toHaveTextContent(/Plattdeutsch/);
    expect(value('personDetail.fields.languages')).not.toHaveTextContent(/^de,/);
  });
});
