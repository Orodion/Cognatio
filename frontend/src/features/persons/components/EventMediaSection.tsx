import { useId, useRef, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Check, File as FileIcon, Link2, Loader2, Upload, X } from 'lucide-react';
import { GET_PERSON_MEDIA } from '@/features/persons/graphql/mediaQueries';
import type { Media } from '@/features/persons/types/media';
import type { Person } from '@/features/persons/types/person';
import { formatPersonName, formatShortName } from '@/features/persons/lib/personUtils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { MediaThumbnail } from '@/features/persons/components/MediaThumbnail';
import { PersonPicker } from './PersonPicker';

interface EventMediaSectionProps {
  /** Person of the event – their media are offered first, new files belong to them */
  personId: string;
  /** Already existing, linked media (also of other persons) */
  linked: Media[];
  onLinkedChange: (media: Media[]) => void;
  /** New files that are uploaded and linked when saving */
  pending: File[];
  onPendingChange: (files: File[]) => void;
}

const ownerName = (media: Media) => (media.person ? formatShortName(media.person) : '');

/**
 * Files of an event (map of a move, photo, certificate …): upload new files or link existing ones –
 * first the media of the person, on request those of another person (e.g. a group photo).
 */
export function EventMediaSection({ personId, linked, onLinkedChange, pending, onPendingChange }: EventMediaSectionProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    if (files.length) {
      onPendingChange([...pending, ...files]);
    }
  };

  const toggle = (media: Media) => {
    const isLinked = linked.some((m) => m.id === media.id);
    onLinkedChange(isLinked ? linked.filter((m) => m.id !== media.id) : [...linked, media]);
  };

  const empty = linked.length === 0 && pending.length === 0;

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{t('timeline.media.title')}</legend>

      {empty ? (
        <p className="text-sm text-muted-foreground">{t('timeline.media.none')}</p>
      ) : (
        <ul className="space-y-1">
          {linked.map((media) => {
            const owner = media.personId !== personId ? ownerName(media) : '';
            return (
              <li key={media.id} className="flex items-center gap-2 rounded-md border p-1.5 text-sm">
                <MediaThumbnail media={media} className="h-10 w-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{media.originalFileName}</span>
                  {owner && <span className="block truncate text-xs text-muted-foreground">{t('timeline.media.from', { name: owner })}</span>}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => toggle(media)}
                  aria-label={t('timeline.media.unlink', { name: media.originalFileName })}
                  title={t('timeline.media.unlink', { name: media.originalFileName })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
          {pending.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-md border border-dashed p-1.5 text-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted" aria-hidden>
                <FileIcon className="h-5 w-5 text-muted-foreground" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{file.name}</span>
                <span className="block text-xs text-muted-foreground">{t('timeline.media.uploadOnSave')}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onPendingChange(pending.filter((_, i) => i !== index))}
                aria-label={t('timeline.media.removeFile', { name: file.name })}
                title={t('timeline.media.removeFile', { name: file.name })}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <input type="file" multiple ref={fileInputRef} onChange={handleFiles} className="hidden" data-testid="event-media-input" />
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          {t('timeline.media.upload')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen((open) => !open)} aria-expanded={pickerOpen}>
          <Link2 className="h-4 w-4" />
          {t('timeline.media.pickExisting')}
        </Button>
      </div>

      {pickerOpen && <MediaPicker personId={personId} linkedIds={linked.map((m) => m.id)} onToggle={toggle} />}
    </fieldset>
  );
}

interface MediaPickerProps {
  personId: string;
  linkedIds: string[];
  onToggle: (media: Media) => void;
}

/** Choice of existing media: first those of the person, switchable to those of another person */
function MediaPicker({ personId, linkedIds, onToggle }: MediaPickerProps) {
  const { t } = useTranslation();
  const pickerId = useId();
  const [source, setSource] = useState<'own' | 'other'>('own');
  const [other, setOther] = useState<Person | null>(null);

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('timeline.media.source')}>
        <Button type="button" size="sm" variant={source === 'own' ? 'default' : 'outline'} aria-pressed={source === 'own'} onClick={() => setSource('own')}>
          {t('timeline.media.ownMedia')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={source === 'other' ? 'default' : 'outline'}
          aria-pressed={source === 'other'}
          onClick={() => setSource('other')}
        >
          {t('timeline.media.otherMedia')}
        </Button>
      </div>

      {source === 'own' && <MediaGrid personId={personId} linkedIds={linkedIds} onToggle={onToggle} />}

      {source === 'other' &&
        (other ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t('timeline.media.mediaOf', { name: formatPersonName(other) })}</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOther(null)}>
                {t('timeline.media.changePerson')}
              </Button>
            </div>
            <MediaGrid personId={other.id} linkedIds={linkedIds} onToggle={onToggle} />
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor={pickerId} className="text-sm font-medium">
              {t('timeline.media.choosePerson')}
            </label>
            <PersonPicker id={pickerId} value="" onChange={(_, person) => setOther(person)} excludeIds={[personId]} />
          </div>
        ))}
    </div>
  );
}

function MediaGrid({ personId, linkedIds, onToggle }: MediaPickerProps) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ getPersonMedia: Media[] }>(GET_PERSON_MEDIA, { variables: { personId } });

  if (loading && !data) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-destructive">{t('common.error')}</p>;
  }
  const media = data?.getPersonMedia ?? [];
  if (!media.length) {
    return <p className="text-sm text-muted-foreground">{t('timeline.media.noMedia')}</p>;
  }

  return (
    <ul className="grid max-h-60 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
      {media.map((m) => {
        const selected = linkedIds.includes(m.id);
        return (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onToggle(m)}
              aria-pressed={selected}
              title={m.originalFileName}
              className={cn(
                'relative flex w-full flex-col gap-1 rounded-md border bg-background p-1 text-left text-xs transition-colors hover:bg-accent',
                selected && 'border-primary ring-2 ring-primary',
              )}
            >
              <MediaThumbnail media={m} className="aspect-square w-full" />
              <span className="truncate">{m.originalFileName}</span>
              {selected && (
                <span className="absolute right-1 top-1 rounded-full bg-primary p-0.5 text-primary-foreground" aria-hidden>
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
