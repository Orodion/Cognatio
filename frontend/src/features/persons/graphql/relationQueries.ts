import { gql } from '@apollo/client';
import { PERSON_FIELDS } from './personQueries';

export const GET_PERSON_RELATIONS = gql`
  ${PERSON_FIELDS}
  query GetPersonRelations($personId: ID!) {
    getPersonRelations(personId: $personId) {
      id
      type
      role
      label
      note
      active
      startDate
      endDate
      otherPerson {
        ...PersonFields
      }
      createdAt
    }
  }
`;

export const CREATE_RELATION = gql`
  mutation CreateRelation($data: RelationInput!, $confirmed: Boolean) {
    createRelation(data: $data, confirmed: $confirmed) {
      id
      personAId
      personBId
      type
      label
      active
      note
      startDate
      endDate
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_RELATION = gql`
  mutation DeleteRelation($id: ID!) {
    deleteRelation(id: $id)
  }
`;

export const HARD_DELETE_RELATION = gql`
  mutation HardDeleteRelation($id: ID!) {
    hardDeleteRelation(id: $id)
  }
`;
