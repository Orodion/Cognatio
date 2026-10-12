import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_APPEARANCE, applyAppearance, type Appearance } from '@/lib/appearance';

interface AppearanceState extends Appearance {
  /** Changes one or more settings and applies them to the page */
  update: (changes: Partial<Appearance>) => void;
  /** Back to the defaults – all settings or only the given ones */
  reset: (keys?: ReadonlyArray<keyof Appearance>) => void;
}

/** Only the settings themselves are stored, not the functions */
const pick = (state: Appearance): Appearance =>
  Object.fromEntries(Object.keys(DEFAULT_APPEARANCE).map((key) => [key, state[key as keyof Appearance]])) as unknown as Appearance;

/**
 * Appearance of the app and the family tree (settings of this device, stored in the browser).
 * Font, font size and accent colour act via attributes on <html> (see applyAppearance), the family
 * tree components read their part directly from the store.
 */
export const useAppearanceStore = create<AppearanceState>()(
  persist<AppearanceState, [], [], Appearance>(
    (set, get) => ({
      ...DEFAULT_APPEARANCE,
      update: (changes) => {
        set(changes);
        applyAppearance(pick(get()));
      },
      reset: (keys) => {
        const changes = keys ? (Object.fromEntries(keys.map((key) => [key, DEFAULT_APPEARANCE[key]])) as Partial<Appearance>) : DEFAULT_APPEARANCE;
        set(changes);
        applyAppearance(pick(get()));
      },
    }),
    {
      name: 'cognatio-appearance',
      // Settings added later keep their default for older stored data (persist merges shallowly)
      partialize: pick,
      onRehydrateStorage: () => (state) => state && applyAppearance(pick(state)),
    },
  ),
);
