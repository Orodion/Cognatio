import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** `system` follows the operating system setting (light/dark) */
export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  /** Colour scheme actually displayed */
  resolved: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const darkQuery = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') {
    return theme;
  }
  return darkQuery()?.matches ? 'dark' : 'light';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolved: resolveTheme('system'),
      // Toggle in the header: from the displayed scheme to the other one (fixed afterwards)
      toggleTheme: () => get().setTheme(get().resolved === 'light' ? 'dark' : 'light'),
      setTheme: (theme) => {
        const resolved = resolveTheme(theme);
        document.documentElement.classList.toggle('dark', resolved === 'dark');
        set({ theme, resolved });
      },
    }),
    {
      name: 'cognatio-theme',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => state?.setTheme(state.theme),
    },
  ),
);

// If the operating system switches between light and dark, the app follows as long as "system" is chosen
darkQuery()?.addEventListener?.('change', () => {
  const { theme, setTheme } = useThemeStore.getState();
  if (theme === 'system') {
    setTheme('system');
  }
});
