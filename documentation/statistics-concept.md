# Concept: statistics that help with research

Status: **decided** (22.10.2026), decisions in chapter 8; **all five phases built** (22.10.2026). Goal of the project owner: the page
"Statistics" should not only count what is there, but show where the research stands, what is missing and what the
family tree tells about the lives of its people – and every number should lead to the persons behind it.

## 1. Starting point

- Page `frontend/src/features/statistics/pages/StatisticsPage.tsx`, computed in the frontend
  (`features/statistics/lib/statistics.ts`) from `GET_TREE_DATA` (all persons and relations of the open family tree)
  plus `sourceStatistics` from the backend.
- Shown today: six key figures (persons, deceased, relations, family groups, average lifespan, earliest birth), the
  age distribution of the living and of the deceased, the ten most frequent last names and places of birth, the
  sources with the most citations, and a table of generations per family group.
- Weak points: nothing can be clicked; there is no time axis; nothing says what is missing; the "generations" are
  per family group, not seen from a person; events (weddings, moves), media and citations per person are not
  available on the page at all; the page cannot be narrowed down or printed.
- The bars are plain HTML (`components/BarList.tsx`), no chart library. The AI tool `get_statistics`
  (`backend/src/lib/mcp/tools/system.ts`) computes its own small summary from `getPersons`/`getRelations`.

## 2. Principles

- **Every number leads to its persons.** A bar, a percentage or a record opens the list of exactly the persons that
  were counted (proposal 1). Count and list come from the same function, so they can never disagree – the lesson
  of the "possible errors" counter.
- **Computed in the backend.** The new figures need events, media and citations per person; loading all of them into
  the frontend would be heavy. One module `backend/src/lib/statistics/` computes everything in memory from slim
  queries (persons, active relations, events without descriptions, the ids of persons with media or citations).
  It serves the page, the person list (filter) and the AI tool `get_statistics`. 10 000 persons with 30 000 events
  take well under a second; no caching needed at first.
- **Honest numbers.** Uncertain dates count with the year of their start, as today; a figure based on fewer than
  5 persons is shown as "—" with the number of persons in the hint; every chart says how many persons it covers
  and how many were left out (no date, no place).
- **One small migration:** the home person of a family tree (chapter 3.4); otherwise no new data model. Like
  `checkedIssues` it does not wait for Prisma 8.
- **Charts without a library:** bars stay HTML; the time axis gets one small SVG component. One colour per measure
  (the chart colour of the theme), a hover tooltip, a table view for screen readers, light and dark mode.
- **Language of the app** for all labels; names and places as entered. All ten languages, informal address.

## 3. The ten proposals

### 3.1 Everything clickable (proposal 1)

- Every bar, tile, table row, percentage and record is a link to the person list with a **filter**, e.g.
  `/persons?filter=surname:Kraft`, `filter=birthplace:Halle`, `filter=deathAge:80`, `filter=missing:birthDate`,
  `filter=ancestorGap:<personId>:4`.
- The person list shows the filter as a chip above the cards ("Last name: Kraft · 23 persons ×"); the × removes
  it. Text search and filter can be combined (search within the filter).
- Backend: new query `statisticsPersons(filter: String!, scope: StatisticsScope): [Person!]!`. The filter string is
  parsed and checked against a fixed list of kinds (unknown kind → `BAD_USER_INPUT`); the persons are selected by
  the same functions that count them for the page.
- The browser's back button returns to the statistics with the same tab and scope (all state in the URL).

### 3.2 Completeness – "What is still missing?" (proposal 2)

A card with one row per fact, each with a bar in percent and the number of persons without it:

| Fact                                  | Counts for                     |
| ------------------------------------- | ------------------------------ |
| Date of birth                         | all persons                    |
| Place of birth                        | all persons                    |
| Date of death                         | deceased persons               |
| Place of death                        | deceased persons               |
| Father known / mother known           | all persons                    |
| At least one partner                  | deceased persons older than 18 |
| Photo (profile picture or any medium) | all persons                    |
| At least one source                   | all persons                    |

- Click on a row → the persons **without** the fact (the to-do list of the research).
- An overall score: the mean of the rows, shown as a large number ("Research status 62 %"), with a hint how it is
  made up.
- "Deceased" means as today: date or place of death given, or older than 110 (`isDeceased` / `MAX_PLAUSIBLE_AGE`).

### 3.3 Time axis (proposal 3)

