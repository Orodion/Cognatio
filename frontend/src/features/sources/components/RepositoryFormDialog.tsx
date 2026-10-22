import { useEffect, useId, useState } from 'react';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { CREATE_REPOSITORY, LIBRARY_CHANGED, UPDATE_REPOSITORY } from '@/features/sources/graphql/sourceQueries';
import { MAX_LONG_LENGTH, MAX_SHORT_LENGTH, type Repository, type RepositoryInput } from '@/features/sources/types/source';
import { apiErrorMessage } from '@/lib/apiErrors';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';

const FIELDS = ['name', 'address', 'url', 'email', 'phone', 'note'] as const;
type Draft = Record<(typeof FIELDS)[number], string>;

const draftOf = (repository?: Repository | null): Draft => Object.fromEntries(FIELDS.map((field) => [field, repository?.[field] ?? ''])) as Draft;

/** Create or edit an archive (registry office, church records office, library, website …) */
export function RepositoryFormDialog({ open, repository, onClose }: { open: boolean; repository?: Repository | null; onClose: () => void }) {
  const { t } = useTranslation();
  const id = useId();
  const [draft, setDraft] = useState<Draft>(draftOf(repository));
  const [error, setError] = useState<string | null>(null);
  const [createRepository, { loading: creating }] = useMutation(CREATE_REPOSITORY, LIBRARY_CHANGED);
  const [updateRepository, { loading: updating }] = useMutation(UPDATE_REPOSITORY, LIBRARY_CHANGED);

  useEffect(() => {
    if (open) {
      setDraft(draftOf(repository));
      setError(null);
    }
  }, [open, repository]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      setError(t('sources.repositories.nameRequired'));
      return;
    }
    const data = Object.fromEntries(FIELDS.map((field) => [field, draft[field].trim() || null])) as unknown as RepositoryInput;
    try {
      if (repository) {
        await updateRepository({ variables: { id: repository.id, data } });
      } else {
        await createRepository({ variables: { data } });
      }
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    }
  };

  const field = (name: (typeof FIELDS)[number], long = false) => (
    <div className="space-y-2">
      <Label htmlFor={`${id}-${name}`} required={name === 'name'}>
        {t(`sources.repositories.fields.${name}`)}
      </Label>
      {long ? (
        <Textarea
          id={`${id}-${name}`}
          value={draft[name]}
          onChange={(e) => setDraft({ ...draft, [name]: e.target.value })}
          maxLength={name === 'note' ? MAX_LONG_LENGTH : MAX_SHORT_LENGTH}
          rows={2}
        />
      ) : (
        <Input
          id={`${id}-${name}`}
          type={name === 'email' ? 'email' : name === 'url' ? 'url' : 'text'}
          value={draft[name]}
          onChange={(e) => setDraft({ ...draft, [name]: e.target.value })}
          maxLength={MAX_SHORT_LENGTH}
        />
      )}
    </div>
  );

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <DialogHeader>
          <DialogTitle>{repository ? t('sources.repositories.editTitle') : t('sources.repositories.createTitle')}</DialogTitle>
        </DialogHeader>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}
        <div className="space-y-4">
          {field('name')}
          {field('address', true)}
          <div className="grid gap-4 sm:grid-cols-2">
            {field('url')}
            {field('email')}
          </div>
          {field('phone')}
          {field('note', true)}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={creating || updating}>
            {(creating || updating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
