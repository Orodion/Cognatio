import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';
import { RibbonIcon } from '@/features/persons/components/MourningRibbon';
import {
  ACCENTS,
  ACCENT_SWATCH,
  APP_KEYS,
  CARD_BORDERS,
  CARD_CORNERS,
  CARD_DENSITIES,
  FONTS,
  FONT_SIZES,
  GENDER_COLORS,
  GENDER_COLOR_VALUE,
  LINE_COLORS,
  LINE_STYLES,
  LINE_WIDTHS,
  PARTNER_DASH,
  PARTNER_LINES,
  TREE_BACKGROUNDS,
  TREE_KEYS,
  type Appearance,
} from '@/lib/appearance';
import { useAppearanceStore } from '@/stores/appearanceStore';
import { DENSITY, cardStyle } from '@/features/tree/lib/cardStyle';
import { familyPath, partnerLine } from '@/features/tree/lib/treeLayout';

/** Builders for the fields of the appearance settings; every change is stored and applied at once */
function useFields() {
  const { t } = useTranslation();
  const appearance = useAppearanceStore();
  const { update } = appearance;

  /** Select for one setting; numbers are converted back from the option value */
  const field = <K extends keyof Appearance>(
    key: K,
    label: string,
    options: ReadonlyArray<Appearance[K]>,
    text: (value: Appearance[K]) => string,
    swatch?: (value: Appearance[K]) => string,
  ): ReactNode => (
    <div className="space-y-1.5">
      <Label htmlFor={`appearance-${key}`} className="flex items-center gap-2">
        {swatch && <span className="h-3 w-3 rounded-full border" style={{ background: swatch(appearance[key]) }} aria-hidden="true" />}
        {label}
      </Label>
      <Select
        id={`appearance-${key}`}
        value={String(appearance[key])}
        onChange={(e) => update({ [key]: options.find((o) => String(o) === e.target.value) } as Partial<Appearance>)}
      >
        {options.map((o) => (
          <option key={String(o)} value={String(o)}>
            {text(o)}
          </option>
        ))}
      </Select>
    </div>
  );

  const check = (key: 'showPhoto' | 'showDates' | 'showRibbon', label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input
        id={`appearance-${key}`}
        type="checkbox"
        className="h-4 w-4 accent-primary"
        checked={appearance[key]}
        onChange={(e) => update({ [key]: e.target.checked })}
      />
      {label}
    </label>
  );

  /** Group of fields with a small heading */
  const group = (title: string | null, children: ReactNode) => (
    <div role="group" aria-label={title ?? undefined} className={cn('space-y-3', title && 'border-t border-dashed pt-4')}>
      {title && (
        <p className="text-sm font-semibold" aria-hidden="true">
          {title}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );

  const fontName = (f: string) => t(`settings.appearance.fonts.${f}`);
  const colorName = (c: string) => t(c === 'neutral' ? 'settings.appearance.lineColors.neutral' : `settings.appearance.colors.${c}`);
  return { t, appearance, field, check, group, fontName, colorName };
}

/** Reset of one block (only the settings shown there) */
function ResetButton({ keys }: { keys: ReadonlyArray<keyof Appearance> }) {
  const { t } = useTranslation();
  const reset = useAppearanceStore((s) => s.reset);
  return (
    <Button variant="outline" size="sm" onClick={() => reset(keys)}>
      <RotateCcw className="h-4 w-4" />
      {t('settings.appearance.reset')}
    </Button>
  );
}

/** Block "Font and colours": font, font size and accent colour of the whole app */
export function FontAndColorsSection() {
  const { t, field, fontName } = useFields();
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {field('font', t('settings.appearance.fields.font'), FONTS, fontName)}
        {field('fontSize', t('settings.appearance.fields.fontSize'), FONT_SIZES, (v) => t(`settings.appearance.sizes.${v}`))}
        {field(
          'accent',
          t('settings.appearance.fields.accent'),
          ACCENTS,
          (v) => t(`settings.appearance.colors.${v}`),
          (v) => ACCENT_SWATCH[v],
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t('settings.appearance.hint')}</p>
        <ResetButton keys={APP_KEYS} />
      </div>
    </div>
  );
}

/** Block "Family tree: appearance": lines, cards, colours and background with a live preview */
export function TreeAppearanceSection() {
  const { t, appearance, field, check, group, fontName, colorName } = useFields();
  return (
    <div className="space-y-4">
      <AppearancePreview appearance={appearance} label={t('settings.appearance.preview')} />
      {group(
        t('settings.appearance.groups.lines'),
        <>
          {field('lineStyle', t('settings.appearance.fields.lineStyle'), LINE_STYLES, (v) => t(`settings.appearance.lineStyles.${v}`))}
          {field('lineWidth', t('settings.appearance.fields.lineWidth'), LINE_WIDTHS, (v) => t('settings.appearance.px', { value: v }))}
          {field('partnerLine', t('settings.appearance.fields.partnerLine'), PARTNER_LINES, (v) => t(`settings.appearance.partnerLines.${v}`))}
          {field('lineColor', t('settings.appearance.fields.lineColor'), LINE_COLORS, (v) => t(`settings.appearance.lineColors.${v}`))}
        </>,
      )}
      {group(
        t('settings.appearance.groups.cards'),
        <>
          {field('cardDensity', t('settings.appearance.fields.density'), CARD_DENSITIES, (v) => t(`settings.appearance.densities.${v}`))}
          {field('cardCorner', t('settings.appearance.fields.corner'), CARD_CORNERS, (v) => t(`settings.appearance.corners.${v}`))}
          {field('cardBorder', t('settings.appearance.fields.border'), CARD_BORDERS, (v) => t('settings.appearance.px', { value: v }))}
          {field('treeFont', t('settings.appearance.fields.treeFont'), ['app', ...FONTS] as const, fontName)}
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:gap-6">
            {check('showPhoto', t('settings.appearance.fields.showPhoto'))}
            {check('showDates', t('settings.appearance.fields.showDates'))}
            {check('showRibbon', t('settings.appearance.fields.showRibbon'))}
          </div>
        </>,
      )}
      {group(
        t('settings.appearance.groups.colors'),
        <>
          {field('maleColor', t('settings.appearance.fields.male'), GENDER_COLORS, colorName, (v) => GENDER_COLOR_VALUE[v])}
          {field('femaleColor', t('settings.appearance.fields.female'), GENDER_COLORS, colorName, (v) => GENDER_COLOR_VALUE[v])}
          {field('unknownColor', t('settings.appearance.fields.unknown'), GENDER_COLORS, colorName, (v) => GENDER_COLOR_VALUE[v])}
          {field('treeBackground', t('tree.background.label'), TREE_BACKGROUNDS, (v) => t(`tree.background.${v}`))}
        </>,
      )}
      <div className="flex justify-end">
        <ResetButton keys={TREE_KEYS} />
      </div>
    </div>
  );
}

const PREVIEW = { width: 400, height: 250, card: { width: 150, height: 78 } };

/** Small sample family (couple with a child) drawn with the chosen settings */
function AppearancePreview({ appearance, label }: { appearance: Appearance; label: string }) {
  const { width: w, height: h } = PREVIEW.card;
  const boxes = {
    father: { x: 20, y: 12, width: w, height: h },
    mother: { x: 230, y: 12, width: w, height: h },
    child: { x: 125, y: 158, width: w, height: h },
  };
  const { from, to, middle } = partnerLine(boxes.father, boxes.mother);
  const childTop = { x: boxes.child.x + w / 2, y: boxes.child.y };
  const stroke = appearance.lineColor === 'accent' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
  const density = DENSITY[appearance.cardDensity];

  const card = (name: string, dates: string, gender: string, box: (typeof boxes)['father'], deceased = false) => (
    <div
      key={name}
      className="absolute flex flex-col items-center justify-center overflow-hidden border-solid bg-card text-center shadow-xs"
      style={{ left: box.x, top: box.y, width: box.width, height: box.height, ...cardStyle(appearance, gender) }}
    >
      {deceased && appearance.showRibbon && <RibbonIcon className="absolute left-1.5 top-1.5 h-4 w-4" />}
      {appearance.showPhoto && (
        <span
          className={cn('mb-1 rounded-full bg-muted', density.avatar === 'sm' ? 'h-5 w-5' : density.avatar === 'md' ? 'h-7 w-7' : 'h-9 w-9')}
          aria-hidden="true"
        />
      )}
      <span className={cn('font-semibold', density.avatar === 'lg' ? 'text-sm' : 'text-xs')}>{name}</span>
      {appearance.showDates && <span className="text-[10px] text-muted-foreground">{dates}</span>}
    </div>
  );

  return (
    <div className="space-y-2" data-testid="appearance-preview">
      <p className="text-sm font-semibold">{label}</p>
      <div className="overflow-x-auto rounded-lg border bg-background p-2">
        <div className="relative" style={{ width: PREVIEW.width, height: PREVIEW.height }}>
          <svg width={PREVIEW.width} height={PREVIEW.height} className="absolute inset-0" aria-hidden="true">
            <path
              d={`M ${from.x},${from.y} L ${to.x},${to.y}`}
              fill="none"
              stroke={stroke}
              strokeWidth={appearance.lineWidth}
              strokeDasharray={PARTNER_DASH[appearance.partnerLine]}
              strokeLinecap={appearance.partnerLine === 'dotted' ? 'round' : undefined}
              data-line="partner"
            />
            <path
              d={familyPath(appearance.lineStyle, { originX: middle.x, originY: middle.y, busY: childTop.y - 24, targetX: childTop.x, targetY: childTop.y })}
              fill="none"
              stroke={stroke}
              strokeWidth={appearance.lineWidth}
              data-line="family"
            />
          </svg>
          {card('Hans Muster', '1950 – 2020', 'MALE', boxes.father, true)}
          {card('Anna Muster', '1952', 'FEMALE', boxes.mother)}
          {card('Karl Muster', '1980', 'UNKNOWN', boxes.child)}
        </div>
      </div>
    </div>
  );
}
