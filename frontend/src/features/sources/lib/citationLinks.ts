import { formatShortName } from '@/features/persons/lib/personUtils';
import { CITATION_FACTS, type Citation, type CitationLink, type LinkedPerson } from '@/features/sources/types/source';
import { citationSummary, excerpt } from './sourceText';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** A fact a citation supports, as a chip next to its person */
export interface LinkedFact {
  key: string;
  link: CitationLink;
  label: string;
}

/** The facts a citation supports of one person */
export interface LinkGroup {
  person: LinkedPerson;
  familyTreeId: string;
  familyTreeName: string;
  facts: LinkedFact[];
}

const PARENT_TYPES = ['MOTHER', 'FATHER'];

function byGender(person: Pick<LinkedPerson, 'gender'>, male: string, female: string, fallback: string) {
  if (person.gender === 'MALE') {
    return male;
  }
  return person.gender === 'FEMALE' ? female : fallback;
}

/**
 * Role of the other person of a relation, seen from one of its persons – like the relations of the person page.
 * A relation reads "personB is <type> of personA", e.g. { personA: child, personB: mother, type: MOTHER }.
 */
export function relationRole(type: string, viewerIsA: boolean, other: Pick<LinkedPerson, 'gender'>) {
  if (viewerIsA) {
    return type;
  }
  if (PARENT_TYPES.includes(type)) {
    return 'CHILD';
  }
  if (type === 'CHILD') {
    return byGender(other, 'FATHER', 'MOTHER', 'PARENT');
  }
  if (type === 'HUSBAND' || type === 'WIFE') {
    return byGender(other, 'HUSBAND', 'WIFE', 'SPOUSE');
  }
  return type;
}

const factRank = (link: CitationLink) =>
  link.kind === 'PERSON' ? CITATION_FACTS.indexOf(link.fact ?? 'GENERAL') : link.kind === 'EVENT' ? CITATION_FACTS.length : CITATION_FACTS.length + 1;

const linkKey = (link: CitationLink) => `${link.kind}:${link.fact ?? link.eventId ?? link.relationId}:${link.person.id}`;

/**
 * The facts of a citation by person: every person once, with the person as a whole, name, birth, death, events and
 * relations. A relation goes to the person of the two that has other facts here (else to the first one) and names
 * the role of the other person, e.g. "Child: Andreas Dörr".
 */
export function groupLinks(links: CitationLink[], t: Translate): LinkGroup[] {
  const groups = new Map<string, LinkGroup>();
  const groupOf = (person: LinkedPerson, link: CitationLink) => {
    let group = groups.get(person.id);
    if (!group) {
      group = { person, familyTreeId: link.familyTreeId, familyTreeName: link.familyTreeName, facts: [] };
      groups.set(person.id, group);
    }
    return group;
  };
  const dated = (label: string, date?: string | null) => (date ? `${label} (${date})` : label);

  for (const link of links.filter((l) => l.kind !== 'RELATION')) {
    const label = link.kind === 'EVENT' ? dated(link.eventTitle ?? '', link.eventDate) : t(`sources.facts.${link.fact ?? 'GENERAL'}`);
    groupOf(link.person, link).facts.push({ key: linkKey(link), link, label });
  }
  for (const link of links.filter((l) => l.kind === 'RELATION')) {
    const other = link.otherPerson;
    const viewerIsA = !other || groups.has(link.person.id) || !groups.has(other.id);
    const viewer = viewerIsA ? link.person : other;
    const shown = viewerIsA ? other : link.person;
    const role = relationRole(link.relationType ?? 'OTHER', viewerIsA, shown ?? {});
    const label = `${t(`relations.types.${role}`, { defaultValue: role })}: ${shown ? formatShortName(shown) : ''}`;
    groupOf(viewer, link).facts.push({ key: linkKey(link), link, label });
  }
  for (const group of groups.values()) {
    group.facts.sort((a, b) => factRank(a.link) - factRank(b.link));
  }
  return [...groups.values()];
}

/** Title of a citation: page and date, else the beginning of the transcription, else "Citation without page" */
export const citationTitle = (citation: Pick<Citation, 'page' | 'date' | 'text'>, t: Translate) =>
  citationSummary(citation) || excerpt(citation.text, 60) || t('sources.citation.withoutPage');
