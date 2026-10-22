import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { FetchResult } from '@apollo/client';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { CREATE_PERSON, GET_PERSONS, SIMILAR_PERSONS } from '@/features/persons/graphql/personQueries';
import { CREATE_RELATION } from '@/features/persons/graphql/relationQueries';
import { makePerson } from '@/test/fixtures';
import { RelationFormDialog } from '../RelationFormDialog';

// Only an exact date of birth is used as the start of a parent-child relation – "1950" is not
const persons = [
  makePerson({ id: 'self', firstName: 'Ich', birthDate: '1950' }),
  makePerson({ id: 'p2', firstName: 'Berta', birthDate: '04.01.1980' }),
  makePerson({ id: 'p3', firstName: 'Otto', birthDate: '12.03.1920' }),
];

function setup(relationResult: MockedResponse['result'], personResult?: (data: Record<string, unknown>) => FetchResult) {
  const onRelation = vi.fn();
  const onPerson = vi.fn();
  const onSuccess = vi.fn();
  const onClose = vi.fn();
  const mocks: MockedResponse[] = [
    { request: { query: GET_PERSONS, variables: { includeDeleted: false } }, result: { data: { getPersons: persons } }, maxUsageCount: Infinity },
    {
      request: { query: CREATE_RELATION },
      variableMatcher: (vars: { data: unknown }) => {
        onRelation(vars.data);
        return true;
      },
      result: relationResult,
    },
    { request: { query: SIMILAR_PERSONS }, variableMatcher: () => true, result: { data: { similarPersons: [] } }, maxUsageCount: Infinity },
    {
      request: { query: CREATE_PERSON },
      variableMatcher: () => true,
      result: (vars: { data: Record<string, unknown> }) => {
        onPerson(vars.data);
        return personResult?.(vars.data) ?? { data: { createPerson: makePerson({ id: 'neu', firstName: String(vars.data.firstName) }) } };
      },
    },
  ];
  render(
    <MockedProvider mocks={mocks}>
      <RelationFormDialog open onClose={onClose} currentPersonId="self" onSuccess={onSuccess} />
    </MockedProvider>,
  );
  return { onRelation, onPerson, onSuccess, onClose };
}

const save = () => screen.getByRole('button', { name: 'common.save' });

