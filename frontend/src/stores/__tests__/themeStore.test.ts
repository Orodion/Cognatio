import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolveTheme, useThemeStore } from '../themeStore';

/** Simulate the operating system setting for prefers-color-scheme */
function mockSystemDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: dark && query.includes('dark'), media: query, addEventListener: vi.fn() }));
}

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.getState().setTheme('light');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('can set theme', () => {
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState()).toMatchObject({ theme: 'dark', resolved: 'dark' });
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState()).toMatchObject({ theme: 'light', resolved: 'light' });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('can toggle theme', () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('follows the operating system when set to system', () => {
    mockSystemDark(true);
    useThemeStore.getState().setTheme('system');
    expect(useThemeStore.getState()).toMatchObject({ theme: 'system', resolved: 'dark' });
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Toggling starts from the displayed scheme and fixes it afterwards
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState()).toMatchObject({ theme: 'light', resolved: 'light' });

    mockSystemDark(false);
    expect(resolveTheme('system')).toBe('light');
  });
});
