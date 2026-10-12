import { describe, it, expect } from 'vitest';
import { DEFAULT_TREE_DEPTH, focusIdOf, useSettingsStore } from '../settingsStore';

describe('settingsStore', () => {
  it('opens the family tree with three generations by default', () => {
    expect(DEFAULT_TREE_DEPTH).toBe(3);
    expect(useSettingsStore.getInitialState()).toMatchObject({ treeDepth: 3, treeFocusIds: {} });
  });

  it('stores the focus person per family tree', () => {
    useSettingsStore.getState().setTreeFocusId('t1', 'anna');
    useSettingsStore.getState().setTreeFocusId('t2', 'otto');
    useSettingsStore.getState().setTreeFocusId('t1', null);
    expect(useSettingsStore.getState().treeFocusIds).toEqual({ t1: '', t2: 'otto' });
    // "None" explicitly chosen stays none
    expect(focusIdOf({ t1: '' }, 't1')).toBeNull();
    expect(focusIdOf({}, 't1')).toBeNull();
    expect(focusIdOf({ t2: 'otto' }, 't1')).toBeNull();
  });
});
