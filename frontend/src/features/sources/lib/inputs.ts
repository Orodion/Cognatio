import type { Citation, CitationInput, Source, SourceInput } from '@/features/sources/types/source';

/** The source as input of the API, unchanged except for the scans (e.g. to remove one) */
export const sourceInputOf = (source: Source, mediaIds: string[]): SourceInput => ({
  type: source.type,
  title: source.title,
  author: source.author ?? null,
  publication: source.publication ?? null,
  abbreviation: source.abbreviation ?? null,
  text: source.text ?? null,
  repositoryId: source.repositoryId ?? null,
  callNumber: source.callNumber ?? null,
  note: source.note ?? null,
  mediaIds,
});

/** The citation as input of the API, unchanged except for the scans */
export const citationInputOf = (citation: Citation, mediaIds: string[]): CitationInput => ({
  sourceId: citation.sourceId,
  page: citation.page ?? null,
  date: citation.date ?? null,
  datePrecision: citation.datePrecision ?? null,
  text: citation.text ?? null,
  quality: citation.quality ?? null,
  note: citation.note ?? null,
  mediaIds,
});
