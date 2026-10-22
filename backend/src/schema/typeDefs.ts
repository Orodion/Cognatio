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
    # Start of the ancestor figures, the reports and the family tree page; null without one or when it is deleted
    homePerson: Person
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

  # On updateRelation a field that is not passed keeps its value, null clears it
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

  # The person of an event cannot be changed; a field that is not passed keeps its value, null clears it
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
    sizeBytes: Float!
    type: String!
    # True if the browser shows the file (image, PDF, video, audio, text); else it is offered as a download
    viewable: Boolean!
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

  # Optional upper limits of export/import files and backup files, in megabytes (settings page); null: no limit
  type SizeLimits {
    importMb: Int
    backupMb: Int
    minMb: Int!
    maxMb: Int!
  }

  # Archive, library, registry office, website … where sources are kept; shared by all family trees
  type Repository {
    id: ID!
    name: String!
    address: String
    url: String
    email: String
    phone: String
    note: String
    isDeleted: Boolean!
    deletedAt: String
    createdAt: String!
    updatedAt: String!
    # Sources kept there (without the recycle bin)
    sourceCount: Int!
  }

  input RepositoryInput {
    name: String!
    address: String
    url: String
    email: String
    phone: String
    note: String
  }

  # A document or work; shared by all family trees
  type Source {
    id: ID!
    # CHURCH_BOOK, CIVIL_REGISTER, CENSUS, NEWSPAPER, BOOK, LETTER, GRAVESTONE, WEBSITE, INTERVIEW, DOCUMENT, OTHER
    type: String!
    title: String!
    author: String
    publication: String
    abbreviation: String
    text: String
    repositoryId: ID
    # null while the archive is in the recycle bin
    repository: Repository
    callNumber: String
    note: String
    isDeleted: Boolean!
    deletedAt: String
    createdAt: String!
    updatedAt: String!
    # Scans of the whole source
    media: [Media!]!
    citations: [Citation!]!
    citationCount: Int!
    # Facts its citations support: in all family trees and in the active one
    linkCount: Int!
    treeLinkCount: Int!
  }

  input SourceInput {
    type: String
    title: String!
    author: String
    publication: String
    abbreviation: String
    text: String
    repositoryId: ID
    callNumber: String
    note: String
    # Linked scans; without a value the links stay unchanged
    mediaIds: [ID!]
  }

  # One entry of a source; supports any number of facts, also in several family trees
  type Citation {
    id: ID!
    sourceId: ID!
    source: Source!
    page: String
    date: String
    datePrecision: String
    text: String
    # 0 unreliable, 1 questionable, 2 secondary, 3 primary
    quality: Int
    note: String
    createdAt: String!
    updatedAt: String!
    # Scans of the page or entry
    media: [Media!]!
    # Number of supported facts in all family trees
    linkCount: Int!
    # The supported facts (without family trees in the recycle bin)
    links: [CitationLink!]!
  }

  input CitationInput {
    sourceId: ID!
    page: String
    date: String
    datePrecision: String
    text: String
    quality: Int
    note: String
    # Linked scans; without a value the links stay unchanged
    mediaIds: [ID!]
  }

  # A fact a citation supports: exactly one of person (with fact GENERAL, NAME, BIRTH, DEATH), event or relation
  input CitationTargetInput {
    personId: ID
    fact: String
    eventId: ID
    relationId: ID
  }

  # A supported fact, as shown with the citation
  type CitationLink {
    # PERSON, EVENT or RELATION
    kind: String!
    fact: String
    # The person of the fact, the owner of the event, the first person of the relation
    person: Person!
    eventId: ID
    eventTitle: String
    eventDate: String
    relationId: ID
    relationType: String
    otherPerson: Person
    familyTreeId: ID!
    familyTreeName: String!
  }

  # Part of the family tree the statistics look at: ALL, ANCESTORS or DESCENDANTS of personId (included), SURNAME (last
  # or birth name); bornFrom/bornTo narrow it to a range of years of birth (persons without one are left out then)
  input StatisticsScope {
    kind: String
    personId: ID
    surname: String
    bornFrom: Int
    bornTo: Int
  }

  # A figure that stands for persons names its filter; statisticsPersons(filter) lists them. Filters of the key figures:
  # all, gender:MALE|FEMALE|UNKNOWN, deceased, living, lifespan, withoutAge, probablyDeceased, family, unconnected
  type StatisticsBucket {
    from: Int!
    count: Int!
    filter: String!
  }

  type StatisticsRank {
    label: String!
    count: Int!
    filter: String!
  }

  type StatisticsGeneration {
    generation: Int!
    count: Int!
    earliestBirth: Int
    latestBirth: Int
    filter: String!
  }

  type StatisticsOldest {
    year: Int!
    person: Person!
  }

  type TreeStatistics {
    total: Int!
    living: Int!
    deceased: Int!
    male: Int!
    female: Int!
    unknownGender: Int!
    relations: Int!
    livingAges: [StatisticsBucket!]!
    deathAges: [StatisticsBucket!]!
    withoutAge: Int!
    probablyDeceased: Int!
    averageLifespan: Int
    oldestBirth: StatisticsOldest
    surnames: [StatisticsRank!]!
    distinctSurnames: Int!
    birthplaces: [StatisticsRank!]!
    distinctBirthplaces: Int!
    withBirthplace: Int!
    generations: [StatisticsGeneration!]!
    families: Int!
    unconnected: Int!
    completeness: StatisticsCompleteness!
    # Ancestors of the start person, from the whole family tree; null without persons
    ancestors: StatisticsAncestors
    timeline: StatisticsTimeline!
    lives: StatisticsLives!
    firstNames: StatisticsFirstNames!
    migration: StatisticsMigration!
    # Records of deceased persons only
    records: [StatisticsRecord!]!
  }

  # A first name with its persons; filter firstName:<male|female>:<century|all>:<name>
  type StatisticsName {
    label: String!
    count: Int!
    filter: String!
  }

  type StatisticsNameFashion {
    century: Int!
    male: [StatisticsName!]!
    female: [StatisticsName!]!
  }

  type StatisticsFirstNames {
    male: [StatisticsName!]!
    female: [StatisticsName!]!
    fashion: [StatisticsNameFashion!]!
  }

  # filter move:<from>|<to>
  type StatisticsMove {
    from: String!
    to: String!
    count: Int!
    filter: String!
  }

  # filter place:<place>; the years of the first and last fact there
  type StatisticsPlace {
    place: String!
    persons: Int!
    firstYear: Int
    lastYear: Int
    filter: String!
  }

  # stayed/moved: deceased persons with both places (filters stayed:yes, stayed:no)
  type StatisticsMigration {
    stayed: Int!
    moved: Int!
    moves: [StatisticsMove!]!
    places: [StatisticsPlace!]!
    morePlaces: Int!
  }

  # kind: longestLife, longestMarriage, mostChildren, mostCommonChildren, mostPartners, mostDescendants, youngestMother,
  # oldestMother, youngestFather, oldestFather, largestAgeGap; value in years or persons; ties: further holders
  type StatisticsRecord {
    kind: String!
    value: Int!
    persons: [Person!]!
    ties: Int!
    possibleError: Boolean!
  }

  # Births, deaths and weddings per decade (decade: its first year); filters bornDecade:<decade>, diedDecade:<decade>,
  # marriedDecade:<decade> (the partners), noBirthYear, noDeathYear
  type StatisticsDecade {
    decade: Int!
    births: Int!
    deaths: Int!
    weddings: Int!
  }

  type StatisticsTimeline {
    decades: [StatisticsDecade!]!
    withoutBirthYear: Int!
    withoutDeathYear: Int!
  }

  # Mean age in years (null below 5 persons) and the persons it is based on; filter lives:<measure>:<century|all>:<gender>
  type StatisticsLifeCell {
    mean: Int
    count: Int!
    filter: String!
  }

  # century: first year of the century of birth; null: all centuries
  type StatisticsLifeRow {
    century: Int
    male: StatisticsLifeCell!
    female: StatisticsLifeCell!
    all: StatisticsLifeCell!
  }

  # measure: lifespan, adultLifespan (of those who reached 15), firstWedding, firstChild (age at the birth of the first child)
  type StatisticsLifeTable {
    measure: String!
    rows: [StatisticsLifeRow!]!
  }

  # key: number of children (10: ten and more) or manOlder, sameAge, womanOlder; filters children:<n>, ageGap:<key>
  type StatisticsCountRow {
    key: String!
    count: Int!
    filter: String!
  }

  type StatisticsLives {
    tables: [StatisticsLifeTable!]!
    children: [StatisticsCountRow!]!
    meanChildren: Float
    ageGaps: [StatisticsCountRow!]!
    # Mean years the man is older than the woman (negative: the woman)
    meanAgeGap: Float
  }

  # Share of a fact (birthDate, birthPlace, deathDate, deathPlace – these two of the deceased –, father, mother, partner –
  # of the deceased not known to have died under 18 –, photo, source); filter: missing:<fact>, the persons without it
  type StatisticsCompletenessRow {
    fact: String!
    total: Int!
    present: Int!
    missing: Int!
    filter: String!
  }

  type StatisticsCompleteness {
    rows: [StatisticsCompletenessRow!]!
    # Mean share of the rows that apply to anybody, 0–1
    score: Float
  }

  # A generation of ancestors (1 = the start person); found: places of the pedigree filled, distinct: different persons
  # among them; openEnds: persons whose father or mother is missing. Filters ancestors:<person>:<generation> and
  # openEnds:<person>:<generation>
  type StatisticsAncestorGeneration {
    generation: Int!
    possible: Float!
    found: Int!
    distinct: Int!
    openEnds: Int!
    earliestBirth: Int
    latestBirth: Int
    filter: String!
    openEndsFilter: String!
  }

  type StatisticsAncestors {
    person: Person!
    isHomePerson: Boolean!
    hasHomePerson: Boolean!
    generations: [StatisticsAncestorGeneration!]!
    # From the parents on: places filled and different persons (the difference is the pedigree collapse)
    found: Int!
    distinct: Int!
  }

  # Sources in the statistics of a family tree
  type SourceStatistics {
    persons: Int!
    # Persons with at least one citation (of the person, its events or relations)
    citedPersons: Int!
    citations: Int!
    sources: Int!
    # By the number of supported facts in the family tree
    topSources: [CitedSource!]!
  }

  type CitedSource {
    id: ID!
    title: String!
    abbreviation: String
    type: String!
    links: Int!
  }

  # Everything a report sheet shows of a person
  type ReportPerson {
    id: ID!
    person: Person!
    events: [Event!]!
    notes: [Note!]!
    media: [Media!]!
    citations: [FactCitation!]!
  }

  # A citation of a person, its events or its relations
  type FactCitation {
    kind: String!
    fact: String
    eventId: ID
    relationId: ID
    citation: Citation!
  }

  # AI assistants (MCP): the permission of one area of the data and the levels the area offers (off, read, write, delete)
  type McpPermission {
    area: String!
    level: String!
    levels: [String!]!
  }

  # Settings section "MCP" (never readable or changeable through MCP itself)
  type McpSettings {
    enabled: Boolean!
    # Address an assistant connects to; null while the port is unknown
    address: String
    # The desktop app had to take another port than at its last start: clients need the new address
    portChanged: Boolean!
    permissions: [McpPermission!]!
    # Family trees the assistant does not see
    excludedTrees: [ID!]!
  }

  # A new token, shown once; only its hash is kept
  type McpToken {
    token: String!
    settings: McpSettings!
  }

  # A change an assistant made (page "Activity")
  type McpActivity {
    seq: Int!
    at: String!
    tool: String!
    client: String!
    tree: String
    target: String
    ok: Boolean!
    reason: String
  }

  type McpActivityPage {
    entries: [McpActivity!]!
    # Number of the newest entry: the next request asks for the ones after it
    last: Int!
  }

  input McpPermissionInput {
    area: String!
    level: String!
  }

  # A possible error: facts that are allowed but rarely true (code: see lib/plausibility/checks.ts)
  type PlausibilityIssue {
    # Stays the same as long as the issue exists
    key: String!
    code: String!
    # The persons concerned, the one the sentence is about first
    persons: [Person!]!
    relationId: ID
    eventId: ID
    role: String
    gender: String
    kinship: String
    age: Int
    # The dates leave a range of ages: age is the highest possible (PARENT_TOO_YOUNG) or the lowest
    inexact: Boolean
    count: Int
    event: String
    # Marked as right by the user
    checked: Boolean!
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
    # Places already used in the family tree (birth, death, life events), most used first – suggestions while typing
    places: [String!]!
    # Persons with life events, notes, media and citations for the reports (at most 500 per request)
    reportPersons(ids: [ID!]!): [ReportPerson!]!

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

    # Sources and citations (one library for all family trees)
    repositories: [Repository!]!
    # TREE: the sources the active family tree uses and the unused ones; ALL: all of them
    sources(scope: String = "TREE"): [Source!]!
    source(id: ID!): Source
    deletedSources: [Source!]! # recycle bin
    deletedRepositories: [Repository!]! # recycle bin
    personCitations(personId: ID!): [FactCitation!]!
    # Sources whose fields, archive or citations contain all words (at most 20)
    searchSources(query: String!): [Source!]!
    sourceStatistics: SourceStatistics!
    # Figures of the statistics for a scope; language: the language of the user, for the order of equally frequent names
    # ancestorsOf: start of the ancestor figures (default: the person of an ancestor or descendant scope, the home person,
    # else the person with the most ancestors)
    treeStatistics(scope: StatisticsScope, language: String, ancestorsOf: ID): TreeStatistics!
    # The persons behind a figure of the statistics
    statisticsPersons(filter: String!, scope: StatisticsScope): [Person!]!

    # Previous imports, newest first
    importHistory(limit: Int = 20): [ImportRecord!]!
    systemInfo: SystemInfo!
    sizeLimits: SizeLimits!

    # Possible errors of the active family tree (the page "Possible errors")
    plausibilityIssues: [PlausibilityIssue!]!
    # How many of them are not marked as right (the number in the sidebar)
    openPlausibilityIssues: Int!

    # AI assistants (MCP)
    mcpSettings: McpSettings!
    mcpActivity(after: Int = 0): McpActivityPage!
  }

  type Mutation {
    # System: log level of the server (debug, info, warn, error) – applies until the restart
    setLogLevel(level: String!): String!
    # System: optional size limits in megabytes (null: none); applies at once and is kept in settings.json
    setSizeLimits(importMb: Int, backupMb: Int): SizeLimits!

    # AI assistants (MCP): switching on creates a token and sets every area to "read"
    enableMcp: McpToken!
    disableMcp: McpSettings!
    renewMcpToken: McpToken!
    setMcpPermissions(permissions: [McpPermissionInput!]!): McpSettings!
    setMcpExcludedTrees(ids: [ID!]!): McpSettings!

    # Marks a possible error of the active family tree as right (checked) or shows it again
    checkPlausibilityIssue(key: String!, checked: Boolean!): Boolean!

    # Family trees
    createFamilyTree(data: FamilyTreeInput!): FamilyTree!
    updateFamilyTree(id: ID!, data: FamilyTreeInput!): FamilyTree!
    # Home person of the active family tree; null removes it
    setHomePerson(personId: ID): FamilyTree!
    deleteFamilyTree(id: ID!): Boolean! # Into the recycle bin (also the last one)
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
    # A relation that looks wrong is refused (IMPLAUSIBLE, with its issues) unless confirmed is true
    createRelation(data: RelationInput!, confirmed: Boolean): Relation!
    updateRelation(id: ID!, data: RelationInput!, confirmed: Boolean): Relation!
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

    # Archives, sources and citations
    createRepository(data: RepositoryInput!): Repository!
    updateRepository(id: ID!, data: RepositoryInput!): Repository!
    deleteRepository(id: ID!): Boolean! # Into the recycle bin
    restoreRepository(id: ID!): Repository!
    hardDeleteRepository(id: ID!): Boolean! # Only from the recycle bin
    createSource(data: SourceInput!): Source!
    updateSource(id: ID!, data: SourceInput!): Source!
    deleteSource(id: ID!): Boolean! # Into the recycle bin together with its citations
    restoreSource(id: ID!): Source!
    hardDeleteSource(id: ID!): Boolean! # Only from the recycle bin
    # targets: facts of the active family tree the new citation supports right away
    createCitation(data: CitationInput!, targets: [CitationTargetInput!]): Citation!
    updateCitation(id: ID!, data: CitationInput!): Citation!
    deleteCitation(id: ID!): Boolean! # For good, with its links in all family trees
    linkCitation(citationId: ID!, targets: [CitationTargetInput!]!): Citation!
    unlinkCitation(citationId: ID!, target: CitationTargetInput!): Citation!
  }
`;
