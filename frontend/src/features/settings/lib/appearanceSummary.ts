import { useTranslation } from 'react-i18next';
import { useAppearanceStore } from '@/stores/appearanceStore';

/** Sentence with the current values of a block while it is closed */
export function useAppearanceSummary(kind: 'app' | 'tree'): string {
  const { t } = useTranslation();
  const a = useAppearanceStore();
  const fontName = (f: string) => t(`settings.appearance.fonts.${f}`);
  if (kind === 'app') {
    return [fontName(a.font), t(`settings.appearance.sizes.${a.fontSize}`), t(`settings.appearance.colors.${a.accent}`)].join(' · ');
  }
  return [
    t(`settings.appearance.lineStyles.${a.lineStyle}`),
    t('settings.appearance.px', { value: a.lineWidth }),
    t(`settings.appearance.densities.${a.cardDensity}`),
    t(`tree.background.${a.treeBackground}`),
  ].join(' · ');
}
