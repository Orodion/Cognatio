import { gql } from '@apollo/client';
import { PERSON_FIELDS } from '@/features/persons/graphql/personQueries';

/** All persons and active relations of the open family tree – for the relatives and the numbering */
export const REPORT_TREE = gql`
  ${PERSON_FIELDS}
  query ReportTree {
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
      startDate
      endDate
    }
  }
`;

/** Life events, notes, media and citations of the persons on the sheets */
export const REPORT_PERSONS = gql`
  query ReportPersons($ids: [ID!]!) {
    reportPersons(ids: $ids) {
      id
      events {
        id
        personId
        date
        datePrecision
        title
        category
        description
        place
        sortOrder
        createdAt
        updatedAt
      }
      notes {
        id
        personId
        text
        createdAt
        updatedAt
      }
      media {
        id
        personId
        fileName
        originalFileName
        mimeType
        sizeBytes
        type
        viewable
        createdAt
        updatedAt
      }
      citations {
        kind
        fact
        eventId
        relationId
        citation {
          id
          sourceId
          page
          date
          text
          quality
          createdAt
          updatedAt
          linkCount
          source {
            id
            title
            type
            abbreviation
            author
            repository {
              id
              name
            }
          }
        }
      }
    }
  }
`;
