import { File as FileIcon } from 'lucide-react';
import { isImage, mediaUrl, type Media } from '@/features/persons/types/media';
import { cn } from '@/lib/utils';

interface MediaThumbnailProps {
  media: Pick<Media, 'fileName' | 'mimeType' | 'originalFileName'>;
  className?: string;
}

/** Square preview: image scaled down, other files as an icon (the caller provides the label) */
export function MediaThumbnail({ media, className }: MediaThumbnailProps) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded bg-muted', className)} aria-hidden>
      {isImage(media) ? (
        <img src={mediaUrl(media)} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <FileIcon className="h-1/2 w-1/2 text-muted-foreground" />
      )}
    </span>
  );
}
