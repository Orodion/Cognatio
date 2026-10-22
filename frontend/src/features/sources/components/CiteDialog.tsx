import { useEffect, useId, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { CREATE_CITATION, GET_SOURCE_CITATIONS, GET_SOURCES, LINK_CITATION, LIBRARY_CHANGED } from '@/features/sources/graphql/sourceQueries';
import { citationSummary, excerpt, sourceName } from '@/features/sources/lib/sourceText';
import type { PersonFact } from '@/features/sources/lib/personFacts';
import type { Citation, Source } from '@/features/sources/types/source';
import { apiErrorMessage } from '@/lib/apiErrors';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { ClearableInput } from '@/components/ui/ClearableInput';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { citationDraftOf, citationInput, type CitationDraft } from '@/features/sources/lib/citationDraft';
import { draftOf, sourceDraftError, useSaveSource, type SourceDraft } from '@/features/sources/lib/sourceDraft';
import { CitationFields } from './CitationFields';
import { SourceFields } from './SourceFields';

const NEW = 'new';
const LIST_LIMIT = 50;

interface CiteDialogProps {
  open: boolean;
  onClose: () => void;
  facts: PersonFact[];
  /** Fact chosen when opening */
  factKey: string;
}

/**
 * Cites a source for a fact of a person: choose the fact, a source of the library (or create one) and an entry of it
 * that exists already – e.g. the marriage entry that is cited for the bride as well – or a new one.
 */
export function CiteDialog({ open, onClose, facts, factKey: initialFact }: CiteDialogProps) {
  const { t } = useTranslation();
  const id = useId();
  const [factKey, setFactKey] = useState(initialFact);
  const [search, setSearch] = useState('');
  const [sourceId, setSourceId] = useState<string>('');
  const [sourceDraft, setSourceDraft] = useState<SourceDraft>(draftOf());
  const [citationId, setCitationId] = useState<string>(NEW);
  const [citationDraft, setCitationDraft] = useState<CitationDraft>(citationDraftOf());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: sources, loading } = useQuery<{ sources: Source[] }>(GET_SOURCES, { variables: { scope: 'ALL' }, skip: !open });
  const existingSource = sourceId && sourceId !== NEW ? sourceId : null;
  const { data: citations } = useQuery<{ source: { id: string; citations: Citation[] } | null }>(GET_SOURCE_CITATIONS, {
    variables: { id: existingSource },
    skip: !open || !existingSource,
  });
  const saveSource = useSaveSource();
  const [createCitation] = useMutation(CREATE_CITATION, LIBRARY_CHANGED);
  const [linkCitation] = useMutation(LINK_CITATION, LIBRARY_CHANGED);

  useEffect(() => {
    if (open) {
      setFactKey(initialFact);
      setSearch('');
      setSourceId('');
      setSourceDraft(draftOf());
      setCitationId(NEW);
      setCitationDraft(citationDraftOf());
      setError(null);
    }
  }, [open, initialFact]);

  const matching = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (sources?.sources ?? []).filter(
      (s) => !term || [s.title, s.abbreviation, s.author, s.repository?.name].some((v) => v?.toLowerCase().includes(term)),
    );
  }, [sources, search]);

  const fact = facts.find((f) => f.key === factKey);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fact) {
      return;
    }
    if (!sourceId) {
      setError(t('sources.cite.chooseSource'));
      return;
    }
    const invalid = sourceId === NEW ? sourceDraftError(sourceDraft) : null;
    if (invalid) {
      setError(t(invalid));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const target = fact.target;
      if (existingSource && citationId !== NEW) {
        await linkCitation({ variables: { citationId, targets: [target] } });
      } else {
        const source = existingSource ?? (await saveSource(sourceDraft))?.id;
        if (source) {
          await createCitation({ variables: { data: citationInput(source, citationDraft), targets: [target] } });
        }
      }
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  const choices = citations?.source?.citations ?? [];

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <form onSubmit={submit} noValidate>
        <DialogHeader>
          <DialogTitle>{t('sources.cite.title')}</DialogTitle>
        </DialogHeader>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor={`${id}-fact`}>{t('sources.cite.fact')}</Label>
            <Select id={`${id}-fact`} value={factKey} onChange={(e) => setFactKey(e.target.value)}>
              {facts.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('sources.cite.source')}</legend>
            <ClearableInput
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder={t('sources.cite.searchSource')}
              aria-label={t('sources.cite.searchSource')}
            />
            {loading && !sources ? (
              <div className="flex justify-center py-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-1" role="radiogroup" aria-label={t('sources.cite.source')}>
                {matching.slice(0, LIST_LIMIT).map((s) => (
                  <div key={s.id}>
                    <label
                      className={cn('flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent', sourceId === s.id && 'bg-accent')}
                    >
                      <input
                        type="radio"
                        name={`${id}-source`}
                        checked={sourceId === s.id}
                        onChange={() => {
                          setSourceId(s.id);
                          setCitationId(NEW);
                        }}
                        className="mt-1"
                      />
                      <span>
                        <span className="block font-medium">{sourceName(s)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {[t(`sources.types.${s.type}`), s.repository?.name].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </label>
                  </div>
                ))}
                {matching.length > LIST_LIMIT && (
                  <div className="px-2 py-1 text-xs text-muted-foreground">{t('sources.cite.more', { count: matching.length - LIST_LIMIT })}</div>
                )}
                <div>
                  <label className={cn('flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent', sourceId === NEW && 'bg-accent')}>
                    <input type="radio" name={`${id}-source`} checked={sourceId === NEW} onChange={() => setSourceId(NEW)} />
                    <span className="font-medium">{t('sources.cite.newSource')}</span>
                  </label>
                </div>
              </div>
            )}
          </fieldset>

          {sourceId === NEW && <SourceFields draft={sourceDraft} onChange={setSourceDraft} compact />}

          {existingSource && choices.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t('sources.cite.entry')}</legend>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-1" role="radiogroup" aria-label={t('sources.cite.entry')}>
                <div>
                  <label
                    className={cn('flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent', citationId === NEW && 'bg-accent')}
                  >
                    <input type="radio" name={`${id}-citation`} checked={citationId === NEW} onChange={() => setCitationId(NEW)} />
                    <span className="font-medium">{t('sources.cite.newEntry')}</span>
                  </label>
                </div>
                {choices.map((c) => (
                  <div key={c.id}>
                    <label
                      className={cn('flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent', citationId === c.id && 'bg-accent')}
                    >
                      <input type="radio" name={`${id}-citation`} checked={citationId === c.id} onChange={() => setCitationId(c.id)} className="mt-1" />
                      <span>
                        <span className="block">{citationSummary(c) || t('sources.citation.withoutPage')}</span>
                        {c.text && <span className="block text-xs text-muted-foreground">{excerpt(c.text, 80)}</span>}
                        <span className="block text-xs text-muted-foreground">{t('sources.citation.supports', { count: c.linkCount })}</span>
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
          )}

          {sourceId && citationId === NEW && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t('sources.cite.newEntry')}</legend>
              <CitationFields draft={citationDraft} onChange={setCitationDraft} />
            </fieldset>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('sources.cite.save')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
