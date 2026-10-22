import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { SEARCH_SOURCES } from '@/features/sources/graphql/sourceQueries';
import { makeSource } from '@/test/citations';
import { SourceSearchHits } from '../SourceSearchHits';

const setup = (sources: unknown[]) =>
  render(
    <MockedProvider mocks={[{ request: { query: SEARCH_SOURCES, variables: { query: 'martin' } }, result: { data: { searchSources: sources } } }]}>
      <MemoryRouter>
        <SourceSearchHits query="martin" />
      </MemoryRouter>
    </MockedProvider>,
  );

describe('SourceSearchHits', () => {
  it('links the sources found with the search', async () => {
    setup([makeSource({ abbreviation: 'KB Martin' })]);
    expect(await screen.findByRole('link', { name: 'KB Martin' })).toHaveAttribute('href', '/sources/s1');
    expect(screen.getByRole('heading', { name: 'sources.search.title' })).toBeInTheDocument();
  });

  it('shows nothing without hits', async () => {
    const { container } = setup([]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(container).toBeEmptyDOMElement();
  });
});
