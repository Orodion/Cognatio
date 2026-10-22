import { useId } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { GET_REPOSITORIES } from '@/features/sources/graphql/sourceQueries';
import { NEW_REPOSITORY, type SourceDraft } from '@/features/sources/lib/sourceDraft';
import { MAX_LONG_LENGTH, MAX_SHORT_LENGTH, SOURCE_TYPES, type Repository } from '@/features/sources/types/source';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

interface SourceFieldsProps {
  draft: SourceDraft;
  onChange: (draft: SourceDraft) => void;
  /** All fields or only the most important ones (when citing a source from the person page) */
  compact?: boolean;
}

/** The fields of a source; the archive is chosen from the list or created by its name */
export function SourceFields({ draft, onChange, compact = false }: SourceFieldsProps) {
  const { t } = useTranslation();
  const id = useId();
  const { data } = useQuery<{ repositories: Repository[] }>(GET_REPOSITORIES);
  const set = (field: keyof SourceDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    onChange({ ...draft, [field]: e.target.value });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`${id}-type`}>{t('sources.fields.type')}</Label>
          <Select id={`${id}-type`} value={draft.type} onChange={set('type')}>
            {SOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`sources.types.${type}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${id}-title`} required>
            {t('sources.fields.title')}
          </Label>
          <Input
            id={`${id}-title`}
            value={draft.title}
            onChange={set('title')}
            maxLength={MAX_SHORT_LENGTH}
            placeholder={t('sources.fields.titlePlaceholder')}
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${id}-author`}>{t('sources.fields.author')}</Label>
          <Input id={`${id}-author`} value={draft.author} onChange={set('author')} maxLength={MAX_SHORT_LENGTH} />
        </div>
        {!compact && (
          <div className="space-y-2">
            <Label htmlFor={`${id}-abbreviation`}>{t('sources.fields.abbreviation')}</Label>
            <Input id={`${id}-abbreviation`} value={draft.abbreviation} onChange={set('abbreviation')} maxLength={MAX_SHORT_LENGTH} />
          </div>
        )}
      </div>
      {!compact && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-publication`}>{t('sources.fields.publication')}</Label>
          <Input
            id={`${id}-publication`}
            value={draft.publication}
            onChange={set('publication')}
            maxLength={MAX_SHORT_LENGTH}
            placeholder={t('sources.fields.publicationPlaceholder')}
          />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${id}-repository`}>{t('sources.fields.repository')}</Label>
          <Select id={`${id}-repository`} value={draft.repositoryId} onChange={set('repositoryId')}>
            <option value="">{t('sources.fields.noRepository')}</option>
            {(data?.repositories ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
            {data && draft.repositoryId && draft.repositoryId !== NEW_REPOSITORY && !data.repositories.some((r) => r.id === draft.repositoryId) && (
              <option value={draft.repositoryId}>{t('sources.fields.repositoryInTrash')}</option>
            )}
            <option value={NEW_REPOSITORY}>{t('sources.fields.newRepository')}</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-call-number`}>{t('sources.fields.callNumber')}</Label>
          <Input id={`${id}-call-number`} value={draft.callNumber} onChange={set('callNumber')} maxLength={MAX_SHORT_LENGTH} />
        </div>
      </div>
      {draft.repositoryId === NEW_REPOSITORY && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-new-repository`} required>
            {t('sources.fields.newRepositoryName')}
          </Label>
          <Input
            id={`${id}-new-repository`}
            value={draft.newRepositoryName}
            onChange={set('newRepositoryName')}
            maxLength={MAX_SHORT_LENGTH}
            placeholder={t('sources.fields.newRepositoryPlaceholder')}
          />
        </div>
      )}
      {!compact && (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${id}-text`}>{t('sources.fields.text')}</Label>
            <Textarea id={`${id}-text`} value={draft.text} onChange={set('text')} maxLength={MAX_LONG_LENGTH} rows={4} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-note`}>{t('sources.fields.note')}</Label>
            <Textarea id={`${id}-note`} value={draft.note} onChange={set('note')} maxLength={MAX_LONG_LENGTH} rows={2} />
          </div>
        </>
      )}
    </div>
  );
}
