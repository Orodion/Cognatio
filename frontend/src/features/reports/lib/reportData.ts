import type { Person } from '@/features/persons/types/person';
import type { TimelineEvent } from '@/features/persons/types/event';
import type { PersonNote } from '@/features/persons/types/note';
import type { Media } from '@/features/persons/types/media';
import { isDeceased, MAX_PLAUSIBLE_AGE } from '@/features/persons/lib/personUtils';
import { yearOfDate } from './dates';

export interface ReportCitation {
  kind: 'PERSON' | 'EVENT' | 'RELATION';
  fact?: string | null;
  eventId?: string | null;
  relationId?: string | null;
  citation: {
    id: string;
    page?: string | null;
    date?: string | null;
    text?: string | null;
    quality?: number | null;
    source: { id: string; title: string; type: string; abbreviation?: string | null; author?: string | null; repository?: { id: string; name: string } | null };
  };
}

/** What a sheet shows of a person besides the person fields (query reportPersons) */
export interface ReportPersonData {
  id: string;
  events: TimelineEvent[];
  notes: PersonNote[];
  media: Media[];
  citations: ReportCitation[];
}

/** A fact a footnote can stand at */
export type FootnoteTarget = { kind: 'PERSON'; fact: string } | { kind: 'EVENT'; eventId: string } | { kind: 'RELATION'; relationId: string };

export interface Footnotes {
  /** The citations in the order of their numbers */
  list: Array<ReportCitation['citation']>;
  /** Numbers of the citations of a fact */
  marks: (target: FootnoteTarget) => number[];
}

/** Numbers the citations of a sheet: each citation once, in the order they are given */
export function footnotes(citations: ReportCitation[]): Footnotes {
  const numbers = new Map<string, number>();
  const list: Array<ReportCitation['citation']> = [];
  for (const { citation } of citations) {
    if (!numbers.has(citation.id)) {
      numbers.set(citation.id, list.length + 1);
      list.push(citation);
    }
  }
  const matches = (c: ReportCitation, target: FootnoteTarget) =>
    c.kind === target.kind &&
    (target.kind === 'PERSON'
      ? (c.fact ?? 'GENERAL') === target.fact
      : target.kind === 'EVENT'
        ? c.eventId === target.eventId
        : c.relationId === target.relationId);
  return {
    list,
    marks: (target) => [...new Set(citations.filter((c) => matches(c, target)).map((c) => numbers.get(c.citation.id)!))].sort((a, b) => a - b),
  };
}

/** Living: no date or place of death and – if the year of birth is known – not older than MAX_PLAUSIBLE_AGE */
export function isLiving(person: Pick<Person, 'birthDate' | 'deathDate' | 'deathPlace'>, currentYear = new Date().getFullYear()): boolean {
  if (isDeceased(person)) {
    return false;
  }
  const born = yearOfDate(person.birthDate);
  return born === null || currentYear - born <= MAX_PLAUSIBLE_AGE;
}
