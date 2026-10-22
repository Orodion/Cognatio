import { useQuery } from '@apollo/client';
import { formatShortName } from '@/features/persons/lib/personUtils';
import type { TimelineEvent } from '@/features/persons/types/event';
import type { PersonRelationDetail } from '@/features/persons/types/relation';
import { GET_PERSON_CITATIONS } from '@/features/sources/graphql/sourceQueries';
import { CITATION_FACTS, sameTarget, targetOf, type CitationTarget, type FactCitation } from '@/features/sources/types/source';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** A fact of a person that a citation can support */
export interface PersonFact {
  key: string;
  target: CitationTarget;
  label: string;
}

/** The facts of a person: the person as a whole, name, birth, death, every event and every relation */
export function personFacts(
  person: { id: string; birthDate?: string | null; deathDate?: string | null },
  events: TimelineEvent[],
  relations: PersonRelationDetail[],
  t: Translate,
): PersonFact[] {
  const dated = (label: string, date?: string | null) => (date ? `${label} (${date})` : label);
  return [
    ...CITATION_FACTS.map((fact) => ({
      key: `PERSON:${fact}`,
      target: { personId: person.id, fact },
      label: dated(t(`sources.facts.${fact}`), fact === 'BIRTH' ? person.birthDate : fact === 'DEATH' ? person.deathDate : null),
    })),
    ...events.map((e) => ({ key: `EVENT:${e.id}`, target: { eventId: e.id }, label: dated(e.title, e.date) })),
    ...relations.map((r) => ({
      key: `RELATION:${r.id}`,
      target: { relationId: r.id },
      label: `${t(`relations.types.${r.role}`, { defaultValue: r.role })}: ${formatShortName(r.otherPerson)}`,
    })),
  ];
}

/** Key of the fact a citation of the person supports */
export const factKeyOf = (c: Pick<FactCitation, 'kind' | 'fact' | 'eventId' | 'relationId'>) =>
  c.kind === 'EVENT' ? `EVENT:${c.eventId}` : c.kind === 'RELATION' ? `RELATION:${c.relationId}` : `PERSON:${c.fact ?? 'GENERAL'}`;

/**
 * The citations of a person (one query for the whole person page) and the number per fact – for the marks at birth,
 * death, events and relations.
 */
export function usePersonCitations(personId: string) {
  const query = useQuery<{ personCitations: FactCitation[] }>(GET_PERSON_CITATIONS, { variables: { personId } });
  const citations = query.data?.personCitations ?? [];
  const countFor = (target: CitationTarget) => citations.filter((c) => sameTarget(targetOf(personId, c), target)).length;
  return { ...query, citations, countFor };
}
