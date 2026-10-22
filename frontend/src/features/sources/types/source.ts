import type { Media } from '@/features/persons/types/media';

/** Kinds of sources (only for the symbol and the filter, all have the same fields) */
export const SOURCE_TYPES = [
  'CHURCH_BOOK',
  'CIVIL_REGISTER',
  'CENSUS',
  'NEWSPAPER',
  'BOOK',
  'LETTER',
  'GRAVESTONE',
  'WEBSITE',
  'INTERVIEW',
  'DOCUMENT',
  'OTHER',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/** Facts of a person a citation can support – birth and death are fields of the person, not events */
export const CITATION_FACTS = ['GENERAL', 'NAME', 'BIRTH', 'DEATH'] as const;
export type CitationFact = (typeof CITATION_FACTS)[number];

/** GEDCOM QUAY: 0 unreliable, 1 questionable, 2 secondary, 3 primary */
export const QUALITY_LEVELS = [3, 2, 1, 0] as const;

/** Upper limits of the backend (characters) */
export const MAX_SHORT_LENGTH = 1_000;
export const MAX_LONG_LENGTH = 20_000;

/** Archive, library, registry office, website … – shared by all family trees */
export interface Repository {
  id: string;
  name: string;
  address?: string | null;
  url?: string | null;
  email?: string | null;
  phone?: string | null;
  note?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sourceCount?: number;
}

export interface Source {
  id: string;
  type: SourceType;
  title: string;
  author?: string | null;
  publication?: string | null;
  abbreviation?: string | null;
  text?: string | null;
  repositoryId?: string | null;
  /** null while the archive is in the recycle bin */
  repository?: Pick<Repository, 'id' | 'name'> | null;
  callNumber?: string | null;
  note?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  media?: Media[];
  citations?: Citation[];
  citationCount: number;
  /** Facts its citations support in all family trees and in the open one */
  linkCount: number;
  treeLinkCount: number;
}

export interface Citation {
  id: string;
  sourceId: string;
  source?: Pick<Source, 'id' | 'title' | 'type' | 'abbreviation'> & { repository?: Pick<Repository, 'id' | 'name'> | null };
  page?: string | null;
  date?: string | null;
  datePrecision?: string | null;
  text?: string | null;
  quality?: number | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  media?: Media[];
  /** Supported facts in all family trees */
  linkCount: number;
  links?: CitationLink[];
}

export interface LinkedPerson {
  id: string;
  firstName: string;
  lastName?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  isDeleted?: boolean;
}

/** A fact a citation supports, as shown with the citation */
export interface CitationLink {
  kind: 'PERSON' | 'EVENT' | 'RELATION';
  fact?: CitationFact | null;
  person: LinkedPerson;
  eventId?: string | null;
  eventTitle?: string | null;
  eventDate?: string | null;
  relationId?: string | null;
  relationType?: string | null;
  otherPerson?: LinkedPerson | null;
  familyTreeId: string;
  familyTreeName: string;
}

/** A citation of a person, of one of its events or relations */
export interface FactCitation {
  kind: 'PERSON' | 'EVENT' | 'RELATION';
  fact?: CitationFact | null;
  eventId?: string | null;
  relationId?: string | null;
  citation: Citation;
}

/** A fact of the open family tree: exactly one of person (with fact), event or relation */
export interface CitationTarget {
  personId?: string;
  fact?: CitationFact;
  eventId?: string;
  relationId?: string;
}

export interface SourceInput {
  type: SourceType;
  title: string;
  author?: string | null;
  publication?: string | null;
  abbreviation?: string | null;
  text?: string | null;
  repositoryId?: string | null;
  callNumber?: string | null;
  note?: string | null;
  mediaIds?: string[];
}

export interface CitationInput {
  sourceId: string;
  page?: string | null;
  date?: string | null;
  datePrecision?: string | null;
  text?: string | null;
  quality?: number | null;
  note?: string | null;
  mediaIds?: string[];
}

export interface RepositoryInput {
  name: string;
  address?: string | null;
  url?: string | null;
  email?: string | null;
  phone?: string | null;
  note?: string | null;
}

/** Same fact? (for the citations of one fact) */
export const sameTarget = (a: CitationTarget, b: CitationTarget) =>
  (a.personId ?? null) === (b.personId ?? null) &&
  (a.personId ? (a.fact ?? 'GENERAL') === (b.fact ?? 'GENERAL') : true) &&
  (a.eventId ?? null) === (b.eventId ?? null) &&
  (a.relationId ?? null) === (b.relationId ?? null);

/** The target of a fact a citation supports */
export const targetOfLink = (link: CitationLink): CitationTarget =>
  link.kind === 'EVENT'
    ? { eventId: link.eventId! }
    : link.kind === 'RELATION'
      ? { relationId: link.relationId! }
      : { personId: link.person.id, fact: link.fact ?? 'GENERAL' };

/** The fact of a citation of a person as target */
export const targetOf = (personId: string, c: Pick<FactCitation, 'kind' | 'fact' | 'eventId' | 'relationId'>): CitationTarget =>
  c.kind === 'EVENT' ? { eventId: c.eventId! } : c.kind === 'RELATION' ? { relationId: c.relationId! } : { personId, fact: c.fact ?? 'GENERAL' };
