import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Camera, Loader2, Pencil, Trash2, GitFork, RotateCcw, X, AlertTriangle } from 'lucide-react';
import type { Person } from '@/features/persons/types/person';
import { SET_PROFILE_PICTURE } from '@/features/persons/graphql/personQueries';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { MourningRibbon } from '@/features/persons/components/MourningRibbon';
import { Button } from '@/components/ui/Button';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { formatPersonName, getInitials, calculateAge, formatLifeDates } from '@/features/persons/lib/personUtils';
import { uploadMedia } from '@/features/persons/lib/uploadMedia';
import { apiErrorMessage } from '@/lib/apiErrors';
import { formatDate } from '@/lib/formatDate';

interface PersonProfileHeaderProps {
  person: Person;
  onDelete: () => void;
  onEdit: () => void;
  onRestore: () => void;
  onHardDelete: () => void;
  /** After the profile picture changed (upload or removal) */
  onProfilePictureChange: () => void;
}

export function PersonProfileHeader({ person, onDelete, onEdit, onRestore, onHardDelete, onProfilePictureChange }: PersonProfileHeaderProps) {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [removePicture, { loading: removing }] = useMutation(SET_PROFILE_PICTURE, {
    refetchQueries: ['GetPersons', 'GetTreeData'],
  });

  const name = formatPersonName(person);
  const age = calculateAge(person.birthDate, person.deathDate);
  const lifeDates = formatLifeDates(person, {
    born: t('persons.born'),
    died: t('persons.died'),
  });

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      setPictureError(t('media.imageRequired'));
      return;
    }
    setPictureError(null);
    setUploading(true);
    const result = await uploadMedia(file, person.id, 'PROFILE_PICTURE');
    setUploading(false);
    if (!result.ok) {
      setPictureError(result.reason === 'FILE_TOO_LARGE' ? t('media.fileTooLarge') : t(`apiErrors.${result.reason}`, { defaultValue: t('media.uploadError') }));
      return;
    }
    onProfilePictureChange();
  };

  const handleRemove = async () => {
    setPictureError(null);
    try {
      await removePicture({ variables: { personId: person.id, mediaId: null } });
      onProfilePictureChange();
    } catch (err) {
      setPictureError(apiErrorMessage(err, t));
    }
  };

  const busy = uploading || removing;

  return (
    <div className="space-y-4">
      {person.isDeleted && (
        <div className="flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center" role="status">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="flex-1 text-sm">
            {person.deletedAt ? t('trash.deletedOn', { date: formatDate(person.deletedAt, i18n.language) }) : t('trash.inTrash')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onRestore}>
              <RotateCcw className="h-4 w-4" />
              {t('trash.restore')}
            </Button>
            <Button variant="destructive" onClick={onHardDelete}>
              <Trash2 className="h-4 w-4" />
              {t('trash.deleteForever')}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="relative shrink-0 self-start">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy || person.isDeleted}
              className="group relative block rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
              title={t('media.uploadProfilePicture')}
              aria-label={t('media.uploadProfilePicture')}
            >
              <Avatar initials={getInitials(person)} imageUrl={person.profilePictureUrl} size="lg" />
              <MourningRibbon person={person} className="absolute -left-2 -top-2 h-7 w-7" />
              {!person.isDeleted && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
                </span>
              )}
            </button>
            {person.profilePictureUrl && !person.isDeleted && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy}
                className="absolute -right-1 -top-1 rounded-full border bg-card p-1 text-muted-foreground shadow-xs hover:text-destructive focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                title={t('media.removeProfilePicture')}
                aria-label={t('media.removeProfilePicture')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{name}</h1>
            {person.nickname && <p className="text-muted-foreground">&quot;{person.nickname}&quot;</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {lifeDates && <span>{lifeDates}</span>}
              {age !== null && <Badge variant="outline">{person.deathDate ? t('persons.deceased') : t('persons.years', { count: age })}</Badge>}
              {person.occupation && <span>{person.occupation}</span>}
            </div>
            {pictureError && (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {pictureError}
              </p>
            )}
          </div>

          {!person.isDeleted && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                {t('personDetail.edit')}
              </Button>
              <Link to={`/tree?person=${person.id}`} className={buttonVariants({ variant: 'outline' })}>
                <GitFork className="h-4 w-4" />
                {t('personDetail.showTree')}
              </Link>
              <Button variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
                {t('personDetail.delete')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
