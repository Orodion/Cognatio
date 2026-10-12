import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Highlight } from '../Highlight';

describe('Highlight', () => {
  it('marks the hits and keeps the rest of the text', () => {
    const { container } = render(
      <p>
        <Highlight text="Hochzeit in München" query="IN münchen" />
      </p>,
    );
    expect([...container.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['in', 'München']);
    expect(container.querySelector('p')).toHaveTextContent('Hochzeit in München');
  });

  it('shows plain text without a query or hit', () => {
    const { container } = render(
      <p>
        <Highlight text="Geburt" query="" />
        <Highlight text="Taufe" query="xyz" />
        <Highlight text="Tod" />
      </p>,
    );
    expect(container.querySelector('mark')).toBeNull();
    expect(container.querySelector('p')).toHaveTextContent('GeburtTaufeTod');
  });
});
