import { describe, it, expect, afterEach } from 'vitest';
import { DEFAULT_APPEARANCE, GENDER_COLOR_VALUE, applyAppearance, genderColor } from '@/lib/appearance';
import { useAppearanceStore } from '../appearanceStore';

afterEach(() => useAppearanceStore.getState().reset());

describe('appearance store', () => {
  it('starts with the defaults and no attributes on <html>', () => {
    expect(useAppearanceStore.getState()).toMatchObject(DEFAULT_APPEARANCE);
    expect(Object.keys(document.documentElement.dataset)).toEqual([]);
  });

  it('applies font, font size, tree font and accent as attributes and removes them again for the defaults', () => {
    useAppearanceStore.getState().update({ font: 'serif', treeFont: 'mono', fontSize: 'large', accent: 'blue' });
    const { dataset } = document.documentElement;
    expect(dataset).toMatchObject({ font: 'serif', treeFont: 'mono', fontSize: 'large', accent: 'blue' });

    useAppearanceStore.getState().update({ font: 'inter', accent: 'green' });
    expect(dataset.font).toBeUndefined();
    expect(dataset.accent).toBeUndefined();
    expect(dataset.fontSize).toBe('large');
  });

  it('stores only the settings (no functions) in the browser and resets to the defaults', () => {
    useAppearanceStore.getState().update({ lineStyle: 'straight', lineWidth: 1, showPhoto: false });
    const stored = JSON.parse(localStorage.getItem('cognatio-appearance')!).state;
    expect(stored).toMatchObject({ lineStyle: 'straight', lineWidth: 1, showPhoto: false });
    expect(Object.keys(stored).sort()).toEqual(Object.keys(DEFAULT_APPEARANCE).sort());

    useAppearanceStore.getState().reset();
    expect(useAppearanceStore.getState()).toMatchObject(DEFAULT_APPEARANCE);
    expect(document.documentElement.dataset.fontSize).toBeUndefined();
  });
});

describe('appearance helpers', () => {
  it('picks the border colour by gender', () => {
    const colors = { maleColor: 'teal', femaleColor: 'orange', unknownColor: 'neutral' } as const;
    expect(genderColor(colors, 'MALE')).toBe(GENDER_COLOR_VALUE.teal);
    expect(genderColor(colors, 'FEMALE')).toBe(GENDER_COLOR_VALUE.orange);
    expect(genderColor(colors, 'UNKNOWN')).toBe(GENDER_COLOR_VALUE.neutral);
    expect(genderColor(colors, 'anything else')).toBe(GENDER_COLOR_VALUE.neutral);
  });

  it('sets the attributes on the given element', () => {
    const root = document.createElement('div');
    applyAppearance({ ...DEFAULT_APPEARANCE, fontSize: 'small', treeFont: 'readable' }, root);
    expect(root.getAttribute('data-font-size')).toBe('small');
    expect(root.getAttribute('data-tree-font')).toBe('readable');
    expect(root.hasAttribute('data-font')).toBe(false);
  });
});