- Bar chart by **decade**: births, deaths and weddings, switchable with three buttons above the chart (one measure at
  a time, same axis – no stacked bars, no second axis). From the earliest to the latest decade with data, empty
  decades included so gaps are visible.
- Weddings: the start date of a marriage (`HUSBAND`, `WIFE`); if it has none, a life event of category `WEDDING` of
  one of the two – counted once per couple. Life partners (`LIFE_PARTNER`, `PARTNER`) only count with such an event:
  the start of living together is no wedding, and the marital status of a person stays "single".
- Tooltip: "1880–1889: 14 births"; click → the persons born (died, married) in that decade.
- Below the chart: "Without a year: 12 births, 30 deaths".

### 3.4 Ancestors of a person (proposal 4)

- Start person: the new **home person** of the family tree, changeable in the card (person picker) without changing
  the setting. Without a home person: the person with the most ancestors, with a hint "Set a home person".
- Home person: new field `FamilyTree.homePersonId` (migration, kept in backups like `checkedIssues`; not part of the
  export of a single family tree), set with the button "Home person" on the person page
  or "Make home person" in the ancestor figures. The reports and the family tree page start with it when no other
  person is chosen. The AI tools get it with phase 5.
- Table per generation: generation (with the name: parents, grandparents, great-grandparents …), possible ancestors
  (2ⁿ), found ancestors, share in percent with a bar, earliest and latest year of birth.
- Pedigree collapse: ancestors reached more than once count once; per generation "found: 14, of them 2 more than
  once"; a line below the table: "Pedigree collapse: 3 % (2 of 62 ancestors appear twice)".
- The same rules as the ancestor list of the reports (`features/reports/lib/numbering.ts`, Kekulé numbering, stops
  at 15 generations); the counting moves into a function shared by both or is repeated in the backend with the same
  tests.
- Click on "found" → these ancestors; a second link per generation "open ends" → the ancestors of the generation
  before whose father or mother is missing (where the research can go on).

### 3.5 Lives through time (proposal 5)

A card with small tables, each per century of birth (and in total), each with the number of persons it is based on:

- **Life expectancy** by century and gender (deceased with both years). A second row "of those who reached 15"
  separates child mortality from adult life, which would otherwise dominate older centuries.
- **Age at the first wedding** by gender (first marriage with a start date, or the first `WEDDING` event).
- **Age at the birth of the first child** by gender.
- **Children per couple**: distribution 0, 1, 2 … 10+ and the mean, for all couples – partners or the common parents of a
  child –, counting their common children.
- **Age gap between partners**: mean and the distribution "man older / same age (±1) / woman older".

### 3.6 First names (proposal 6)

- The ten most frequent first names, separately for male and female, the rest as in the last names card (spellings
  ignoring case, the most frequent spelling shown).
- Every given name counts (Johann Georg → Johann and Georg); the placeholder `(Vorname unbekannt)` is left out.
- A table "fashion of names": per century of birth the three most frequent names per gender.
- Click → persons with that first name.

### 3.7 Migration (proposal 7)

- **Stayed or moved:** share of deceased persons who died in their place of birth (both places known).
- **Most frequent moves** "place of birth → place of death" (and `MOVE` events: previous place → place of the move),
  the ten most frequent with the number of persons.
- **Places with their time span:** every place with the number of persons and the years of the first and last fact
  there ("Halle · 41 persons · 1712–1968"), sorted by persons; click → the persons with a fact in that place.
- Places are compared ignoring case and spaces, as in the existing ranking; there is no place register yet.
- A map is left out: it needs coordinates for every place and, offline, a large place database. Noted as "later".

### 3.8 Records (proposal 8)

A card with one line each, the person(s) linked, the value and the year:

- **Only deceased persons** – no data of living persons in records, also not on a printed page.
- Longest life; longest marriage (from the wedding to the end of the relation or the first death); most children;
  most common children of a couple (the "largest group of siblings", shown by its parents); most partners; youngest and
  oldest mother and father at a birth (only the parent is named, the child may be living); largest age gap between
  partners; most descendants. Up to three holders of the same value are named, more are counted.
- A record that is also a possible error (e.g. a mother of 61) gets the hint "possible error" with a link to the
  page "Possible errors", so a typing error does not stand there as a record unnoticed.

### 3.9 Filter above the page (proposal 9)

