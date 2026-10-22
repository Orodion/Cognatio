import { gql, type ApolloCache } from '@apollo/client';

const MEDIA_FIELDS = gql`
  fragment ScanFields on Media {
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
  }
`;

export const REPOSITORY_FIELDS = gql`
  fragment RepositoryFields on Repository {
    id
    name
    address
    url
    email
    phone
    note
    isDeleted
    deletedAt
    createdAt
    updatedAt
    sourceCount
  }
`;

export const SOURCE_FIELDS = gql`
  ${MEDIA_FIELDS}
  fragment SourceFields on Source {
    id
    type
    title
    author
    publication
    abbreviation
    text
    repositoryId
    repository {
      id
      name
    }
    callNumber
    note
    isDeleted
    deletedAt
    createdAt
    updatedAt
    citationCount
    linkCount
    treeLinkCount
    media {
      ...ScanFields
    }
  }
`;

const CITATION_FIELDS = gql`
  ${MEDIA_FIELDS}
  fragment CitationFields on Citation {
    id
    sourceId
    page
    date
    datePrecision
    text
    quality
    note
    createdAt
    updatedAt
    linkCount
    media {
      ...ScanFields
    }
  }
`;

const PERSON_OF_LINK = gql`
  fragment LinkedPersonFields on Person {
    id
    firstName
    lastName
    gender
    birthDate
    deathDate
    isDeleted
  }
`;

/** The facts a citation supports (in all family trees) */
const CITATION_LINKS = gql`
  ${PERSON_OF_LINK}
  fragment CitationLinkFields on CitationLink {
    kind
    fact
    person {
      ...LinkedPersonFields
    }
    eventId
    eventTitle
    eventDate
    relationId
    relationType
    otherPerson {
      ...LinkedPersonFields
    }
    familyTreeId
    familyTreeName
  }
`;

export const GET_SOURCES = gql`
  ${SOURCE_FIELDS}
  query GetSources($scope: String) {
    sources(scope: $scope) {
      ...SourceFields
    }
  }
`;

export const GET_SOURCE = gql`
  ${SOURCE_FIELDS}
  ${CITATION_FIELDS}
  ${CITATION_LINKS}
  query GetSource($id: ID!) {
    source(id: $id) {
      ...SourceFields
      citations {
        ...CitationFields
        links {
          ...CitationLinkFields
        }
      }
    }
  }
`;

/** The citations of a source, to choose one of them (without the supported facts) */
export const GET_SOURCE_CITATIONS = gql`
  ${CITATION_FIELDS}
  query GetSourceCitations($id: ID!) {
    source(id: $id) {
      id
      citations {
        ...CitationFields
      }
    }
  }
`;

export const GET_REPOSITORIES = gql`
  ${REPOSITORY_FIELDS}
  query GetRepositories {
    repositories {
      ...RepositoryFields
    }
  }
`;

export const GET_DELETED_SOURCES = gql`
  ${SOURCE_FIELDS}
  query GetDeletedSources {
    deletedSources {
      ...SourceFields
    }
  }
`;

export const GET_DELETED_REPOSITORIES = gql`
  ${REPOSITORY_FIELDS}
  query GetDeletedRepositories {
    deletedRepositories {
      ...RepositoryFields
    }
  }
`;

export const GET_PERSON_CITATIONS = gql`
  ${CITATION_FIELDS}
  ${CITATION_LINKS}
  query GetPersonCitations($personId: ID!) {
    personCitations(personId: $personId) {
      kind
      fact
      eventId
      relationId
      citation {
        ...CitationFields
        links {
          ...CitationLinkFields
        }
        source {
          id
          title
          type
          abbreviation
          repository {
            id
            name
          }
        }
      }
    }
  }
`;

export const CREATE_SOURCE = gql`
  ${SOURCE_FIELDS}
  mutation CreateSource($data: SourceInput!) {
    createSource(data: $data) {
      ...SourceFields
    }
  }
`;

