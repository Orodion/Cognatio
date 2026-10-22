import { gql } from '@apollo/client';

/** Relations of the active family tree – for the wedding days among the anniversaries */
export const ANNIVERSARY_RELATIONS = gql`
  query AnniversaryRelations {
    getRelations {
      id
      personAId
      personBId
      type
      active
      startDate
    }
  }
`;
