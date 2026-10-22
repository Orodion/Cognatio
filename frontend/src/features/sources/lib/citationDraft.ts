import { parseFlexibleDate } from '@/lib/dateParsing';
import type { Citation, CitationInput } from '@/features/sources/types/source';

export interface CitationDraft {
  page: string;
  date: string;
  /** "" = no rating */
  quality: string;
  text: string;
  note: string;
}

export const citationDraftOf = (citation?: Citation | null): CitationDraft => ({
  page: citation?.page ?? '',
  date: citation?.date ?? '',
  quality: citation?.quality === null || citation?.quality === undefined ? '' : String(citation.quality),
  text: citation?.text ?? '',
  note: citation?.note ?? '',
});

/** The fields as input of the API; the precision of the date is detected like everywhere in the app */
export function citationInput(sourceId: string, draft: CitationDraft): CitationInput {
  const date = draft.date.trim();
  const parsed = date ? parseFlexibleDate(date, true) : null;
  return {
    sourceId,
    page: draft.page.trim() || null,
    date: date || null,
    datePrecision: parsed?.ok ? parsed.value.precision : null,
    text: draft.text.trim() || null,
    quality: draft.quality === '' ? null : Number(draft.quality),
    note: draft.note.trim() || null,
  };
}
