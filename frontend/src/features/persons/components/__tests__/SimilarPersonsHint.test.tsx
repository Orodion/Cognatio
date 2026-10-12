import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { SIMILAR_PERSONS } from '@/features/persons/graphql/personQueries';
import { SimilarPersonsHint } from '../SimilarPersonsHint';

const similar = {
  __typename: 'Person',
  id: 'p1',
  title: null,
  firstName: 'Hans',
  middleName: null,
  lastName: 'Mayer',
  birthName: null,
  birthDate: '1950',
  birthPlace: 'Köln',
  deathDate: null,
};

function setup(props: Parameters<typeof SimilarPersonsHint>[0], result = vi.fn(() => ({ data: { similarPersons: [similar] } }))) {
  const mocks: MockedResponse[] = [{ request: { query: SIMILAR_PERSONS }, variableMatcher: () => true, result, maxUsageCount: Infinity }];
  const view = render(
    <MockedProvider mocks={mocks}>
      <MemoryRouter>
        <SimilarPersonsHint {...props} />
      </MemoryRouter>
    </MockedProvider>,
  );
  return { result, ...view };
}

describe('SimilarPersonsHint', () => {
  it('lists possible duplicates with a link that keeps the form open', async () => {
    const { result } = setup({ firstName: ' Hans ', lastName: 'Meier', birthDate: '01.05.1950' });

    const link = await screen.findByRole('link', { name: 'form.similar.open' }, { timeout: 2000 });
    expect(link).toHaveAttribute('href', '/persons/p1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.getByText(/Köln/)).toBeInTheDocument();
    expect(screen.getByText('form.similar.title')).toBeInTheDocument();
    // Inputs are passed trimmed
    expect(result).toHaveBeenCalledWith({ firstName: 'Hans', lastName: 'Meier', birthName: null, birthDate: '01.05.1950' });
  });

  it('does not search without a family name', async () => {
    const { result } = setup({ firstName: 'Hans', lastName: '  ' });
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(result).not.toHaveBeenCalled();
    expect(screen.queryByText('form.similar.title')).not.toBeInTheDocument();
  });

  it('waits until typing pauses and shows nothing without matches', async () => {
    const result = vi.fn(() => ({ data: { similarPersons: [] } }));
    const mocks: MockedResponse[] = [{ request: { query: SIMILAR_PERSONS }, variableMatcher: () => true, result, maxUsageCount: Infinity }];
    const view = (lastName: string) => (
      <MockedProvider mocks={mocks}>
        <MemoryRouter>
          <SimilarPersonsHint firstName="Hans" lastName={lastName} />
        </MemoryRouter>
      </MockedProvider>
    );
    const { rerender } = render(view(''));
    // Fast typing: only the last state is queried
    rerender(view('M'));
    rerender(view('Me'));
    rerender(view('Meier'));

    await vi.waitFor(() => expect(result).toHaveBeenCalled(), { timeout: 2000 });
    expect(result).toHaveBeenCalledTimes(1);
    expect(result).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Hans', lastName: 'Meier' }));
    // Der Statusbereich bleibt leer stehen
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
