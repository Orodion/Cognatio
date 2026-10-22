import type { MockedResponse } from '@apollo/client/testing';
import { GET_FAMILY_TREES } from '@/features/family-trees/graphql/familyTreeQueries';
import type { Person } from '@/features/persons/types/person';
import type { FamilyTree } from '@/features/family-trees/types/familyTree';

/** Complete person for GraphQL mocks (all fields from PERSON_FIELDS, otherwise Apollo warns). */
export function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    __typename: 'Person',
    id: 'p1',
    firstName: 'Anna',
    lastName: 'Muster',
    middleName: null,
    birthName: null,
    title: null,
    nickname: null,
    birthDate: null,
    birthDatePrecision: null,
    birthPlace: null,
    gender: 'FEMALE',
    deathDate: null,
    deathDatePrecision: null,
    deathPlace: null,
    address: null,
    phone: null,
    email: null,
    occupation: null,
    hobbies: null,
    maritalStatus: null,
    nationality: null,
    languages: [],
    profilePictureId: null,
    profilePictureUrl: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: '2023-11-14T22:13:20.000Z',
    updatedAt: '2023-11-14T22:13:20.000Z',
    ...overrides,
  } as Person;
}

/** Family tree for GraphQL mocks */
export function makeTree(overrides: Partial<FamilyTree> = {}): FamilyTree {
  return {
    __typename: 'FamilyTree',
    id: 't1',
    name: 'Familie Muster',
    description: null,
    personCount: 2,
    isDeleted: false,
    deletedAt: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    homePerson: null,
    ...overrides,
  } as FamilyTree;
}

/** List of family trees (can be fetched any number of times) – for pages that show the open family tree */
export function treesMock(trees: FamilyTree[] = [makeTree()]): MockedResponse {
  return { request: { query: GET_FAMILY_TREES }, result: { data: { familyTrees: trees } }, maxUsageCount: Infinity };
}
