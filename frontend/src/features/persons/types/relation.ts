import type { Person } from './person';

export interface Relation {
  id: string;
  personAId: string;
  personBId: string;
  type: string;
  label?: string | null;
  active: boolean;
  note?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonRelationDetail {
  id: string;
  type: string;
  role: string;
  label?: string | null;
  note?: string | null;
  active: boolean;
  otherPerson: Person;
  createdAt: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface RelationInput {
  personAId: string;
  personBId: string;
  type: string;
  label?: string;
  note?: string;
  startDate?: string;
  endDate?: string;
}
