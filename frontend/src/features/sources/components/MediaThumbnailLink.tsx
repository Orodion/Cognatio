import { File as FileIcon, FileText, Film, Music } from 'lucide-react';
import { MediaOpenLink } from '@/features/persons/components/MediaOpenLink';
import { isImage, mediaUrl, type Media } from '@/features/persons/types/media';

/** Symbol of a file that is no image: PDF, video, audio or any other */
const fileIcon = (media: Pick<Media, 'mimeType'>) =>
  media.mimeType === 'application/pdf' ? FileText : media.mimeType.startsWith('video/') ? Film : media.mimeType.startsWith('audio/') ? Music : FileIcon;

/** Preview of a scan that opens the file in a new window – or saves it, if the browser cannot show it */
export function MediaThumbnailLink({ media, size = 'h-16 w-16' }: { media: Media; size?: string }) {
  const Icon = fileIcon(media);
  return (
    <MediaOpenLink
      media={media}
      title={media.originalFileName}
      aria-label={media.originalFileName}
      className="block overflow-hidden rounded border focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className={`flex items-center justify-center bg-muted ${size}`} aria-hidden>
        {isImage(media) ? (
          <img src={mediaUrl(media)} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Icon className="h-1/2 w-1/2 text-muted-foreground" />
        )}
      </span>
    </MediaOpenLink>
  );
}
