import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { PLACES } from '@/features/persons/graphql/personQueries';
import { PlaceSuggestions, PLACE_LIST_ID } from '../PlaceSuggestions';

describe('PlaceSuggestions', () => {
  it('offers the places of the family tree in their order', async () => {
    const mocks: MockedResponse[] = [{ request: { query: PLACES }, result: { data: { places: ['Berlin', 'Köln', 'Augsburg'] } } }];
    render(
      <MockedProvider mocks={mocks}>
        <>
          <input aria-label="place" list={PLACE_LIST_ID} />
          <PlaceSuggestions />
        </>
      </MockedProvider>,
    );
    const list = await screen.findByTestId('place-suggestions');
    expect(list).toHaveAttribute('id', PLACE_LIST_ID);
    await waitFor(() => expect([...list.querySelectorAll('option')].map((option) => option.value)).toEqual(['Berlin', 'Köln', 'Augsburg']));
    expect(screen.getByLabelText('place')).toHaveAttribute('list', PLACE_LIST_ID);
  });

  it('stays empty while the places are loading or missing', () => {
    render(
      <MockedProvider mocks={[]}>
        <PlaceSuggestions />
      </MockedProvider>,
    );
    expect(screen.getByTestId('place-suggestions').querySelectorAll('option')).toHaveLength(0);
  });
});
