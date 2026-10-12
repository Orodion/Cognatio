import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { useAppearanceStore } from '@/stores/appearanceStore';
import { DEFAULT_APPEARANCE } from '@/lib/appearance';
import { FontAndColorsSection, TreeAppearanceSection } from '../AppearanceSections';

const Both = () => (
  <>
    <FontAndColorsSection />
    <TreeAppearanceSection />
  </>
);

afterEach(() => useAppearanceStore.getState().reset());

const choose = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const line = (kind: 'partner' | 'family') => screen.getByTestId('appearance-preview').querySelector(`[data-line="${kind}"]`)!;

describe('Appearance blocks', () => {
  it('shows the current settings and the sample family', () => {
    render(<Both />);
    expect(screen.getByLabelText('settings.appearance.fields.font')).toHaveValue('inter');
    expect(screen.getByLabelText('settings.appearance.fields.lineWidth')).toHaveValue('3');
    expect(screen.getByLabelText('settings.appearance.fields.lineStyle')).toHaveValue('curved');
    expect(screen.getByLabelText('settings.appearance.fields.partnerLine')).toHaveValue('solid');
    expect(screen.getByLabelText('settings.appearance.fields.showPhoto')).toBeChecked();
    const preview = within(screen.getByTestId('appearance-preview'));
    expect(preview.getByText('Hans Muster')).toBeInTheDocument();
    expect(preview.getByText('Karl Muster')).toBeInTheDocument();
  });

  it('stores every choice and converts numbers back', () => {
    render(<Both />);
    choose('settings.appearance.fields.font', 'serif');
    choose('settings.appearance.fields.treeFont', 'mono');
    choose('settings.appearance.fields.fontSize', 'large');
    choose('settings.appearance.fields.lineStyle', 'straight');
    choose('settings.appearance.fields.lineWidth', '2');
    choose('settings.appearance.fields.partnerLine', 'dotted');
    choose('settings.appearance.fields.lineColor', 'accent');
    choose('settings.appearance.fields.density', 'compact');
    choose('settings.appearance.fields.corner', 'square');
    choose('settings.appearance.fields.border', '1');
    choose('settings.appearance.fields.accent', 'purple');
    choose('tree.background.label', 'grid');
    choose('settings.appearance.fields.male', 'teal');
    choose('settings.appearance.fields.female', 'orange');
    choose('settings.appearance.fields.unknown', 'blue');
    fireEvent.click(screen.getByLabelText('settings.appearance.fields.showPhoto'));
    fireEvent.click(screen.getByLabelText('settings.appearance.fields.showDates'));
    fireEvent.click(screen.getByLabelText('settings.appearance.fields.showRibbon'));

    expect(useAppearanceStore.getState()).toMatchObject({
      font: 'serif',
      treeFont: 'mono',
      fontSize: 'large',
      lineStyle: 'straight',
      lineWidth: 2,
      partnerLine: 'dotted',
      lineColor: 'accent',
      cardDensity: 'compact',
      cardCorner: 'square',
      cardBorder: 1,
      accent: 'purple',
      treeBackground: 'grid',
      maleColor: 'teal',
      femaleColor: 'orange',
      unknownColor: 'blue',
      showPhoto: false,
      showDates: false,
      showRibbon: false,
    });
    expect(document.documentElement.dataset.font).toBe('serif');
  });

  it('shows line style, width and partner line in the preview', () => {
    render(<Both />);
    // Defaults: curved, 3 px, solid partner line
    expect(line('family').getAttribute('d')).toMatch(/ C /);
    expect(line('family').getAttribute('stroke-width')).toBe('3');
    expect(line('partner').hasAttribute('stroke-dasharray')).toBe(false);

    choose('settings.appearance.fields.lineStyle', 'straight');
    expect(line('family').getAttribute('d')).toMatch(/ L /);
    choose('settings.appearance.fields.lineStyle', 'step');
    expect(line('family').getAttribute('d')).toMatch(/ V .* H .* V /);
    choose('settings.appearance.fields.lineWidth', '4');
    expect(line('family').getAttribute('stroke-width')).toBe('4');
    choose('settings.appearance.fields.partnerLine', 'dashed');
    expect(line('partner').getAttribute('stroke-dasharray')).toBe('6 4');
  });

  it('hides photo and dates in the preview cards', () => {
    render(<Both />);
    const preview = within(screen.getByTestId('appearance-preview'));
    expect(preview.getByText('1950 – 2020')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('settings.appearance.fields.showDates'));
    expect(preview.queryByText('1950 – 2020')).not.toBeInTheDocument();
  });

  it('shows the mourning ribbon on the deceased sample person and hides it on request', () => {
    render(<Both />);
    const preview = screen.getByTestId('appearance-preview');
    expect(preview.querySelectorAll('svg[viewBox="0 0 24 24"]')).toHaveLength(1);
    fireEvent.click(screen.getByLabelText('settings.appearance.fields.showRibbon'));
    expect(preview.querySelectorAll('svg[viewBox="0 0 24 24"]')).toHaveLength(0);
  });

  it('resets only the settings of its own block', () => {
    render(<Both />);
    choose('settings.appearance.fields.lineWidth', '1');
    choose('settings.appearance.fields.font', 'mono');
    const [fontReset, treeReset] = screen.getAllByRole('button', { name: 'settings.appearance.reset' });

    fireEvent.click(treeReset);
    expect(useAppearanceStore.getState()).toMatchObject({ lineWidth: DEFAULT_APPEARANCE.lineWidth, font: 'mono' });

    fireEvent.click(fontReset);
    expect(useAppearanceStore.getState()).toMatchObject(DEFAULT_APPEARANCE);
    expect(screen.getByLabelText('settings.appearance.fields.font')).toHaveValue('inter');
  });
});
