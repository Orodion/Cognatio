import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { CREATE_PERSON, GET_PERSONS, UPDATE_PERSON } from '@/features/persons/graphql/personQueries';
import { CREATE_RELATION } from '@/features/persons/graphql/relationQueries';
import type { PersonInput } from '@/features/persons/types/person';
import { makePerson } from '@/test/fixtures';
import { uploadMedia } from '@/features/persons/lib/uploadMedia';
import { PersonFormDialog } from '../PersonFormDialog';
import { GENDER_OPTIONS } from '@/features/persons/lib/personForm';

vi.mock('@/features/persons/lib/uploadMedia', async (original) => ({
  ...(await original<typeof import('@/features/persons/lib/uploadMedia')>()),
  uploadMedia: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(uploadMedia).mockReset();
});

const chooseProfilePicture = (file: File) => fireEvent.change(screen.getByTestId('profile-picture-input'), { target: { files: [file] } });

const created = makePerson({ id: 'new', firstName: 'Anna' });
const father = makePerson({ id: 'father', firstName: 'Bert', gender: 'MALE' });

const personsMock: MockedResponse = {
  request: { query: GET_PERSONS, variables: { includeDeleted: false } },
  result: { data: { getPersons: [father] } },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

function setup(extraMocks: MockedResponse[], onCreate = vi.fn()) {
  const createMock: MockedResponse = {
    request: { query: CREATE_PERSON },
    variableMatcher: (vars: { data: PersonInput }) => {
      onCreate(vars.data);
      return true;
    },
    result: { data: { createPerson: created } },
  };
  const onSuccess = vi.fn();
  const onClose = vi.fn();
  render(
    <MockedProvider mocks={[createMock, personsMock, ...extraMocks]}>
      <PersonFormDialog open onClose={onClose} onSuccess={onSuccess} />
    </MockedProvider>,
  );
  return { onCreate, onSuccess, onClose };
}

const type = (id: string, value: string) => fireEvent.change(document.getElementById(id)!, { target: { value } });

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'form.create' }));