- A bar above all cards: **scope** = whole family tree / ancestors of … / descendants of … / last name (persons with
  this last or birth name) / born between … and ….
- All figures, charts and click-through lists follow the scope; relations count only between persons in the scope.
- The scope lives in the URL (`/statistics?scope=ancestors&person=<id>&from=1800&to=1900`), so a link or the back
  button restores it; the last scope is remembered per family tree on this device.

### 3.10 Print and export (proposal 10)

- New report "Statistics" on the page "Reports": the cards of the current scope as a printable page (A4/Letter, the
  same print styles, "Print" and "Save as PDF" as for the other reports). Bars print as they are; the time axis is
  SVG and stays sharp.
- Each card gets "Copy as CSV" (to the clipboard) for spreadsheets: cells separated by tabs, because spreadsheets
  split pasted text at tabs and not at commas or semicolons; numbers with the decimal comma where the language writes
  it; a text that starts like a formula gets an apostrophe. Built without a file download: pasting into a spreadsheet
  is the usual way, and the clipboard works the same in the browser and the desktop app.
- The AI tool `get_statistics` returns the same figures (with an optional scope), so an assistant can answer
  "how complete are the ancestors of Anna?".

## 4. User interface

The page gets too long for one column of cards, so it is split into **tabs** (in the URL, `?tab=…`), the scope bar
above them:

| Tab           | Content                                                                               |
| ------------- | ------------------------------------------------------------------------------------- |
| Overview      | key figures (as today), completeness (3.2), time axis (3.3)                           |
| Lives         | age distribution (as today), lives through time (3.5), records (3.8)                  |
| Names, places | last names (as today), first names (3.6), places of birth (as today), migration (3.7) |
| Ancestors     | ancestors of a person (3.4), generations per family group (as today)                  |
| Sources       | sources (as today)                                                                    |

Help: the section "Statistics" is rewritten in 10 languages (what each figure means, how "deceased", uncertain dates
and the scope count); a release note.

## 5. Data and backend

- `backend/src/lib/statistics/`: `loadFacts(db, treeId)` reads persons (without the recycle bin), active relations,
  events (id, person, category, date, place – no description), the ids of persons with a medium or a profile
  picture, and the ids of persons with a citation (of the person, its events or relations).
- Pure functions per card on these facts, unit-tested with jest: `completeness`, `timeline`, `ancestorCoverage`,
  `lifeFigures`, `firstNames`, `migration`, `records`, plus `selectScope` and `personsOf(filter)`.
- GraphQL: `treeStatistics(scope: StatisticsScope): TreeStatistics!` (one query for all cards; the tab only decides
  what is shown) and `statisticsPersons(filter, scope)`. The family-tree check like every resolver.
- The frontend keeps only the display; `features/statistics/lib/statistics.ts` moves to the backend (the start page
  uses the age limit only, which stays in `personUtils`).

## 6. Phases

1. Backend module with the existing figures, scope and filter; person list with filter chip; tabs; existing cards
   clickable (3.1, 3.9). About 3 days.
2. Home person (migration, setting, person page), completeness and ancestors (3.2, 3.4). About 2–3 days.
3. Time axis and lives through time (3.3, 3.5). About 2–3 days.
4. First names, migration, records (3.6, 3.7, 3.8). About 2 days.
5. Report "Statistics", CSV, AI tool, help in 10 languages (3.10). About 2 days.

Tests: jest for every function (uncertain dates, pedigree collapse, scope, persons without dates, empty family
tree); a test that for every filter kind `statisticsPersons` returns exactly as many persons as the figure says;
component tests for tabs, scope bar and filter chip; E2E: click a bar on the statistics and land on the right person
list, change the scope and see the figures change; a hand test with the demo family and a large tree (10 000
persons) for speed.

## 7. Not planned

A map (chapter 3.7), comparisons between family trees, figures over the history of changes ("added this month"),
charts of other kinds (pie, stacked bars, two axes).

## 8. Decisions (22.10.2026)

1. **Release:** all five phases come with 1.1.0 (about 11–12 days); 1.1.0 is published after them.
2. **Layout:** tabs as in chapter 4, the tab in the URL.
3. **Completeness:** the rows of chapter 3.2 as written, with the overall score "research status" in percent.
4. **Records:** only deceased persons.
5. **First names:** every given name counts.
6. **Start person of the ancestors:** a new setting "home person" per family tree (chapter 3.4), also used by the
   reports and the family tree page.
