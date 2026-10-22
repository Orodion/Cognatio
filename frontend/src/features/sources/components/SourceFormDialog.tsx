import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import type { Source } from '@/features/sources/types/source';
import { apiErrorMessage } from '@/lib/apiErrors';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { draftOf, sourceDraftError, useSaveSource, type SourceDraft } from '@/features/sources/lib/sourceDraft';
import { SourceFields } from './SourceFields';

interface SourceFormDialogProps {
  open: boolean;
  /** Source to edit; without one a new one is created */
  source?: Source | null;
  onClose: () => void;
  onSaved?: (source: Source) => void;
}

/** Create or edit a source of the library */
export function SourceFormDialog({ open, source, onClose, onSaved }: SourceFormDialogProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<SourceDraft>(draftOf(source));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const save = useSaveSource();

  useEffect(() => {
    if (open) {
      setDraft(draftOf(source));
      setError(null);
    }
  }, [open, source]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = sourceDraftError(draft);
    if (invalid) {
      setError(t(invalid));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await save(draft, source);
      if (saved) {
        onSaved?.(saved);
      }
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <form onSubmit={submit} noValidate>
        <DialogHeader>
          <DialogTitle>{source ? t('sources.form.editTitle') : t('sources.form.createTitle')}</DialogTitle>
        </DialogHeader>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}
        <SourceFields draft={draft} onChange={setDraft} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
