import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PersonNode } from '../PersonNode';
import { NODE_WIDTH } from '../../lib/treeLayout';
import { ReactFlowProvider } from '@xyflow/react';
import type { Person } from '@/features/persons/types/person';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useAppearanceStore } from '@/stores/appearanceStore';

describe('PersonNode Component', () => {
  it('renders person name correctly', () => {
    const mockPerson: Person = {
      id: '123',
      firstName: 'Max',
      lastName: 'Mustermann',
      gender: 'MALE',
      isDeleted: false,
      languages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(
      <MemoryRouter>
        <ReactFlowProvider>
          <PersonNode data={{ person: mockPerson }} />
        </ReactFlowProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
  });

  it('has a fixed width so long names wrap instead of widening the card (the layout relies on it)', () => {
    const person = {
      id: 'p2',
      firstName: 'Johann FriedrichWilhelm',
      lastName: 'Quindt',
      gender: 'MALE',
      isDeleted: false,
      languages: [],
      createdAt: '',
      updatedAt: '',
    };
    const { container } = render(
      <MemoryRouter>
        <ReactFlowProvider>
          <PersonNode data={{ person }} />
        </ReactFlowProvider>
      </MemoryRouter>,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain(`w-[${NODE_WIDTH}px]`);
    expect(card.className).not.toContain('min-w-');
    expect(screen.getByRole('link').className).toContain('wrap-break-word');
  });

  it('offers a focus button that does not open the detail page', () => {
    const person = { id: 'p1', firstName: 'Anna', gender: 'FEMALE', isDeleted: false, languages: [], createdAt: '', updatedAt: '' };
    const onFocus = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <ReactFlowProvider>
          <PersonNode data={{ person, onFocus }} />
        </ReactFlowProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'tree.focus.setFor' }));
    expect(onFocus).toHaveBeenCalledWith('p1');

    // The focus person itself is highlighted and has no button
    rerender(
      <MemoryRouter>
        <ReactFlowProvider>
          <PersonNode data={{ person, onFocus, isFocus: true }} />
        </ReactFlowProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Anna').closest('[data-focus]')).toBeInTheDocument();
  });

  describe('appearance', () => {
    const base = { firstName: 'X', isDeleted: false, languages: [], createdAt: '', updatedAt: '', birthDate: '1950', birthDatePrecision: 'YEAR' };
    const renderCard = (gender = 'UNKNOWN', extra: Record<string, unknown> = {}) =>
      render(
        <MemoryRouter>
          <ReactFlowProvider>
            <PersonNode data={{ person: { ...base, id: gender, gender, ...extra } }} />
          </ReactFlowProvider>
        </MemoryRouter>,
      );
    const card = () => screen.getByTestId('person-card');

    afterEach(() => useAppearanceStore.getState().reset());

    it('colours the border by gender with the chosen colours', () => {
      const border = (gender: string) => {
        const { unmount } = renderCard(gender);
        const colour = card().style.borderColor;
        unmount();
        return colour;
      };
      // Defaults: sky blue, pink, neutral
      expect(border('MALE')).toBe('rgb(14, 165, 233)');
      expect(border('FEMALE')).toBe('rgb(236, 72, 153)');
      expect(border('UNKNOWN')).toContain('--border');

      useAppearanceStore.getState().update({ maleColor: 'teal', femaleColor: 'purple' });
      expect(border('MALE')).toBe('rgb(20, 184, 166)');
      expect(border('FEMALE')).toBe('rgb(168, 85, 247)');
    });

    it('does not override the highlight of the focus person with the gender colour', () => {
      render(
        <MemoryRouter>
          <ReactFlowProvider>
            <PersonNode data={{ person: { ...base, id: 'f', gender: 'MALE' }, isFocus: true } as never} />
          </ReactFlowProvider>
        </MemoryRouter>,
      );
      expect(card().style.borderColor).toBe('');
      expect(card().className).toContain('border-primary');
    });

    it('applies border width, corners and the tree font', () => {
      useAppearanceStore.getState().update({ cardBorder: 3, cardCorner: 'round' });
      renderCard();
      expect(card().style.borderWidth).toBe('3px');
      expect(card().style.borderRadius).toBe('1.5rem');
      expect(card().style.fontFamily).toBe('var(--font-tree)');
    });

    it('hides the photo and the life dates on request', () => {
      const { unmount } = renderCard();
      expect(screen.getByText(/1950/)).toBeInTheDocument();
      expect(card().querySelector('svg.lucide-user')).not.toBeNull();
      unmount();

      useAppearanceStore.getState().update({ showPhoto: false, showDates: false });
      renderCard();
      expect(screen.queryByText(/1950/)).not.toBeInTheDocument();
      expect(card().querySelector('svg.lucide-user')).toBeNull();
      expect(screen.getByText('X')).toBeInTheDocument();
    });

    it('marks deceased persons with the mourning ribbon unless it is switched off', () => {
      const { unmount } = renderCard();
      expect(screen.queryByTestId('mourning-ribbon')).not.toBeInTheDocument();
      unmount();

      const dead = { ...base, id: 'd', deathDate: '2020' };
      const view = () =>
        render(
          <MemoryRouter>
            <ReactFlowProvider>
              <PersonNode data={{ person: dead } as never} />
            </ReactFlowProvider>
          </MemoryRouter>,
        );
      const first = view();
      expect(screen.getByTestId('mourning-ribbon')).toBeInTheDocument();
      first.unmount();

      useAppearanceStore.getState().update({ showRibbon: false });
      view();
      expect(screen.queryByTestId('mourning-ribbon')).not.toBeInTheDocument();
    });

    it('is more compact or more spacious depending on the chosen size', () => {
      useAppearanceStore.getState().update({ cardDensity: 'compact' });
      const { unmount } = renderCard();
      expect(card().className).toContain('p-2');
      unmount();
      useAppearanceStore.getState().update({ cardDensity: 'comfortable' });
      renderCard();
      expect(card().className).toContain('p-5');
      // The width stays fixed – the layout relies on it
      expect(card().className).toContain('w-[220px]');
    });
  });
});
