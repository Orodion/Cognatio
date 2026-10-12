import { gql } from '@apollo/client';

export const GET_NOTES = gql`
  query GetNotes($personId: ID!) {
    getNotes(personId: $personId) {
      id
      personId
      text
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_NOTE = gql`
  mutation CreateNote($data: NoteInput!) {
    createNote(data: $data) {
      id
      personId
      text
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_NOTE = gql`
  mutation UpdateNote($id: ID!, $data: UpdateNoteInput!) {
    updateNote(id: $id, data: $data) {
      id
      personId
      text
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_NOTE = gql`
  mutation DeleteNote($id: ID!) {
    deleteNote(id: $id)
  }
`;
