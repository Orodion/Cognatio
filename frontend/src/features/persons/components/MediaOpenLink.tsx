import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { mediaDownloadUrl, mediaViewUrl, type Media } from '@/features/persons/types/media';

interface MediaOpenLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'download' | 'media'> {
  media: Pick<Media, 'id' | 'fileName' | 'originalFileName' | 'viewable'>;
  children: ReactNode;
}

/**
 * Opens a file: one the browser can show (image, PDF, video, audio, text) in a new window, any other one (ZIP, HTML …)
 * is saved under its original name right away – without an empty window.
 */
export function MediaOpenLink({ media, children, ...props }: MediaOpenLinkProps) {
  if (media.viewable) {
    return (
      <a href={mediaViewUrl(media)} target="_blank" rel="noreferrer" {...props}>
        {children}
      </a>
    );
  }
  return (
    <a href={mediaDownloadUrl(media)} download={media.originalFileName} {...props}>
      {children}
    </a>
  );
}
