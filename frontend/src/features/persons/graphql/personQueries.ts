import { gql } from '@apollo/client';

export const PERSON_FIELDS = gql`
  fragment PersonFields on Person {
    id
    firstName
    lastName
    middleName
    birthName
    title
    nickname
    birthDate
    birthDatePrecision
    birthPlace
    gender
    deathDate
    deathDatePrecision
    deathPlace
    address
    phone
    email
    occupation
    hobbies
    maritalStatus
    nationality
    languages
    profilePictureId
    profilePictureUrl
    isDeleted
    deletedAt
    createdAt
    updatedAt
  }
`;

export const GET_PERSONS = gql`
  ${PERSON_FIELDS}
  query GetPersons($includeDeleted: Boolean) {
    getPersons(includeDeleted: $includeDeleted) {
      ...PersonFields
    }
  }
`;

export const GET_PERSON = gql`
  ${PERSON_FIELDS}
  query GetPerson($id: ID!) {
    getPerson(id: $id) {
      ...PersonFields
    }
  }
`;

/** Search across fields and phonetic, sorted by relevance */
export const SEARCH = gql`
  ${PERSON_FIELDS}
  query Search($query: String!, $language: String) {
    search(query: $query, language: $language) {
      matchedIn
      person {
        ...PersonFields
      }
    }
  }
`;

/** Possible duplicates when creating a person */
export const SIMILAR_PERSONS = gql`
  query SimilarPersons($firstName: String!, $lastName: String, $birthName: String, $birthDate: String) {
    similarPersons(firstName: $firstName, lastName: $lastName, birthName: $birthName, birthDate: $birthDate) {
      id
      title
      firstName
      middleName
      lastName
      birthName
      birthDate
      birthPlace
      deathDate
    }
  }
`;

export const DELETE_PERSON = gql`
  mutation DeletePerson($id: ID!) {
    deletePerson(id: $id)
  }
`;

export const CREATE_PERSON = gql`
  ${PERSON_FIELDS}
  mutation CreatePerson($data: PersonInput!) {
    createPerson(data: $data) {
      ...PersonFields
    }
  }
`;

export const UPDATE_PERSON = gql`
  ${PERSON_FIELDS}
  mutation UpdatePerson($id: ID!, $data: PersonInput!) {
    updatePerson(id: $id, data: $data) {
      ...PersonFields
    }
  }
`;

export const RESTORE_PERSON = gql`
  ${PERSON_FIELDS}
  mutation RestorePerson($id: ID!) {
    restorePerson(id: $id) {
      ...PersonFields
    }
  }
`;

export const GET_DELETED_PERSONS = gql`
  ${PERSON_FIELDS}
  query GetDeletedPersons {
    getDeletedPersons {
      ...PersonFields
    }
  }
`;

export const HARD_DELETE_PERSON = gql`
  mutation HardDeletePerson($id: ID!) {
    hardDeletePerson(id: $id)
  }
`;

export const SET_PROFILE_PICTURE = gql`
  ${PERSON_FIELDS}
  mutation SetProfilePicture($personId: ID!, $mediaId: ID) {
    setProfilePicture(personId: $personId, mediaId: $mediaId) {
      ...PersonFields
    }
  }
`;

/** Places already used in the family tree, most used first – suggestions in the place fields */
export const PLACES = gql`
  query Places {
    places
  }
`;
