# Concept: sources and citations

Status: **built** (14.10.2026, phases 1–3; decisions of the project owner in chapter 9). Code: `backend/src/resolvers/sourceResolvers.ts`, `backend/src/lib/transfer/library.ts`, frontend `features/sources/`. Goal of the project owner: every statement in a family tree
can say **where it comes from** – church book, civil register, census, letter, gravestone, website, interview – the way
genealogy programs and GEDCOM do it, and a GEDCOM file of another program keeps its sources when it passes through the
app.

## 1. Starting point (1.0.x)

- The data model has **no sources**. Facts are person fields (birth, death, names), events, relations, notes and media.
- **GEDCOM import:** a `SOUR` directly below `INDI` becomes a note with the text `Quelle: <title>` (German also in an
  English UI, `gedcom.ts`). A `SOUR` below an event (`BIRT`, `MARR`, `CENS` …), below a `NAME`, a `FAM` or a `FAMC` is
  **dropped without a trace**; `REPO` records are dropped; page numbers (`PAGE`), transcriptions (`DATA.TEXT`) and
  quality (`QUAY`) are lost.
- **GEDCOM export:** writes no sources; `1 SOUR Cognatio` in the header is the name of the program, not a source.
- Consequence: a tree from Gramps, Ahnenblatt, Ancestry or MyHeritage loses its research proof on the way in, and the
  app has no way to record it.

## 2. Principles

