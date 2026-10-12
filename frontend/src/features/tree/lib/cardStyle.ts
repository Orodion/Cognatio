import type { CSSProperties } from 'react';
import { CARD_RADIUS, genderColor, type Appearance, type CardDensity } from '@/lib/appearance';

/** Spacing and sizes of a card per density (the width stays the same – the layout relies on it) */
export const DENSITY: Record<
  CardDensity,
  { padding: string; avatar: 'sm' | 'md' | 'lg'; iconBox: string; icon: string; gap: string; name: string; dates: string }
> = {
  compact: { padding: 'p-2', avatar: 'sm', iconBox: 'h-10 w-10', icon: 'h-5 w-5', gap: 'mb-1.5', name: 'text-sm', dates: 'text-[10px]' },
  normal: { padding: 'p-4', avatar: 'md', iconBox: 'h-16 w-16', icon: 'h-8 w-8', gap: 'mb-3', name: '', dates: 'text-xs' },
  comfortable: { padding: 'p-5', avatar: 'lg', iconBox: 'h-24 w-24', icon: 'h-12 w-12', gap: 'mb-4', name: 'text-lg', dates: 'text-sm' },
};

/** Inline style of a card: border width, corner radius and (unless it is the focus person) the border colour by gender */
export function cardStyle(appearance: Appearance, gender: string, isFocus = false): CSSProperties {
  return {
    borderWidth: appearance.cardBorder,
    borderRadius: CARD_RADIUS[appearance.cardCorner],
    fontFamily: 'var(--font-tree)',
    ...(isFocus ? {} : { borderColor: genderColor(appearance, gender) }),
  };
}