describe('PersonFormDialog', () => {
  it('offers exactly the supported genders', () => {
    expect(GENDER_OPTIONS).toEqual(['MALE', 'FEMALE', 'UNKNOWN']);
  });

  it('does not save invalid input and shows the field errors', async () => {
    const { onCreate } = setup([]);
    type('birthDate', '1980');
    type('deathDate', '1970');
    type('email', 'keine-mail');
    submit();

    expect(await screen.findByText('form.errors.checkInput')).toBeInTheDocument();
    expect(screen.getByText('form.errors.required')).toBeInTheDocument();
    expect(screen.getByText('form.errors.deathBeforeBirth')).toBeInTheDocument();
    expect(screen.getByText('form.errors.invalidEmail')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('derives the date precision from the input and sends empty fields as null', async () => {
    const { onCreate, onSuccess, onClose } = setup([]);
    type('firstName', 'Anna');
    type('birthDate', 'um 1900');
    type('deathDate', '03.1975');
    submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: 'new' })));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Anna',
        birthDate: 'um 1900',
        birthDatePrecision: 'APPROXIMATE',
        deathDate: '03.1975',
        deathDatePrecision: 'MONTH',
        lastName: null,
        languages: [],
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('creates pending relations after saving and ignores duplicates created by inference', async () => {
    const onRelation = vi.fn();
    const relationMock: MockedResponse = {
      request: { query: CREATE_RELATION },
      variableMatcher: (vars: { data: unknown }) => {
        onRelation(vars.data);
        return true;
      },
      // The backend has already derived the relation automatically
      result: { errors: [new GraphQLError('Diese Beziehung existiert bereits.', { extensions: { reason: 'DUPLICATE' } })] },
    };
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { onSuccess } = setup([relationMock]);

    type('firstName', 'Anna');
    fireEvent.click(screen.getByRole('button', { name: /relations.form.createNew/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Bert Muster/ }));
    type('pending-relation-type', 'FATHER');
    fireEvent.click(screen.getByRole('button', { name: /relations.form.addToList/ }));
    expect(screen.getByText(/relations.types.FATHER/)).toBeInTheDocument();

    submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onRelation).toHaveBeenCalledWith(expect.objectContaining({ personAId: 'new', personBId: 'father', type: 'FATHER' }));
    expect(alert).not.toHaveBeenCalled();
  });

  it('starts a pending relation to a parent with the birth date of the new person', async () => {
    const onRelation = vi.fn();
    const relationMock: MockedResponse = {
      request: { query: CREATE_RELATION },
      variableMatcher: (vars: { data: unknown }) => {
        onRelation(vars.data);
        return true;
      },
      result: { data: { createRelation: { __typename: 'Relation', id: 'r1' } } },
    };
    const { onSuccess } = setup([relationMock]);
    type('firstName', 'Anna');
    type('birthDate', '13.02.1985');
    fireEvent.click(screen.getByRole('button', { name: /relations.form.createNew/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Bert Muster/ }));
    type('pending-relation-type', 'FATHER');
    expect(document.getElementById('pending-relation-start')).toHaveValue('1985-02-13');
    expect(screen.getByText('relations.form.startFromBirth')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /relations.form.addToList/ }));
    submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onRelation).toHaveBeenCalledWith(expect.objectContaining({ personBId: 'father', type: 'FATHER', startDate: '1985-02-13' }));
  });

  it('uploads a chosen profile picture for the new person after saving', async () => {
    vi.mocked(uploadMedia).mockResolvedValue({ ok: true, id: 'm1' });
    const { onSuccess } = setup([]);
    type('firstName', 'Anna');
    expect(screen.getByText('form.profilePictureHint')).toBeInTheDocument();

    const bild = new File(['x'], 'anna.jpg', { type: 'image/jpeg' });
    chooseProfilePicture(bild);
    expect(screen.getByText('form.profilePictureSelected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /form.changeProfilePicture/ })).toBeInTheDocument();
    submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(uploadMedia).toHaveBeenCalledWith(bild, 'new', 'PROFILE_PICTURE');
  });

  it('accepts only images as profile picture and can discard the selection', async () => {
    const { onSuccess } = setup([]);
    type('firstName', 'Anna');
    chooseProfilePicture(new File(['x'], 'brief.pdf', { type: 'application/pdf' }));
    expect(screen.getByRole('alert')).toHaveTextContent('media.imageRequired');

    chooseProfilePicture(new File(['x'], 'anna.png', { type: 'image/png' }));
    fireEvent.click(screen.getByRole('button', { name: /form.discardProfilePicture/ }));
    expect(screen.getByText('form.profilePictureHint')).toBeInTheDocument();
    submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it('keeps the saved person and reports a failed profile picture upload', async () => {
    vi.mocked(uploadMedia).mockResolvedValue({ ok: false, reason: 'UPLOAD_FAILED' });
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { onSuccess } = setup([]);
    type('firstName', 'Anna');
    chooseProfilePicture(new File(['x'], 'anna.jpg', { type: 'image/jpeg' }));
    submit();

    await waitFor(() => expect(alert).toHaveBeenCalledWith('form.errors.profilePictureFailed'));
    expect(onSuccess).toHaveBeenCalled();
  });

  it('requires a person before adding a pending relation', async () => {
    setup([]);
    fireEvent.click(screen.getByRole('button', { name: /relations.form.createNew/ }));
    fireEvent.click(screen.getByRole('button', { name: /relations.form.addToList/ }));
    expect(await screen.findByText('relations.form.errors.personRequired')).toBeInTheDocument();
  });
  it('fails relations visibly that could not be created', async () => {
    const relationMock: MockedResponse = {
      request: { query: CREATE_RELATION },
      variableMatcher: () => true,
      result: { errors: [new GraphQLError('Kaputt', { extensions: { reason: 'INTERNAL' } })] },
    };
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { onSuccess } = setup([relationMock]);

    type('firstName', 'Anna');
    fireEvent.click(screen.getByRole('button', { name: /relations.form.createNew/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Bert Muster/ }));
    type('pending-relation-type', 'FATHER');
    fireEvent.click(screen.getByRole('button', { name: /relations.form.addToList/ }));
    submit();

    // The person is saved, the relation is reported as failed
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    await waitFor(() => expect(alert).toHaveBeenCalledWith('form.errors.relationsFailed'));
  });

  it('shows the reason if the server rejects the person', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSuccess = vi.fn();
    render(
      <MockedProvider
        mocks={[
          personsMock,
          {
            request: { query: CREATE_PERSON },
            variableMatcher: () => true,
            result: { errors: [new GraphQLError('Ungültig', { extensions: { reason: 'VALIDATION' } })] },
          },
        ]}
      >
        <PersonFormDialog open onClose={vi.fn()} onSuccess={onSuccess} />
      </MockedProvider>,
    );
    type('firstName', 'Anna');
    submit();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('edits an existing person with the form prefilled', async () => {
    const person = makePerson({ id: 'p1', firstName: 'Karl', lastName: 'Klein', birthDate: '1950', occupation: 'Bäcker' });
    const onUpdate = vi.fn();
    const onSuccess = vi.fn();
    render(
      <MockedProvider
        mocks={[
          personsMock,
          {
            request: { query: UPDATE_PERSON },
            variableMatcher: (vars: { id: string; data: PersonInput }) => {
              onUpdate(vars);
              return true;
            },
            result: { data: { updatePerson: { ...person, occupation: null } } },
          },
        ]}
      >
        <PersonFormDialog open onClose={vi.fn()} person={person} onSuccess={onSuccess} />
      </MockedProvider>,
    );

    expect(screen.getByText('form.editTitle')).toBeInTheDocument();
    expect(screen.getByText('form.relationsEditHint')).toBeInTheDocument();
    expect(document.getElementById('lastName')).toHaveValue('Klein');
    // No duplicate hint when editing (the person itself would be the hit)
    expect(screen.queryByText('form.similar.title')).not.toBeInTheDocument();

    // Clear the field via the X
    const occupation = document.getElementById('occupation')!;
    expect(occupation).toHaveValue('Bäcker');
    fireEvent.click(occupation.parentElement!.querySelector('button[aria-label="common.clear"]')!);
    expect(occupation).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onUpdate).toHaveBeenCalledWith({
      id: 'p1',
      data: expect.objectContaining({ firstName: 'Karl', occupation: null, birthDate: '1950', birthDatePrecision: 'YEAR' }),
    });
  });

  it('saves a person whose first name is unknown with the placeholder', async () => {
    const { onCreate, onSuccess } = setup([]);
    type('firstName', 'Irrtum');
    fireEvent.click(screen.getByLabelText('form.firstNameUnknown'));
    expect(document.getElementById('firstName')).toBeDisabled();
    expect(document.getElementById('firstName')).toHaveValue('');
    type('lastName', 'Brakenhof');
    submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ firstName: '(Vorname unbekannt)', lastName: 'Brakenhof' }));
  });

  it('ticks the box for a person saved with an unknown first name and keeps it when saving', async () => {
    const person = makePerson({ id: 'p2', firstName: '(Vorname unbekannt)', lastName: 'Wardenskij' });
    const onUpdate = vi.fn();
    render(
      <MockedProvider
        mocks={[
          personsMock,
          {
            request: { query: UPDATE_PERSON },
            variableMatcher: (vars: { id: string; data: PersonInput }) => {
              onUpdate(vars.data);
              return true;
            },
            result: { data: { updatePerson: person } },
          },
        ]}
      >
        <PersonFormDialog open onClose={vi.fn()} person={person} />
      </MockedProvider>,
    );

    expect(screen.getByLabelText('form.firstNameUnknown')).toBeChecked();
    // The placeholder is not shown as text in the field
    expect(document.getElementById('firstName')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ firstName: '(Vorname unbekannt)' })));
  });
});
