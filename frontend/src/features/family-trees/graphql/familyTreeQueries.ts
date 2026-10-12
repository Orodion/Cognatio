import { gql } from '@apollo/client';

const FAMILY_TREE_FIELDS = gql`
  fragment FamilyTreeFields on FamilyTree {
    id
    name
    description
    personCount
    isDeleted
    deletedAt
    createdAt
    updatedAt
  }
`;

export const GET_FAMILY_TREES = gql`
  ${FAMILY_TREE_FIELDS}
  query GetFamilyTrees {
    familyTrees {
      ...FamilyTreeFields
    }
  }
`;

export const GET_DELETED_FAMILY_TREES = gql`
  ${FAMILY_TREE_FIELDS}
  query GetDeletedFamilyTrees {
    deletedFamilyTrees {
      ...FamilyTreeFields
    }
  }
`;

export const CREATE_FAMILY_TREE = gql`
  ${FAMILY_TREE_FIELDS}
  mutation CreateFamilyTree($data: FamilyTreeInput!) {
    createFamilyTree(data: $data) {
      ...FamilyTreeFields
    }
  }
`;

export const UPDATE_FAMILY_TREE = gql`
  ${FAMILY_TREE_FIELDS}
  mutation UpdateFamilyTree($id: ID!, $data: FamilyTreeInput!) {
    updateFamilyTree(id: $id, data: $data) {
      ...FamilyTreeFields
    }
  }
`;

export const DELETE_FAMILY_TREE = gql`
  mutation DeleteFamilyTree($id: ID!) {
    deleteFamilyTree(id: $id)
  }
`;

export const RESTORE_FAMILY_TREE = gql`
  ${FAMILY_TREE_FIELDS}
  mutation RestoreFamilyTree($id: ID!) {
    restoreFamilyTree(id: $id) {
      ...FamilyTreeFields
    }
  }
`;

export const HARD_DELETE_FAMILY_TREE = gql`
  mutation HardDeleteFamilyTree($id: ID!) {
    hardDeleteFamilyTree(id: $id)
  }
`;

/** Family tree of a person – even if it is not the active one */
export const LOCATE_PERSON = gql`
  query LocatePerson($id: ID!) {
    locatePerson(id: $id)
  }
`;
