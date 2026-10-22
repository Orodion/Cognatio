import { useRef, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Upload, Trash2, File as FileIcon, Image as ImageIcon, UserCircle, Loader2, LayoutGrid, List } from 'lucide-react';
import { GET_PERSON_MEDIA, GET_LINKED_MEDIA, DELETE_MEDIA } from '@/features/persons/graphql/mediaQueries';
import { SET_PROFILE_PICTURE } from '@/features/persons/graphql/personQueries';
import type { Media } from '@/features/persons/types/media';
import type { Person } from '@/features/persons/types/person';
import { uploadMedia } from '@/features/persons/lib/uploadMedia';
import { apiErrorMessage } from '@/lib/apiErrors';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { MediaThumbnail } from '@/features/persons/components/MediaThumbnail';
import { MediaDownloadLink } from '@/features/persons/components/MediaDownloadLink';
import { MediaOpenLink } from '@/features/persons/components/MediaOpenLink';
import { mediaUrl } from '@/features/persons/types/media';
import { formatShortName } from '@/features/persons/lib/personUtils';
import { useSettingsStore } from '@/stores/settingsStore';
import { Highlight } from '@/components/ui/Highlight';
import { matchesFilter } from '@/lib/textFilter';

interface PersonMediaTabProps {
  person: Person;
  /** Words from the filter field of the page; only matching files are shown */
  filter?: string;
}

// After changes to the profile picture all views with an avatar must reload
const PERSON_QUERIES = ['GetPerson', 'GetPersons', 'GetTreeData', 'GetPersonRelations'];

