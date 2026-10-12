import { useTranslation } from 'react-i18next';
import type { Person } from '@/features/persons/types/person';
import { isDeceased } from '@/features/persons/lib/personUtils';
import { useAppearanceStore } from '@/stores/appearanceStore';
import { cn } from '@/lib/utils';

/** The black ribbon itself (also used in the preview of the settings) */
export function RibbonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {/* The thin light outline keeps the black ribbon visible on dark cards */}
      <g fill="#000" fillRule="evenodd" stroke="#fff" strokeWidth="0.8" strokeLinejoin="round">
        <path d="M11 12 5.5 21.5 9 21l1.8 2L14 13z" />
        <path d="M13 12l5.5 9.5L15 21l-1.8 2L10 13z" />
        <path d="M12 13.4C8 11.4 6 9.6 6 7c0-3 2.5-5 6-5s6 2 6 5c0 2.6-2 4.4-6 6.4zM12 11c-2.4-1.2-3.6-2.4-3.6-3.8 0-1.5 1.5-2.6 3.6-2.6s3.6 1.1 3.6 2.6c0 1.4-1.2 2.6-3.6 3.8z" />
      </g>
    </svg>
  );
}

interface MourningRibbonProps {
  person: Pick<Person, 'deathDate' | 'deathPlace'>;
  className?: string;
}

/** Black mourning ribbon for a deceased person (date or place of death known); switched off under Settings → Appearance */
export function MourningRibbon({ person, className }: MourningRibbonProps) {
  const { t } = useTranslation();
  const show = useAppearanceStore((state) => state.showRibbon);
  if (!show || !isDeceased(person)) {
    return null;
  }
  return (
    <span
      role="img"
      aria-label={t('persons.deceased')}
      title={t('persons.deceased')}
      data-testid="mourning-ribbon"
      className={cn('inline-flex shrink-0', className)}
    >
      <RibbonIcon className="h-full w-full" />
    </span>
  );
}
