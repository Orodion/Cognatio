import { useTranslation } from 'react-i18next';
import { BookMarked } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CitationMarkProps {
  /** Number of citations of the fact; without any nothing is shown */
  count: number;
  /** What the fact is, for screen readers (e.g. "Birth") */
  fact: string;
  /** Opens the sources of the person */
  onClick?: () => void;
  className?: string;
}

/** Small book next to a fact with the number of its citations; a click shows the sources of the person */
export function CitationMark({ count, fact, onClick, className }: CitationMarkProps) {
  const { t } = useTranslation();
  if (!count) {
    return null;
  }
  const label = t('sources.mark.label', { count, fact });
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-0.5 rounded px-1 text-xs font-normal text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      aria-label={label}
      title={label}
    >
      <BookMarked className="h-3.5 w-3.5" aria-hidden />
      {count}
    </button>
  );
}