export const UPDATE_SOURCE = gql`
  ${SOURCE_FIELDS}
  mutation UpdateSource($id: ID!, $data: SourceInput!) {
    updateSource(id: $id, data: $data) {
      ...SourceFields
    }
  }
`;

export const DELETE_SOURCE = gql`
  mutation DeleteSource($id: ID!) {
    deleteSource(id: $id)
  }
`;

export const RESTORE_SOURCE = gql`
  mutation RestoreSource($id: ID!) {
    restoreSource(id: $id) {
      id
    }
  }
`;

export const HARD_DELETE_SOURCE = gql`
  mutation HardDeleteSource($id: ID!) {
    hardDeleteSource(id: $id)
  }
`;

export const CREATE_REPOSITORY = gql`
  ${REPOSITORY_FIELDS}
  mutation CreateRepository($data: RepositoryInput!) {
    createRepository(data: $data) {
      ...RepositoryFields
    }
  }
`;

export const UPDATE_REPOSITORY = gql`
  ${REPOSITORY_FIELDS}
  mutation UpdateRepository($id: ID!, $data: RepositoryInput!) {
    updateRepository(id: $id, data: $data) {
      ...RepositoryFields
    }
  }
`;

export const DELETE_REPOSITORY = gql`
  mutation DeleteRepository($id: ID!) {
    deleteRepository(id: $id)
  }
`;

export const RESTORE_REPOSITORY = gql`
  mutation RestoreRepository($id: ID!) {
    restoreRepository(id: $id) {
      id
    }
  }
`;

export const HARD_DELETE_REPOSITORY = gql`
  mutation HardDeleteRepository($id: ID!) {
    hardDeleteRepository(id: $id)
  }
`;

export const CREATE_CITATION = gql`
  ${CITATION_FIELDS}
  mutation CreateCitation($data: CitationInput!, $targets: [CitationTargetInput!]) {
    createCitation(data: $data, targets: $targets) {
      ...CitationFields
    }
  }
`;

export const UPDATE_CITATION = gql`
  ${CITATION_FIELDS}
  mutation UpdateCitation($id: ID!, $data: CitationInput!) {
    updateCitation(id: $id, data: $data) {
      ...CitationFields
    }
  }
`;

export const DELETE_CITATION = gql`
  mutation DeleteCitation($id: ID!) {
    deleteCitation(id: $id)
  }
`;

export const LINK_CITATION = gql`
  ${CITATION_FIELDS}
  mutation LinkCitation($citationId: ID!, $targets: [CitationTargetInput!]!) {
    linkCitation(citationId: $citationId, targets: $targets) {
      ...CitationFields
    }
  }
`;

export const UNLINK_CITATION = gql`
  ${CITATION_FIELDS}
  mutation UnlinkCitation($citationId: ID!, $target: CitationTargetInput!) {
    unlinkCitation(citationId: $citationId, target: $target) {
      ...CitationFields
    }
  }
`;

/** Fields of the cache with sources, archives or citations (all arguments) */
const LIBRARY_FIELDS = ['sources', 'source', 'deletedSources', 'repositories', 'deletedRepositories', 'personCitations', 'searchSources', 'sourceStatistics'];

/**
 * After a change of the library: drops what the cache knows about sources, archives and citations. The lists and marks
 * on the page load again by themselves; pages not open load fresh when they are opened (no request for them now).
 */
export const LIBRARY_CHANGED = {
  update: (cache: ApolloCache<unknown>) => {
    for (const fieldName of LIBRARY_FIELDS) {
      cache.evict({ id: 'ROOT_QUERY', fieldName });
    }
    cache.gc();
  },
};

export const SEARCH_SOURCES = gql`
  ${SOURCE_FIELDS}
  query SearchSources($query: String!) {
    searchSources(query: $query) {
      ...SourceFields
    }
  }
`;

export const GET_SOURCE_STATISTICS = gql`
  query GetSourceStatistics {
    sourceStatistics {
      persons
      citedPersons
      citations
      sources
      topSources {
        id
        title
        abbreviation
        type
        links
      }
    }
  }
`;
