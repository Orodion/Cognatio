import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { CHECK_PLAUSIBILITY_ISSUE, GET_PLAUSIBILITY_ISSUES } from '@/features/plausibility/graphql/plausibilityQueries';
import { PlausibilityPage } from '../PlausibilityPage';

const person = (id: string, firstName: string) => ({ __typename: 'Person', id, title: null, firstName, middleName: null, lastName: 'Kraft', birthName: null });

const issue = (key: string, code: string, persons: unknown[], checked = false) => ({
  __typename: 'PlausibilityIssue',
  key,
  code,
  relationId: null,
  eventId: null,
  role: null,
  gender: null,
  kinship: null,
  age: null,
  count: null,
  event: null,
  checked,
  persons,
});

const issues = [
  { ...issue('k1', 'ROLE_GENDER', [person('paul', 'Paul'), person('anna', 'Anna')]), role: 'MOTHER', gender: 'MALE' },
  { ...issue('k2', 'LIVING_TOO_OLD', [person('otto', 'Otto')]), age: 125 },
  issue('k3', 'POSSIBLE_DUPLICATE', [person('a', 'Johann'), person('b', 'Johan')], true),
];

function setup(list = issues) {
  const onCheck = vi.fn();
  const mocks: MockedResponse[] = [
    { request: { query: GET_PLAUSIBILITY_ISSUES }, result: { data: { plausibilityIssues: list } }, maxUsageCount: Infinity },
    {
      request: { query: CHECK_PLAUSIBILITY_ISSUE },
      variableMatcher: (vars: unknown) => {
        onCheck(vars);
        return true;
      },
      result: { data: { checkPlausibilityIssue: true } },
    },
  ];
  render(
    <MockedProvider mocks={mocks}>
      <MemoryRouter>
        <PlausibilityPage />
      </MemoryRouter>
    </MockedProvider>,
  );
  return { onCheck };
}

describe('PlausibilityPage', () => {
  it('lists the open issues by group with links to the persons', async () => {
    setup();
    const relations = (await screen.findByText('plausibility.groups.relations')).closest('div')!.parentElement!;
    expect(within(relations).getByText('plausibility.issues.ROLE_GENDER')).toBeInTheDocument();
    expect(within(relations).getByRole('link', { name: 'Paul Kraft' })).toHaveAttribute('href', '/persons/paul');
    expect(screen.getByText('plausibility.groups.dates')).toBeInTheDocument();
    // Marked as right: hidden until asked for
    expect(screen.queryByText('plausibility.issues.POSSIBLE_DUPLICATE')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('plausibility.showChecked'));
    expect(screen.getByText('plausibility.issues.POSSIBLE_DUPLICATE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'plausibility.showAgain' })).toBeInTheDocument();
  });

  it('marks an issue as right', async () => {
    const { onCheck } = setup();
    const [first] = await screen.findAllByRole('button', { name: 'plausibility.markRight' });
    fireEvent.click(first);
    await waitFor(() => expect(onCheck).toHaveBeenCalledWith({ key: 'k1', checked: true }));
  });

  it('says when there is nothing to check', async () => {
    setup([]);
    expect(await screen.findByText('plausibility.none')).toBeInTheDocument();
  });
});
