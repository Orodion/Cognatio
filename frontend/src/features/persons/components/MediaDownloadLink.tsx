import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { mediaDownloadUrl, type Media } from '@/features/persons/types/media';
import { cn } from '@/lib/utils';

/**
 * Saves a file under its original name (the link of the thumbnail only opens it). `compact`: a small badge on the
 * corner of a thumbnail, for the life events.
 */
export function MediaDownloadLink({ media, compact = false }: { media: Pick<Media, 'id' | 'originalFileName'>; compact?: boolean }) {
  const { t } = useTranslation();
  const label = `${t('media.downloadButton')}: ${media.originalFileName}`;
  return (
    <a
      href={mediaDownloadUrl(media)}
      download={media.originalFileName}
      className={cn(
        compact
          ? 'absolute bottom-0.5 right-0.5 rounded-sm bg-background/85 p-0.5 text-foreground shadow-sm hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring'
          : buttonVariants({ variant: 'ghost', size: 'sm' }),
      )}
      title={label}
      aria-label={label}
    >
      <Download className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
    </a>
  );
}