export function PersonMediaTab({ person, filter = '' }: PersonMediaTabProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const view = useSettingsStore((s) => s.mediaView);
  const setView = useSettingsStore((s) => s.setMediaView);

  const { data, loading, error, refetch } = useQuery<{ getPersonMedia: Media[] }>(GET_PERSON_MEDIA, {
    variables: { personId: person.id },
    fetchPolicy: 'cache-and-network',
  });

  // Media of other persons linked with events of this person (e.g. group photos)
  const { data: linkedData } = useQuery<{ getLinkedMedia: Media[] }>(GET_LINKED_MEDIA, {
    variables: { personId: person.id },
    fetchPolicy: 'cache-and-network',
  });

  // Together with the file its links in the life events are removed
  const [deleteMedia] = useMutation(DELETE_MEDIA, { refetchQueries: [...PERSON_QUERIES, 'GetEvents', 'GetLinkedMedia'] });
  const [setProfilePicture, { loading: settingProfile }] = useMutation(SET_PROFILE_PICTURE, {
    refetchQueries: PERSON_QUERIES,
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setActionError(null);
    setIsUploading(true);
    const result = await uploadMedia(file, person.id, file.type.startsWith('image/') ? 'PHOTO' : 'DOCUMENT');
    setIsUploading(false);

    if (!result.ok) {
      setActionError(t(`apiErrors.${result.reason}`, { ...result.values, defaultValue: t('media.uploadError') }));
      return;
    }
    await refetch();
  };

  const handleDelete = async (media: Media) => {
    const linkedEvents = media.events?.length ?? 0;
    const question = linkedEvents ? t('media.confirmDeleteLinked', { count: linkedEvents }) : t('media.confirmDelete');
    if (!window.confirm(question)) {
      return;
    }
    setActionError(null);
    try {
      await deleteMedia({ variables: { id: media.id } });
      await refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err, t));
    }
  };

  const handleProfilePicture = async (mediaId: string | null) => {
    setActionError(null);
    try {
      await setProfilePicture({ variables: { personId: person.id, mediaId } });
    } catch (err) {
      setActionError(apiErrorMessage(err, t));
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('common.loading')}
      </div>
    );
  }
  if (error) {
    return <div className="py-12 text-center text-destructive">{t('common.error')}</div>;
  }

  const allMedia = data?.getPersonMedia ?? [];
  const mediaList = allMedia.filter((media) => matchesFilter([media.originalFileName, ...(media.events ?? []).map((e) => e.title)], filter));
  const linkedMedia = (linkedData?.getLinkedMedia ?? []).filter((media) =>
    matchesFilter(
      [
        media.originalFileName,
        media.person ? formatShortName(media.person) : null,
        ...(media.events ?? []).filter((e) => e.personId === person.id).map((e) => e.title),
      ],
      filter,
    ),
  );
  const filtering = filter.trim() !== '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t('personDetail.tabs.media')}</h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1" role="group" aria-label={t('media.view.label')}>
            <Button variant={view === 'grid' ? 'default' : 'outline'} size="sm" aria-pressed={view === 'grid'} onClick={() => setView('grid')}>
              <LayoutGrid className="h-4 w-4" />
              {t('media.view.grid')}
            </Button>
            <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" aria-pressed={view === 'list'} onClick={() => setView('list')}>
              <List className="h-4 w-4" />
              {t('media.view.list')}
            </Button>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? t('media.uploading') : t('media.uploadButton')}
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
          {actionError}
        </div>
      )}

      {mediaList.length === 0 ? (
        // With a filter that hits only linked files of others the section below speaks for itself
        filtering && linkedMedia.length > 0 ? null : (
          <div className="rounded-lg border border-dashed bg-muted/30 py-12 text-center">
            <ImageIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {filtering && allMedia.length + (linkedData?.getLinkedMedia.length ?? 0) > 0
                ? t('personDetail.filter.noMatches', { query: filter.trim() })
                : t('media.empty')}
            </p>
          </div>
        )
      ) : (
        <div
          className={view === 'grid' ? 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4' : 'divide-y rounded-lg border'}
          role={view === 'list' ? 'list' : undefined}
        >
          {mediaList.map((media) => {
            const isImage = media.mimeType.startsWith('image/');
            const isProfile = person.profilePictureId === media.id;
            const fileUrl = mediaUrl(media);
            const actions = (
              <>
                <MediaDownloadLink media={media} />
                {isImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={settingProfile}
                    onClick={() => handleProfilePicture(isProfile ? null : media.id)}
                    title={isProfile ? t('media.removeProfilePicture') : t('media.setProfilePicture')}
                    aria-label={isProfile ? t('media.removeProfilePicture') : t('media.setProfilePicture')}
                    aria-pressed={isProfile}
                  >
                    <UserCircle className={isProfile ? 'h-4 w-4 text-primary' : 'h-4 w-4'} />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleDelete(media)} title={t('common.delete')} aria-label={t('common.delete')}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            );
            const details = (
              <>
                <p className="truncate text-xs font-medium" title={media.originalFileName}>
                  <Highlight text={media.originalFileName} query={filter} />
                </p>
                <p className="text-[10px] text-muted-foreground">{(media.sizeBytes / 1024 / 1024).toFixed(2)} MB</p>
                {!!media.events?.length && <LinkedEvents titles={media.events.map((e) => e.title)} />}
              </>
            );

            if (view === 'list') {
              return (
                <div key={media.id} role="listitem" className="flex items-center gap-3 p-2">
                  <MediaOpenLink media={media} className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted">
                    {isImage ? (
                      <img src={fileUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <FileIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                    <span className="sr-only">{media.originalFileName}</span>
                  </MediaOpenLink>
                  <div className="min-w-0 flex-1">{details}</div>
                  {isProfile && <Badge>{t('media.profilePicture')}</Badge>}
                  <div className="flex shrink-0 items-center gap-1">{actions}</div>
                </div>
              );
            }

            return (
              <Card key={media.id} className="relative overflow-hidden">
                <MediaOpenLink media={media} className="flex aspect-square items-center justify-center bg-muted p-2">
                  {isImage ? (
                    <img src={fileUrl} alt={media.originalFileName} className="h-full w-full rounded-sm object-cover" loading="lazy" />
                  ) : (
                    <div className="flex flex-col items-center text-center text-muted-foreground">
                      <FileIcon className="mb-2 h-12 w-12" />
                      <span className="w-full truncate px-2 text-xs">{media.originalFileName}</span>
                    </div>
                  )}
                </MediaOpenLink>
                {isProfile && <Badge className="absolute left-2 top-2">{t('media.profilePicture')}</Badge>}
                <div className="flex items-center gap-1 border-t p-2">
                  <div className="min-w-0 flex-1">{details}</div>
                  {actions}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {linkedMedia.length > 0 && (
        <section className="space-y-3" aria-labelledby="linked-media-title">
          <div>
            <h3 id="linked-media-title" className="font-semibold">
              {t('media.linkedTitle')}
            </h3>
            <p className="text-sm text-muted-foreground">{t('media.linkedHint')}</p>
          </div>
          <div
            className={view === 'grid' ? 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4' : 'divide-y rounded-lg border'}
            role={view === 'list' ? 'list' : undefined}
          >
            {linkedMedia.map((media) => {
              const owner = media.person ? formatShortName(media.person) : '';
              const ownEvents = (media.events ?? []).filter((e) => e.personId === person.id);
              const details = (
                <>
                  <p className="truncate text-xs font-medium" title={media.originalFileName}>
                    <Highlight text={media.originalFileName} query={filter} />
                  </p>
                  {owner && <p className="truncate text-[10px] text-muted-foreground">{t('timeline.media.from', { name: owner })}</p>}
                  {ownEvents.length > 0 && <LinkedEvents titles={ownEvents.map((e) => e.title)} />}
                </>
              );
              if (view === 'list') {
                return (
                  <div key={media.id} role="listitem" className="flex items-center gap-3 p-2">
                    <MediaOpenLink media={media} className="block h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-muted">
                      <MediaThumbnail media={media} className="h-full w-full" />
                      <span className="sr-only">{media.originalFileName}</span>
                    </MediaOpenLink>
                    <div className="min-w-0 flex-1">{details}</div>
                    <MediaDownloadLink media={media} />
                  </div>
                );
              }
              return (
                <Card key={media.id} className="overflow-hidden">
                  <MediaOpenLink media={media} className="block bg-muted p-2">
                    <MediaThumbnail media={media} className="aspect-square w-full" />
                    <span className="sr-only">{media.originalFileName}</span>
                  </MediaOpenLink>
                  <div className="flex items-center gap-1 border-t p-2">
                    <div className="min-w-0 flex-1">{details}</div>
                    <MediaDownloadLink media={media} />
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function LinkedEvents({ titles }: { titles: string[] }) {
  const { t } = useTranslation();
  const text = t('media.linkedWith', { events: titles.join(', ') });
  return (
    <p className="truncate text-[10px] text-muted-foreground" title={text}>
      {text}
    </p>
  );
}