describe('RelationFormDialog', () => {
  it('creates a relation to the chosen person with optional details', async () => {
    const { onRelation, onSuccess, onClose } = setup({ data: { createRelation: { __typename: 'Relation', id: 'r1' } } });
    expect(save()).toBeDisabled();

    // The person itself is not offered
    fireEvent.click(await screen.findByRole('option', { name: /Berta/ }));
    expect(screen.queryByRole('option', { name: /Ich Muster/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/relations.form.type/), { target: { value: 'WIFE' } });
    fireEvent.change(screen.getByLabelText('relations.form.label'), { target: { value: '  ' } });
    fireEvent.change(screen.getByLabelText('relations.form.note'), { target: { value: ' Standesamt ' } });
    fireEvent.change(screen.getByLabelText('relations.form.startDate'), { target: { value: '1975-06-12' } });
    fireEvent.click(save());

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
    expect(onRelation).toHaveBeenCalledWith({
      personAId: 'self',
      personBId: 'p2',
      type: 'WIFE',
      note: 'Standesamt',
      startDate: '1975-06-12',
    });
  });

  it('does not allow an end before the start', async () => {
    setup({ data: { createRelation: { __typename: 'Relation', id: 'r1' } } });
    fireEvent.click(await screen.findByRole('option', { name: /Berta/ }));
    fireEvent.change(screen.getByLabelText('relations.form.startDate'), { target: { value: '2000-01-01' } });
    fireEvent.change(screen.getByLabelText('relations.form.endDate'), { target: { value: '1999-12-31' } });
    expect(screen.getByRole('alert')).toHaveTextContent('relations.form.dateOrderError');
    expect(save()).toBeDisabled();
  });

  it('shows why the server rejected the relation and keeps the dialog open', async () => {
    const { onSuccess, onClose } = setup({ errors: [new GraphQLError('gibt es schon', { extensions: { reason: 'DUPLICATE' } })] });
    fireEvent.click(await screen.findByRole('option', { name: /Berta/ }));
    fireEvent.click(save());
    expect(await screen.findByRole('alert')).toHaveTextContent('apiErrors.DUPLICATE');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('asks before saving a relation that looks wrong and saves it only when confirmed', async () => {
    const implausible = {
      errors: [
        new GraphQLError('looks wrong', {
          extensions: { reason: 'IMPLAUSIBLE', issues: [{ code: 'ROLE_GENDER', personIds: ['p3', 'self'], role: 'MOTHER', gender: 'MALE' }] },
        }),
      ],
    };
    const confirmed = vi.fn();
    const mocks: MockedResponse[] = [
      { request: { query: GET_PERSONS, variables: { includeDeleted: false } }, result: { data: { getPersons: persons } }, maxUsageCount: Infinity },
      { request: { query: CREATE_RELATION }, variableMatcher: (vars: { confirmed: boolean }) => !vars.confirmed, result: implausible, maxUsageCount: 2 },
      {
        request: { query: CREATE_RELATION },
        variableMatcher: (vars: { confirmed: boolean }) => {
          confirmed(vars.confirmed);
          return vars.confirmed;
        },
        result: { data: { createRelation: { __typename: 'Relation', id: 'r1' } } },
      },
    ];
    const onSuccess = vi.fn();
    const ask = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(
      <MockedProvider mocks={mocks}>
        <RelationFormDialog open onClose={vi.fn()} currentPersonId="self" onSuccess={onSuccess} />
      </MockedProvider>,
    );
    fireEvent.click(await screen.findByRole('option', { name: /Otto/ }));
    fireEvent.change(screen.getByLabelText(/relations.form.type/), { target: { value: 'MOTHER' } });

    // Declined: nothing saved, no error shown, the dialog stays open
    fireEvent.click(save());
    await waitFor(() => expect(ask).toHaveBeenCalledTimes(1));
    expect(ask).toHaveBeenLastCalledWith('plausibility.confirmSave');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();

    // Confirmed: saved again with the confirmation
    fireEvent.click(save());
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(confirmed).toHaveBeenCalledWith(true);
    ask.mockRestore();
  });

  it('creates a new person and the relation to it in one go', async () => {
    const { onRelation, onPerson, onSuccess } = setup({ data: { createRelation: { __typename: 'Relation', id: 'r1' } } });
    fireEvent.click(screen.getByRole('button', { name: 'relations.form.newPerson' }));
    expect(screen.getByRole('button', { name: 'relations.form.newPerson' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // The gender follows the relation type as long as it was not chosen by the user
    fireEvent.change(screen.getByLabelText(/relations.form.type/), { target: { value: 'MOTHER' } });
    expect(screen.getByLabelText('personDetail.fields.gender')).toHaveValue('FEMALE');

    const submit = screen.getByRole('button', { name: 'relations.form.createAndSave' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/personDetail.fields.firstName/), { target: { value: ' Clara ' } });
    fireEvent.change(screen.getByLabelText('personDetail.fields.lastName'), { target: { value: 'Muster' } });
    fireEvent.change(screen.getByLabelText('personDetail.fields.birthDate'), { target: { value: 'um 1950' } });
    fireEvent.click(submit);

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onPerson.mock.calls[0][0]).toMatchObject({
      firstName: ' Clara ',
      lastName: 'Muster',
      gender: 'FEMALE',
      birthDate: 'um 1950',
      birthDatePrecision: 'APPROXIMATE',
      deathDate: null,
    });
    expect(onRelation).toHaveBeenCalledWith({ personAId: 'self', personBId: 'neu', type: 'MOTHER' });
  });

  it('creates a new parent whose first name is unknown', async () => {
    const { onRelation, onPerson, onSuccess } = setup({ data: { createRelation: { __typename: 'Relation', id: 'r1' } } });
    fireEvent.click(screen.getByRole('button', { name: 'relations.form.newPerson' }));
    fireEvent.change(screen.getByLabelText(/relations.form.type/), { target: { value: 'FATHER' } });
    const submit = screen.getByRole('button', { name: 'relations.form.createAndSave' });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByLabelText('form.firstNameUnknown'));
    expect(screen.getByLabelText(/personDetail.fields.firstName/)).toBeDisabled();
    expect(submit).toBeEnabled();
    fireEvent.change(screen.getByLabelText('personDetail.fields.lastName'), { target: { value: 'Brakenhof' } });
    fireEvent.click(submit);

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onPerson.mock.calls[0][0]).toMatchObject({ firstName: '(Vorname unbekannt)', lastName: 'Brakenhof', gender: 'MALE' });
    expect(onRelation).toHaveBeenCalledWith({ personAId: 'self', personBId: 'neu', type: 'FATHER' });
  });

  it('checks the new person before saving and keeps the chosen gender', async () => {
    const { onPerson } = setup({ data: { createRelation: { __typename: 'Relation', id: 'r1' } } });
    fireEvent.click(screen.getByRole('button', { name: 'relations.form.newPerson' }));
    fireEvent.change(screen.getByLabelText('personDetail.fields.gender'), { target: { value: 'MALE' } });
    fireEvent.change(screen.getByLabelText(/relations.form.type/), { target: { value: 'MOTHER' } });
    expect(screen.getByLabelText('personDetail.fields.gender')).toHaveValue('MALE');

    fireEvent.change(screen.getByLabelText(/personDetail.fields.firstName/), { target: { value: 'Clara' } });
    fireEvent.change(screen.getByLabelText('personDetail.fields.birthDate'), { target: { value: '31.02.1950' } });
    fireEvent.click(screen.getByRole('button', { name: 'relations.form.createAndSave' }));
    expect(await screen.findByText('form.errors.invalidDate')).toBeInTheDocument();
    expect(onPerson).not.toHaveBeenCalled();
  });

  it('keeps the new person selected when the relation fails, so it is not created twice', async () => {
    const { onPerson, onSuccess } = setup({ errors: [new GraphQLError('gibt es schon', { extensions: { reason: 'DUPLICATE' } })] });
    fireEvent.click(screen.getByRole('button', { name: 'relations.form.newPerson' }));
    fireEvent.change(screen.getByLabelText(/personDetail.fields.firstName/), { target: { value: 'Clara' } });
    fireEvent.click(screen.getByRole('button', { name: 'relations.form.createAndSave' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('apiErrors.DUPLICATE');
    expect(onPerson).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
    // Back at "existing person", the save button does not create a second person
    expect(screen.getByRole('button', { name: 'relations.form.existingPerson' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'common.save' })).toBeEnabled();
  });

  it('shows why the server rejected the new person', async () => {
    const { onRelation } = setup({ data: { createRelation: { __typename: 'Relation', id: 'r1' } } }, () => ({
      errors: [new GraphQLError('kaputt', { extensions: { reason: 'VALIDATION' } })],
    }));
    fireEvent.click(screen.getByRole('button', { name: 'relations.form.newPerson' }));
    fireEvent.change(screen.getByLabelText(/personDetail.fields.firstName/), { target: { value: 'Clara' } });
    fireEvent.click(screen.getByRole('button', { name: 'relations.form.createAndSave' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('apiErrors.VALIDATION');
    expect(onRelation).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'relations.form.newPerson' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('starts a relation to a child with the birth date of the child; the date can be changed', async () => {
    const { onRelation } = setup({ data: { createRelation: { __typename: 'Relation', id: 'r1' } } });
    fireEvent.click(await screen.findByRole('option', { name: /Berta/ }));
    const von = screen.getByLabelText('relations.form.startDate');
    expect(von).toHaveValue('');

    fireEvent.change(screen.getByLabelText(/relations.form.type/), { target: { value: 'CHILD' } });
    expect(von).toHaveValue('1980-01-04');
    expect(von).toHaveAccessibleDescription('relations.form.startFromBirth');

    // Another person chosen: the suggestion follows
    fireEvent.click(screen.getByRole('option', { name: /Otto/ }));
    expect(von).toHaveValue('1920-03-12');

    // Changed by the user: stays, also when the person changes
    fireEvent.change(von, { target: { value: '1921-01-01' } });
    fireEvent.click(screen.getByRole('option', { name: /Berta/ }));
    expect(von).toHaveValue('1921-01-01');
    expect(screen.queryByText('relations.form.startFromBirth')).not.toBeInTheDocument();
    fireEvent.click(save());
    await waitFor(() => expect(onRelation).toHaveBeenCalledWith(expect.objectContaining({ personBId: 'p2', type: 'CHILD', startDate: '1921-01-01' })));
  });

  it('does not suggest a start without an exact birth date of the child', async () => {
    setup({ data: { createRelation: { __typename: 'Relation', id: 'r1' } } });
    // Mother of the current person: the child is the current person, only the year is known
    fireEvent.click(await screen.findByRole('option', { name: /Berta/ }));
    fireEvent.change(screen.getByLabelText(/relations.form.type/), { target: { value: 'MOTHER' } });
    expect(screen.getByLabelText('relations.form.startDate')).toHaveValue('');
  });

  it('takes the birth date of a new child from the short form', async () => {
    const { onRelation } = setup({ data: { createRelation: { __typename: 'Relation', id: 'r1' } } });
    fireEvent.click(screen.getByRole('button', { name: 'relations.form.newPerson' }));
    fireEvent.change(screen.getByLabelText(/relations.form.type/), { target: { value: 'CHILD' } });
    fireEvent.change(screen.getByLabelText(/personDetail.fields.firstName/), { target: { value: 'Lea' } });
    fireEvent.change(screen.getByLabelText('personDetail.fields.birthDate'), { target: { value: '15.08.2010' } });
    expect(screen.getByLabelText('relations.form.startDate')).toHaveValue('2010-08-15');
    fireEvent.click(screen.getByRole('button', { name: 'relations.form.createAndSave' }));
    await waitFor(() => expect(onRelation).toHaveBeenCalledWith(expect.objectContaining({ personBId: 'neu', type: 'CHILD', startDate: '2010-08-15' })));
  });
});
