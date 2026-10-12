/**
 * Options of the appearance settings (Settings → Appearance) and how they are applied to the page.
 * The choices are stored per device in `stores/appearanceStore.ts`.
 */

export const FONTS = ['inter', 'serif', 'readable', 'system', 'mono'] as const;
export type FontKey = (typeof FONTS)[number];
/** Font of the family tree: the one of the app or an own one */
export type TreeFontKey = 'app' | FontKey;

/**
 * Name of the shipped font (as in its @font-face rule) – needed to embed it in the family tree export.
 * System and monospace fonts are not embedded, the export falls back to a generic font.
 */
export const FONT_FACE_FAMILY: Partial<Record<FontKey, string>> = {
  inter: 'Inter Variable',
  serif: 'Source Serif 4 Variable',
  readable: 'Atkinson Hyperlegible',
};

export const FONT_SIZES = ['small', 'normal', 'large'] as const;
export type FontSize = (typeof FONT_SIZES)[number];

export const ACCENTS = ['green', 'blue', 'purple', 'orange', 'rose'] as const;
export type Accent = (typeof ACCENTS)[number];
/** Colour of the swatch next to the accent choice (the mid tone – text colours are set in index.css) */
export const ACCENT_SWATCH: Record<Accent, string> = {
  green: '#2f7a4a',
  blue: '#1d4fa8',
  purple: '#6b3fa0',
  orange: '#c2540c',
  rose: '#b32444',
};

export const LINE_STYLES = ['step', 'straight', 'curved'] as const;
export type LineStyle = (typeof LINE_STYLES)[number];

export const LINE_WIDTHS = [1, 2, 3, 4] as const;
export type LineWidth = (typeof LINE_WIDTHS)[number];

export const PARTNER_LINES = ['dashed', 'dotted', 'solid'] as const;
export type PartnerLine = (typeof PARTNER_LINES)[number];
/** `stroke-dasharray` of the partner line; undefined = solid */
export const PARTNER_DASH: Record<PartnerLine, string | undefined> = { dashed: '6 4', dotted: '1 5', solid: undefined };

export const LINE_COLORS = ['neutral', 'accent'] as const;
export type LineColor = (typeof LINE_COLORS)[number];

export const CARD_DENSITIES = ['compact', 'normal', 'comfortable'] as const;
export type CardDensity = (typeof CARD_DENSITIES)[number];

export const CARD_CORNERS = ['square', 'rounded', 'round'] as const;
export type CardCorner = (typeof CARD_CORNERS)[number];
export const CARD_RADIUS: Record<CardCorner, string> = { square: '0.25rem', rounded: '0.75rem', round: '1.5rem' };

export const CARD_BORDERS = [1, 2, 3] as const;
export type CardBorder = (typeof CARD_BORDERS)[number];

export const TREE_BACKGROUNDS = ['none', 'dots', 'grid'] as const;
export type TreeBackground = (typeof TREE_BACKGROUNDS)[number];

/** Border colours of the cards; `neutral` is the border colour of the theme */
export const GENDER_COLORS = ['sky', 'blue', 'teal', 'green', 'pink', 'rose', 'purple', 'orange', 'neutral'] as const;
export type GenderColor = (typeof GENDER_COLORS)[number];
export const GENDER_COLOR_VALUE: Record<GenderColor, string> = {
  sky: '#0ea5e9',
  blue: '#3b82f6',
  teal: '#14b8a6',
  green: '#22c55e',
  pink: '#ec4899',
  rose: '#f43f5e',
  purple: '#a855f7',
  orange: '#f97316',
  neutral: 'hsl(var(--border))',
};

export interface Appearance {
  font: FontKey;
  treeFont: TreeFontKey;
  fontSize: FontSize;
  accent: Accent;
  lineStyle: LineStyle;
  lineWidth: LineWidth;
  partnerLine: PartnerLine;
  lineColor: LineColor;
  cardDensity: CardDensity;
  cardCorner: CardCorner;
  cardBorder: CardBorder;
  showPhoto: boolean;
  showDates: boolean;
  showRibbon: boolean;
  maleColor: GenderColor;
  femaleColor: GenderColor;
  unknownColor: GenderColor;
  treeBackground: TreeBackground;
}

export const DEFAULT_APPEARANCE: Appearance = {
  font: 'inter',
  treeFont: 'app',
  fontSize: 'normal',
  accent: 'green',
  lineStyle: 'curved',
  lineWidth: 3,
  partnerLine: 'solid',
  lineColor: 'neutral',
  cardDensity: 'normal',
  cardCorner: 'rounded',
  cardBorder: 2,
  showPhoto: true,
  showDates: true,
  showRibbon: true,
  maleColor: 'sky',
  femaleColor: 'pink',
  unknownColor: 'neutral',
  treeBackground: 'none',
};

/** Settings of the block "Font and colours" and of the block "Family tree: appearance" (for their reset buttons) */
export const APP_KEYS = ['font', 'fontSize', 'accent'] as const satisfies ReadonlyArray<keyof Appearance>;
export const TREE_KEYS = Object.keys(DEFAULT_APPEARANCE).filter((k) => !(APP_KEYS as readonly string[]).includes(k)) as Array<keyof Appearance>;

/** Border colour of a card by gender */
export function genderColor(appearance: Pick<Appearance, 'maleColor' | 'femaleColor' | 'unknownColor'>, gender: string): string {
  const key = gender === 'MALE' ? appearance.maleColor : gender === 'FEMALE' ? appearance.femaleColor : appearance.unknownColor;
  return GENDER_COLOR_VALUE[key];
}

/**
 * Sets the page-wide parts (font, font size, accent colour) as attributes on <html>;
 * index.css turns them into the actual fonts and colours. The default values remove the attribute.
 */
export function applyAppearance(appearance: Appearance, root: HTMLElement = document.documentElement) {
  const set = (name: string, value: string, fallback: string) => {
    if (value === fallback) {
      delete root.dataset[name];
    } else {
      root.dataset[name] = value;
    }
  };
  set('font', appearance.font, DEFAULT_APPEARANCE.font);
  set('treeFont', appearance.treeFont, DEFAULT_APPEARANCE.treeFont);
  set('fontSize', appearance.fontSize, DEFAULT_APPEARANCE.fontSize);
  set('accent', appearance.accent, DEFAULT_APPEARANCE.accent);
}
