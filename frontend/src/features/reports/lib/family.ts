import type { Person } from '@/features/persons/types/person';
import { dateSortKey } from '@/lib/dateParsing';

/** A relation as the reports need it ("personB is <type> of personA") */
export interface ReportRelation {
  id: string;
  personAId: string;
  personBId: string;
  type: string;
  label?: string | null;
  active?: boolean | null;
  startDate?: string | null;
  endDate?: string | null;
}

export type ParentRole = 'FATHER' | 'MOTHER' | null;

export interface ParentLink {
  person: Person;
  role: ParentRole;
  /** e.g. "Adoptive child" */
  label?: string | null;
}

export interface PartnerLink {
  person: Person;
  relation: ReportRelation;
}

/** Lookups of the relatives of a person – parents, partners, children, siblings – for the reports */
export interface Family {
  persons: Map<string, Person>;
  parents: (id: string) => ParentLink[];
  /** Father and mother: by the type of the relation, else by gender; unknown ones fill the free place */
  fatherAndMother: (id: string) => { father: Person | null; mother: Person | null };
  partners: (id: string) => PartnerLink[];
  /** Children by date of birth */
  children: (id: string) => Person[];
  /** Children of both persons, by date of birth */
  childrenOf: (a: string, b: string) => Person[];
  /** Siblings recorded as such and children of the same parents, by date of birth */
  siblings: (id: string) => Person[];
}

const PARTNER_TYPES = new Set(['HUSBAND', 'WIFE', 'LIFE_PARTNER', 'PARTNER']);

/** Earlier births first, persons without a date of birth at the end */
export const byBirth = (a: Person, b: Person) => (dateSortKey(a.birthDate) ?? Infinity) - (dateSortKey(b.birthDate) ?? Infinity);

function push<T>(map: Map<string, T[]>, key: string, value: T) {
  const list = map.get(key);
  if (list) {
    list.push(value);
  } else {
    map.set(key, [value]);
  }
}

const genderRole = (person: Person): ParentRole => (person.gender === 'MALE' ? 'FATHER' : person.gender === 'FEMALE' ? 'MOTHER' : null);

/** Builds the lookups from the persons and the active relations of a family tree; relations to unknown persons are skipped */
export function buildFamily(personList: Person[], relations: ReportRelation[]): Family {
  const persons = new Map(personList.map((person) => [person.id, person]));
  const parents = new Map<string, ParentLink[]>();
  const children = new Map<string, Person[]>();
  const partners = new Map<string, PartnerLink[]>();
  const siblings = new Map<string, Person[]>();

  for (const relation of relations) {
    const a = persons.get(relation.personAId);
    const b = persons.get(relation.personBId);
    if (!a || !b || relation.active === false || a.id === b.id) {
      continue;
    }
    if (relation.type === 'MOTHER' || relation.type === 'FATHER') {
      push(parents, a.id, { person: b, role: relation.type, label: relation.label });
      push(children, b.id, a);
    } else if (relation.type === 'CHILD') {
      push(parents, b.id, { person: a, role: genderRole(a), label: relation.label });
      push(children, a.id, b);
    } else if (PARTNER_TYPES.has(relation.type)) {
      push(partners, a.id, { person: b, relation });
      push(partners, b.id, { person: a, relation });
    } else if (relation.type === 'SIBLING') {
      push(siblings, a.id, b);
      push(siblings, b.id, a);
    }
  }

  const unique = <T extends { id: string }>(list: T[]) => [...new Map(list.map((item) => [item.id, item])).values()];
  const uniqueLinks = <T extends { person: Person }>(list: T[]) => [...new Map(list.map((link) => [link.person.id, link])).values()];

  const parentsOf = (id: string) => uniqueLinks(parents.get(id) ?? []);
  const childrenOf = (id: string) => unique(children.get(id) ?? []).sort(byBirth);

  return {
    persons,
    parents: parentsOf,
    fatherAndMother: (id) => {
      let father: Person | null = null;
      let mother: Person | null = null;
      const unknown: Person[] = [];
      for (const { person, role } of parentsOf(id)) {
        const as = role ?? genderRole(person);
        if (as === 'FATHER' && !father) {
          father = person;
        } else if (as === 'MOTHER' && !mother) {
          mother = person;
        } else if (!as) {
          unknown.push(person);
        }
      }
      for (const person of unknown) {
        if (!father) {
          father = person;
        } else if (!mother) {
          mother = person;
        }
      }
      return { father, mother };
    },
    partners: (id) => uniqueLinks(partners.get(id) ?? []).sort((x, y) => (x.relation.startDate ?? '').localeCompare(y.relation.startDate ?? '')),
    children: childrenOf,
    childrenOf: (a, b) => {
      const ofB = new Set(childrenOf(b).map((child) => child.id));
      return childrenOf(a).filter((child) => ofB.has(child.id));
    },
    siblings: (id) => {
      const viaParents = parentsOf(id).flatMap(({ person }) => children.get(person.id) ?? []);
      return unique([...(siblings.get(id) ?? []), ...viaParents])
        .filter((person) => person.id !== id)
        .sort(byBirth);
    },
  };
}
