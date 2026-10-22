import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { CREATE_CITATION, LIBRARY_CHANGED, UPDATE_CITATION } from '@/features/sources/graphql/sourceQueries';
import type { Citation } from '@/features/sources/types/source';
import { apiErrorMessage } from '@/lib/apiErrors';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { citationDraftOf, citationInput, type CitationDraft } from '@/features/sources/lib/citationDraft';
import { CitationFields } from './CitationFields';

interface CitationFormDialogProps {
  open: boolean;
  sourceId: string;
  /** Citation to edit; without one a new one of the source is created (not linked yet) */
  citation?: Citation | null;
  onClose: () => void;
}

/** Page, date, quality and transcription of an entry; the scans are added on the source page */
export function CitationFormDialog({ open, sourceId, citation, onClose }: CitationFormDialogProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CitationDraft>(citationDraftOf(citation));
  const [error, setError] = useState<string | null>(null);
  const [createCitation, { loading: creating }] = useMutation(CREATE_CITATION, LIBRARY_CHANGED);
  const [updateCitation, { loading: updating }] = useMutation(UPDATE_CITATION, LIBRARY_CHANGED);

  useEffect(() => {
    if (open) {
      setDraft(citationDraftOf(citation));
      setError(null);
    }
  }, [open, citation]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = citationInput(sourceId, draft);
      if (citation) {
        await updateCitation({ variables: { id: citation.id, data } });
      } else {
        await createCitation({ variables: { data } });
      }
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <form onSubmit={submit} noValidate>
        <DialogHeader>
          <DialogTitle>{citation ? t('sources.citation.editTitle') : t('sources.citation.createTitle')}</DialogTitle>
        </DialogHeader>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}
        <CitationFields draft={draft} onChange={setDraft} />
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
