import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Upload, X } from 'lucide-react';
import { MediaThumbnailLink } from '@/features/sources/components/MediaThumbnailLink';
import { uploadScan } from '@/features/sources/lib/uploadScan';
import type { Media } from '@/features/persons/types/media';
import { Button } from '@/components/ui/Button';

interface ScanListProps {
  media: Media[];
  /** Where new scans go */
  target: { sourceId: string } | { citationId: string };
  /** Page of the activity (link in "Activity") */
  link: string;
  /** Removes the link of a scan (the file goes once nothing links it any more) */
  onRemove: (media: Media) => Promise<unknown>;
  /** After an upload */
  onChanged: () => unknown;
  onError: (message: string) => void;
  label: string;
}

/** Scans of a source or citation: thumbnails that open the file, upload of further files, removing one */
export function ScanList({ media, target, link, onRemove, onChanged, onError, label }: ScanListProps) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    if (!files.length) {
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const result = await uploadScan(file, target, link);
        if (!result.ok) {
          onError(t(`apiErrors.${result.reason}`, { defaultValue: t('apiErrors.UPLOAD_FAILED'), ...result.values }));
          break;
        }
      }
    } finally {
      setUploading(false);
      await onChanged();
    }
  };

  return (
    <div className="space-y-2">
      {media.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={label}>
          {media.map((m) => (
            <li key={m.id} className="relative w-16 space-y-1">
              <MediaThumbnailLink media={m} />
              <p className="truncate text-xs text-muted-foreground" aria-hidden title={m.originalFileName}>
                {m.originalFileName}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                onClick={() => {
                  if (window.confirm(t('sources.scans.removeConfirm', { name: m.originalFileName }))) {
                    void onRemove(m);
                  }
                }}
                aria-label={t('sources.scans.remove', { name: m.originalFileName })}
                title={t('sources.scans.remove', { name: m.originalFileName })}
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <input
        type="file"
        multiple
        ref={input}
        onChange={upload}
        className="hidden"
        data-testid={`scan-input-${'sourceId' in target ? target.sourceId : target.citationId}`}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {t('sources.scans.add')}
      </Button>
    </div>
  );
}
