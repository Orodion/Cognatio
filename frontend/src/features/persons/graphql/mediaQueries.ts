import { gql } from '@apollo/client';

export const GET_PERSON_MEDIA = gql`
  query GetPersonMedia($personId: ID!) {
    getPersonMedia(personId: $personId) {
      id
      personId
      fileName
      originalFileName
      mimeType
      viewable
      sizeBytes
      type
      createdAt
      updatedAt
      # Besitzer – wird nach dem Verknüpfen mit einem Ereignis einer anderen Person angezeigt
      person {
        id
        firstName
        lastName
      }
      events {
        id
        title
        personId
      }
    }
  }
`;

/** Media of other persons linked with events of this person (e.g. group photos) */
export const GET_LINKED_MEDIA = gql`
  query GetLinkedMedia($personId: ID!) {
    getLinkedMedia(personId: $personId) {
      id
      personId
      fileName
      originalFileName
      mimeType
      viewable
      sizeBytes
      type
      createdAt
      updatedAt
      person {
        id
        firstName
        lastName
      }
      events {
        id
        title
        personId
      }
    }
  }
`;

export const DELETE_MEDIA = gql`
  mutation DeleteMedia($id: ID!) {
    deleteMedia(id: $id)
  }
`;
