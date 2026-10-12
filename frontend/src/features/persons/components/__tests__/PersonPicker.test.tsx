import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { GET_PERSONS } from '@/features/persons/graphql/personQueries';
import { makePerson } from '@/test/fixtures';
import { PersonPicker, PICKER_LIMIT } from '../PersonPicker';

const COUNT = PICKER_LIMIT + 10;
// Zora is the last person, beyond the hits shown
const persons = Array.from({ length: COUNT }, (_, i) =>
  makePerson({ id: `p${i}`, firstName: i === COUNT - 1 ? 'Zora' : `Anna${String(i).padStart(3, '0')}`, lastName: 'Muster' }),
);

function setup(onChange = vi.fn()) {
  render(
    <MockedProvider mocks={[{ request: { query: GET_PERSONS, variables: { includeDeleted: false } }, result: { data: { getPersons: persons } } }]}>
      <PersonPicker id="picker" value="" onChange={onChange} />
    </MockedProvider>,
  );
  return onChange;
}

describe('PersonPicker', () => {
  it('shows at most PICKER_LIMIT matches and asks to refine the search', async () => {
    setup();
    expect(await screen.findAllByRole('option')).toHaveLength(PICKER_LIMIT);
    expect(screen.queryByText('Zora Muster')).not.toBeInTheDocument();
    expect(screen.getByText('relations.form.moreResults')).toBeInTheDocument();
  });

  it('finds persons beyond the limit via the search', async () => {
    const onChange = setup();
    await screen.findAllByRole('option');
    fireEvent.change(screen.getByPlaceholderText('relations.form.searchPlaceholder'), { target: { value: 'zora' } });
    const [option] = screen.getAllByRole('option');
    expect(option).toHaveTextContent('Zora Muster');
    expect(screen.queryByText('relations.form.moreResults')).not.toBeInTheDocument();
    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledWith(`p${COUNT - 1}`, expect.objectContaining({ firstName: 'Zora' }));
  });
});
