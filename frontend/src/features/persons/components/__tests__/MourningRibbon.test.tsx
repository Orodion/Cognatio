import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MourningRibbon } from '../MourningRibbon';
import { useAppearanceStore } from '@/stores/appearanceStore';

describe('MourningRibbon', () => {
  afterEach(() => {
    useAppearanceStore.getState().reset();
  });

  it('shows a labelled ribbon for a person with a date of death', () => {
    render(<MourningRibbon person={{ deathDate: '2020-05-01' }} />);
    expect(screen.getByRole('img', { name: 'persons.deceased' })).toBeInTheDocument();
  });

  it('also counts a place of death without a date', () => {
    render(<MourningRibbon person={{ deathPlace: 'Hamburg' }} />);
    expect(screen.getByTestId('mourning-ribbon')).toBeInTheDocument();
  });

  it('shows nothing for living persons (no data or only blanks)', () => {
    const { container } = render(<MourningRibbon person={{ deathDate: ' ', deathPlace: null }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('can be switched off in the settings', () => {
    useAppearanceStore.getState().update({ showRibbon: false });
    const { container } = render(<MourningRibbon person={{ deathDate: '2020' }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
