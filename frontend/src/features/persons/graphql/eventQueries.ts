import { gql } from '@apollo/client';

// Linked files of an event; the owner is named for media of other persons
const EVENT_MEDIA = gql`
  fragment EventMediaFields on Media {
    id
    personId
    fileName
    originalFileName
    mimeType
    sizeBytes
    type
    createdAt
    updatedAt
    person {
      id
      firstName
      lastName
    }
  }
`;

export const GET_EVENTS = gql`
  query GetEvents($personId: ID!) {
    getEvents(personId: $personId) {
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
      media {
        ...EventMediaFields
      }
    }
  }
  ${EVENT_MEDIA}
`;

export const CREATE_EVENT = gql`
  mutation CreateEvent($data: EventInput!) {
    createEvent(data: $data) {
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
      media {
        ...EventMediaFields
      }
    }
  }
  ${EVENT_MEDIA}
`;

export const UPDATE_EVENT = gql`
  mutation UpdateEvent($id: ID!, $data: UpdateEventInput!) {
    updateEvent(id: $id, data: $data) {
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
      media {
        ...EventMediaFields
      }
    }
  }
  ${EVENT_MEDIA}
`;

export const DELETE_EVENT = gql`
  mutation DeleteEvent($id: ID!) {
    deleteEvent(id: $id)
  }
`;