- **Two levels, as everywhere in genealogy:** a **source** is the document or work (e.g. "Kirchenbuch St. Martin,
  Taufen 1820–1850"), a **citation** is one entry in it (page, transcription, quality, scan). One source has many
  citations, and **one citation supports many facts** – a marriage entry names the groom, the bride, their parents and
  the witnesses and proves the wedding and the marriage (decision 9.8, as in Gramps).
- **Close to GEDCOM** (5.5.1 and 7.0), so import and export lose nothing: source record `SOUR` (TITL, AUTH, PUBL, ABBR,
  TEXT, REPO with CALN, OBJE, NOTE), citation (PAGE, DATA with DATE and TEXT, QUAY, OBJE, NOTE), archive record `REPO`.
- **One library for all family trees** (decision 9.7): archives, sources, citations and their scans belong to no
  family tree. The same registry office or church book is entered once, and a citation can support facts of persons in
  several family trees. Only the links point into a family tree – through the person, the event or the relation.
- **Nothing is required:** the app stays usable without sources; citing is offered where facts are entered.
- **No data loss anywhere:** export, backup, restore and the import strategies carry sources from the first version
  on – a release that can record sources but drops them on export or backup is not allowed.

## 3. Data model

```prisma
/// Archive, library, registry office, website … where sources are kept (GEDCOM REPO); shared by all family trees
model Repository {
  id        String    @id @default(uuid())
  name      String
  address   String?
  url       String?
  email     String?
  phone     String?
  note      String?
  isDeleted Boolean   @default(false)
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  sources   Source[]
}

/// A document or work (GEDCOM SOUR record); shared by all family trees
model Source {
  id           String    @id @default(uuid())
  type         String    // CHURCH_BOOK, CIVIL_REGISTER, CENSUS, NEWSPAPER, BOOK, LETTER, GRAVESTONE, WEBSITE, INTERVIEW, DOCUMENT, OTHER
  title        String    // TITL
  author       String?   // AUTH
  publication  String?   // PUBL: publisher, place, year – or the URL of a website
  abbreviation String?   // ABBR: short title for lists
  text         String?   // TEXT: transcription of the whole source
  repositoryId String?   // REPO
  callNumber   String?   // REPO.CALN: shelf mark, film number, record number
  note         String?
  isDeleted    Boolean   @default(false)
  deletedAt    DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  citations    Citation[]
  media        SourceMedia[]
}

/// One entry of a source (GEDCOM source citation), used by any number of facts
model Citation {
  id            String   @id @default(uuid())
  sourceId      String
  page          String?  // PAGE: page, entry number, folio, URL of the single record
  date          String?  // DATA.DATE: date of the entry, flexible like all dates of the app
  datePrecision String?
  text          String?  // DATA.TEXT: transcription of the entry
  quality       Int?     // QUAY 0–3, optional (decision 9.2)
  note          String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  media         CitationMedia[]
  persons       PersonCitation[]
  events        EventCitation[]
  relations     RelationCitation[]
}

/// The facts a citation supports – one link table per kind of target, each with a composite key
model PersonCitation {
  personId   String
  citationId String
  fact       String   @default("GENERAL") // GENERAL, NAME, BIRTH, DEATH (birth and death are fields of the person, not events)
  createdAt  DateTime @default(now())
  @@id([personId, citationId, fact])
}
model EventCitation {
  eventId    String
  citationId String
  createdAt  DateTime @default(now())
  @@id([eventId, citationId])
}
model RelationCitation {
  relationId String
  citationId String
  createdAt  DateTime @default(now())
  @@id([relationId, citationId])
}
```

- `SourceMedia` and `CitationMedia` are link tables like `EventMedia`: scans hang at the source (the whole book, the
  title page, the gravestone) and at the citation (the single page or entry), one file can be linked at several places
  (decision 9.4). Such a medium belongs to the library: `Media.familyTreeId` becomes optional and stays empty
  together with `Media.personId`; every place that reads the media of a family tree keeps filtering by it.
- `type` is one of the fixed list in the comment and only serves for the symbol and the filter; all types have the
  same fields (decision 9.3).
- **Three link tables instead of one** (changed while building): each has a real foreign key with `ON DELETE CASCADE`
  to its target and a composite primary key, so a fact is linked at most once with a citation – no check constraint and
  no raw SQL (raw SQL is only allowed in `lib/search/`). Indexes on all foreign keys, as for the other tables.
- A changed link counts as a change of its fact (`updatedAt` of the person, event or relation), as a new scan of an
  event does: merging an import ("newer wins") then sees it.
- **Family trees:** a page of a family tree sees a citation only through the links of its own persons, events and
  relations. Which sources a family tree uses follows from these links; nothing is stored twice.
- **Deleting:**
  - An event, a relation or a person that is deleted for good takes **its links** with it (cascade); the citation and
    the source stay, also when nothing uses them any more.
  - Removing a citation from a fact removes only that link. A citation without links stays in the source ("not used")
    and can be deleted there.
  - A source goes into the recycle bin **together with its citations** (decision 9.6): they disappear from the persons
    in all family trees and come back with a restore; deleting for good only from the recycle bin; the app asks first
    and names the number of citations and of the family trees concerned.
  - An archive in the recycle bin keeps the link of its sources: they show no archive until it is restored.
  - A family tree deleted for good takes the links of its persons with it, never a source or a citation.
- Migration plus an **upgrade fixture** (`prisma/upgrade-fixtures`), so the upgrade matrix checks the way from 1.0.0.

## 4. User interface

- **Sidebar "Sources"** (new page `features/sources/`): first the sources the open family tree uses; a switch "All
  family trees" shows the whole library, a marker the unused ones; filter by text and type, sorted by title. Detail
  with all fields, the archive, the media and the **citations** – each with page, transcription, scans and
  "Supports": every linked fact with a link to the person (and the name of the family tree if it is another one).
  Archives are managed on the same page (second tab "Archives").
- **Person page, new tab "Sources":** all citations of the person, grouped by fact (general, name, birth, death, every
  event, every relation), with page and quality; "Cite source" for each.
- **Small mark at the fact:** next to birth, death, an event or a relation a book icon with the number of citations;
  a click shows them. Facts without a citation stay unmarked (the later plausibility check can list them).
- **Citing** (changed while building: in the tab "Sources", not in the dialogs of person, event and relation – they
  stay as they are, and a fact can only be cited once it is saved): "Cite source" chooses the fact, a source (search as
  you type) or creates it right there, then either **uses an existing citation** of this source (list with page and
  the first words of the transcription) or creates a new one with page, date, transcription and quality. Scans are added
  on the page of the source, at the source or at the citation.
- **Several facts at once:** in the detail of a citation, "Link facts" lists the persons of the open family tree with
  their name, birth, death, events and relations as check boxes – a marriage entry is linked with groom, bride,
  parents, witnesses, the wedding and the marriage in one step.
- **Recycle bin:** deleted sources and archives appear there, restore and delete for good as for persons; as the
  library belongs to all family trees, they have their own section, independent of the open family tree.
- Help chapter "Sources and citations" and all texts in the ten languages; the source types are translated, the stored
  value stays the English code.

## 5. Import, export, backup

### 5.1 Export format (`persons.json`)

- New top-level arrays `repositories`, `sources` (each with its own `media` and the `repositoryId`) and `citations`
  (each with `sourceId` and its `media`); the links inside the target: `person.citationLinks` (citation id and `fact`),
  `event.citationLinks`, `relation.citationLinks`.
- The export of a family tree contains exactly the citations its persons use, their sources and archives, and only
  the links of its own persons. The transcription of a citation may name persons of another family tree – it goes
  along; the help says so.
- `validateTransfer` checks the references (citation, source, archive and media exist, fact known).
- **Version:** the 1.0.x app reads the file with zod and would **silently drop** the unknown arrays. Therefore the
  export writes `version: 2` when the file contains sources or citations, otherwise still `version: 1` – an older app
  then refuses the file with "file of a newer version" instead of losing data; files without sources stay readable for
  everyone.

### 5.2 Import strategies (`plan.ts`, `applyPlan.ts`)

- The links hang off persons, events and relations and therefore are part of the existing person comparison: in
  "decide manually" they appear as changes of the person ("citation added/removed").
- Archives, sources and citations go into the **library**; a record that is already there is used instead of being
  copied: recognised by its id (exports of the app, GEDCOM `UID`/`_UID`), otherwise a source by type + title + author,
  a citation by source + page + date + transcription, an archive by its name. Content of a recognised record: both
  **merge** strategies take the newer one (by `updatedAt`), **overwrite** takes the one of the file.
- **Overwrite** replaces the links of the family tree and never deletes a source, a citation or an archive – other
  family trees may use them.
- Preview: counts of new, changed and unchanged sources.

### 5.3 Backup and restore

- `BACKUP_VERSION` 2 with the four new tables and the two media link tables; a backup of version 1 is still restored
  (without sources). The checks of the restore (references, duplicate ids) cover the new tables.

### 5.4 GEDCOM 5.5.1 and 7.0

| GEDCOM                                                                         | App                                                                                                        |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `0 @R1@ REPO` (NAME, ADDR, PHON, EMAIL, WWW, NOTE)                             | archive                                                                                                    |
| `0 @S1@ SOUR` (TITL, AUTH, PUBL, ABBR, TEXT, NOTE, OBJE, `REPO @R1@` + `CALN`) | source; a second `REPO` becomes a note of the source                                                       |
| `SOUR @S1@` below `INDI`                                                       | citation of the person (`GENERAL`)                                                                         |
| below `NAME` / `BIRT` / `DEAT`                                                 | citation with `fact` NAME / BIRTH / DEATH; a second `BIRT`/`DEAT` (already an event today) cites the event |
| below any other event of the person                                            | citation of the event                                                                                      |
| below `FAM`, `MARR`, `DIV`                                                     | citation of the partner relation                                                                           |
| below `FAMC`                                                                   | citation of each parent-child relation of this family                                                      |
| below `ASSO`                                                                   | citation of that relation                                                                                  |
| below `NOTE`, `OBJE` and other places the app has no target for                | citation of the nearest person                                                                             |
| `SOUR text` without a record (5.5.1)                                           | a source of type OTHER with this text as title, recognised again by the text                               |
| PAGE, DATA.DATE, DATA.TEXT, QUAY, OBJE, NOTE of a citation                     | the fields of the citation                                                                                 |

- The import puts every citation into the library and links it; equal citations (same source, page, date and
  transcription) at several facts become **one citation with several links**.
- The export writes the same structure back – GEDCOM has no shared citations, so a citation is written out at every
  fact it supports (`REPO`, `SOUR` records with `UID`/`_UID`, citations with PAGE, DATA, QUAY,
  OBJE); GEDZIP includes the media of sources and citations.
- The note `Quelle: …` and the dropped citations disappear. The default titles of imported events (`Baptism`,
  `Burial` …) and texts like `Wedding in` come in the language of the interface (`lib/transfer/languageTexts.ts`); a
  repeated import recognises existing events by their title in any of these languages.

## 6. Search, statistics, plausibility

- The global search also finds sources (title, author, abbreviation, call number, transcription) and lists them as
  their own kind of hit.
- Statistics: number of sources, share of persons with at least one citation, the most cited sources.
- The plausibility check (FeatureVorschlag 1) can later list facts without a citation.

## 7. Phases

1. **Core** (one release, because no data may be lost) – **built 14.10.2026**: data model, migration
   `20261013120000_sources` and upgrade fixture, GraphQL, sources page, person tab, marks, recycle bin, export format
   version 2, import strategies, backup version 2, help and texts in ten languages. A GEDCOM file without sources keeps the
   citations of recognised persons (`keepExistingLinks`).
2. **GEDCOM** – **built 14.10.2026**: import and export of `SOUR`/`REPO` and of all citations as in 5.4, GEDZIP with the media. Extensions: `_STYPE` (kind of source), `_CALN` (call number without archive), `_UID` below a citation (its id, so the import makes one citation again). The German default titles of imported events stay as they are: a repeated import recognises existing events by their title.
3. **Extras** – **built 14.10.2026**: the search lists matching sources above the persons found (`lib/search/sourceSearch.ts`), the statistics show the sources and citations of the family tree, the share of persons with a citation and the most cited sources.

Notes `Quelle: …` from earlier GEDCOM imports stay as they are (decision 9.5): whoever wants the sources structured
imports the GEDCOM file again (persons are recognised) and deletes the old notes by hand.

All three phases go into the next release (it waits for Prisma 8).

## 8. Tests

- Backend: resolvers (target constraint, a citation with links into two family trees, deleting a family tree keeps
  the library, recycle bin), transfer round trip with sources, strategies,
  backup version 1 and 2, GEDCOM round trips 5.5.1 and 7.0 plus real files of other programs (Gramps, Ahnenblatt
  examples with sources), upgrade matrix.
- Frontend: sources page, person tab, citation section of the dialogs.
- E2E: create a source, cite one entry at the births of two persons and at a wedding, export and import again into
  another family tree (the source is used, not copied), restore a backup.

## 9. Decisions (13.10.2026)

1. **Archives are records of their own** (GEDCOM `REPO`), shared by many sources, managed on the sources page and
   created right in the source dialog.
2. **Quality:** the optional GEDCOM levels `QUAY` 0–3 (0 unreliable or estimated, 1 questionable, 2 secondary,
   3 primary); no evidence analysis.
3. **Source types:** a fixed type list for symbol and filter, the same fields for all types; no forms per type.
4. **Scans** at the source and at the citation.
5. **Old notes `Quelle: …`** stay as they are; no conversion.
6. **Deleting a cited source:** into the recycle bin together with its citations, as for persons.
7. **One library for all family trees:** archives, sources, citations and their scans belong to no family tree; the
   sources page shows first those of the open family tree, a switch the whole library. Asked by the project owner: an
   archive, a source and a single entry can concern persons of several family trees.
8. **A citation supports any number of facts** (persons, name, birth, death, events, relations – also in several
   family trees), e.g. one marriage entry for groom, bride, parents, witnesses, the wedding and the marriage.
