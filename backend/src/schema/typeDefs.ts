export const typeDefs = `#graphql
  type ApiError {
    code: String!
    message: String!
  }

  # Separately managed set of data; all other queries work in the active family tree (header X-Family-Tree-Id)
  type FamilyTree {
    id: ID!
    name: String!
    description: String
    # Persons without the recycle bin
    personCount: Int!
    isDeleted: Boolean!
    deletedAt: String
    createdAt: String!
    updatedAt: String!
  }

  input FamilyTreeInput {
    name: String!
    description: String
  }

  type Person {
    id: ID!
    firstName: String!
    lastName: String
    middleName: String
    birthName: String
    title: String
    nickname: String
    birthDate: String
    birthDatePrecision: String
    birthPlace: String
    gender: String!
    deathDate: String
    deathDatePrecision: String
    deathPlace: String
    address: String
    phone: String
    email: String
    occupation: String
    hobbies: String
    maritalStatus: String
    nationality: String
    languages: [String!]!
    profilePictureId: String
    profilePictureUrl: String
    isDeleted: Boolean!
    deletedAt: String
    createdAt: String!
    updatedAt: String!
  }

  input RelationInput {
    personAId: String!
    personBId: String!
    type: String!
    label: String
    active: Boolean
    note: String
    startDate: String
    endDate: String
  }

  input PersonInput {
    firstName: String!
    lastName: String
    middleName: String
    birthName: String
    title: String
    nickname: String
    birthDate: String
    birthDatePrecision: String
    birthPlace: String
    gender: String
    deathDate: String
    deathDatePrecision: String
    deathPlace: String
    address: String
    phone: String
    email: String
    occupation: String
    hobbies: String
    maritalStatus: String
    nationality: String
    languages: [String!]
    profilePictureId: String
  }

  type Relation {
    id: ID!
    personAId: String!
    personBId: String!
    type: String!
    label: String
    active: Boolean!
    note: String
    startDate: String
    endDate: String
    createdAt: String!
    updatedAt: String!
  }

  # Relation from the perspective of a given person
  type PersonRelationDetail {
    id: ID!
    type: String!
    role: String!
    label: String
    note: String
    active: Boolean!
    startDate: String
    endDate: String
    otherPerson: Person!
    createdAt: String!
  }

  type Event {
    id: ID!
    personId: String!
    date: String
    datePrecision: String
    title: String!
    category: String!
    description: String
    place: String
    sortOrder: Int
    createdAt: String!
    updatedAt: String!
    person: Person
    # Linked files – also media of other persons (e.g. a group photo)
    media: [Media!]!
  }

  input EventInput {
    personId: String!
    date: String
    datePrecision: String
    title: String!
    category: String!
    description: String
    place: String
    sortOrder: Int
    # Linked media; without a value the links stay unchanged
    mediaIds: [ID!]
  }

  # The person of an event cannot be changed
  input UpdateEventInput {
    date: String
    datePrecision: String
    title: String!
    category: String!
    description: String
    place: String
    sortOrder: Int
    # Linked media; without a value the links stay unchanged
    mediaIds: [ID!]
  }

  type Note {
    id: ID!
    personId: ID!
    text: String!
    createdAt: String!
    updatedAt: String!
    person: Person
  }

  type Media {
    id: ID!
    # Person the file belongs to
    personId: ID
    fileName: String!
    originalFileName: String!
    mimeType: String!
    sizeBytes: Int!
    type: String!
    createdAt: String!
    updatedAt: String!
    person: Person
    # Events the file is linked with
    events: [Event!]!
  }

  input NoteInput {
    personId: String!
    text: String!
  }

  # The person of a note cannot be changed
  input UpdateNoteInput {
    text: String!
  }

  # Where a person was found in a search
  enum SearchMatch {
    NAME
    PHONETIC
    DETAILS
    EVENT
    NOTE
  }

  # Entry of the import history
  type ImportRecord {
    id: ID!
    importedAt: String!
    fileName: String!
    kind: String!
    source: String
    exportedAt: String
    strategy: String!
    createdPersons: Int!
    updatedPersons: Int!
    removedPersons: Int!
    recognizedPersons: Int!
    createdRelations: Int!
    createdEvents: Int!
    createdNotes: Int!
    createdMedia: Int!
    missingFiles: Int!
  }

  # State of the application (settings page)
  type SystemInfo {
    version: String!
    database: String!
    # Numbers across all family trees
    trees: Int!
    persons: Int!
    deletedPersons: Int!
    media: Int!
    mediaBytes: Float!
    lastImportAt: String
    lastBackupAt: String
    backupCount: Int!
    backupDir: String!
    logLevel: String!
  }

  # Size limits of export/import files and backup files, in megabytes (settings page)
  type SizeLimits {
    importMb: Int!
    backupMb: Int!
    defaultMb: Int!
    minMb: Int!
    maxMb: Int!
  }

  type SearchResult {
    person: Person!
    matchedIn: [SearchMatch!]!
  }

  type Query {
    healthCheck: String!

    # Family trees
    familyTrees: [FamilyTree!]!
    deletedFamilyTrees: [FamilyTree!]! # recycle bin
    activeFamilyTree: FamilyTree!
    # Family tree of a person – also outside the active one (for links to persons of other family trees)
    locatePerson(id: ID!): ID
    
    # Persons
    getPersons(includeDeleted: Boolean = false): [Person!]!
    getDeletedPersons: [Person!]! # recycle bin
    getPerson(id: ID!): Person
    # Search across fields and phonetic, sorted by relevance
    # language: the language of the user (e.g. "de"); the order of equally relevant hits follows its alphabet
    search(query: String!, language: String): [SearchResult!]!
    # Possible duplicates when creating a person
    similarPersons(firstName: String!, lastName: String, birthName: String, birthDate: String, excludeId: ID): [Person!]!

    # Relations
    getRelations(includeInactive: Boolean = false): [Relation!]!
    getPersonRelations(personId: ID!): [PersonRelationDetail!]!

    # Events (life events)
    getEvents(personId: ID!): [Event!]!

    # Notes
    getNotes(personId: ID!): [Note!]!

    # Media
    getPersonMedia(personId: ID!): [Media!]!
    # Media of other persons linked with events of this person
    getLinkedMedia(personId: ID!): [Media!]!

    # Previous imports, newest first
    importHistory(limit: Int = 20): [ImportRecord!]!
    systemInfo: SystemInfo!
    sizeLimits: SizeLimits!
  }

  type Mutation {
    # System: log level of the server (debug, info, warn, error) – applies until the restart
    setLogLevel(level: String!): String!
    # System: size limits in megabytes; applies at once and is kept in settings.json
    setSizeLimits(importMb: Int!, backupMb: Int!): SizeLimits!

    # Family trees
    createFamilyTree(data: FamilyTreeInput!): FamilyTree!
    updateFamilyTree(id: ID!, data: FamilyTreeInput!): FamilyTree!
    deleteFamilyTree(id: ID!): Boolean! # Into the recycle bin (not the last one)
    restoreFamilyTree(id: ID!): FamilyTree!
    hardDeleteFamilyTree(id: ID!): Boolean! # Permanently with all data (only from the recycle bin)

    # Persons
    createPerson(data: PersonInput!): Person!
    updatePerson(id: ID!, data: PersonInput!): Person!
    deletePerson(id: ID!): Boolean! # Soft-Delete
    restorePerson(id: ID!): Person! # Undo Soft-Delete
    hardDeletePerson(id: ID!): Boolean! # Real deletion (only from the recycle bin)
    setProfilePicture(personId: ID!, mediaId: ID): Person! # mediaId = null removes the profile picture

    # Relations
    createRelation(data: RelationInput!): Relation!
    updateRelation(id: ID!, data: RelationInput!): Relation!
    deleteRelation(id: ID!): Boolean! # Deactivates the relation
    restoreRelation(id: ID!): Relation!
    hardDeleteRelation(id: ID!): Boolean! # Real deletion

    # Events (life events)
    createEvent(data: EventInput!): Event!
    updateEvent(id: ID!, data: UpdateEventInput!): Event!
    deleteEvent(id: ID!): Boolean!

    # Notes
    createNote(data: NoteInput!): Note!
    updateNote(id: ID!, data: UpdateNoteInput!): Note!
    deleteNote(id: ID!): Boolean!

    # Media
    deleteMedia(id: ID!): Boolean!
  }
`;
