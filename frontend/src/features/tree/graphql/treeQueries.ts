import { gql } from '@apollo/client';
import { PERSON_FIELDS } from '@/features/persons/graphql/personQueries';

export const GET_TREE_DATA = gql`
  ${PERSON_FIELDS}
  query GetTreeData {
    getPersons {
      ...PersonFields
    }
    getRelations {
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
