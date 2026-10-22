# Concept: reports for printing and as PDF

Status: **built** (15.10.2026; decisions in chapter 9). Code: frontend `features/reports/`, backend `resolvers/reportResolvers.ts`, desktop IPC `cognatio:save-pdf`. Goal of the project owner: the data of
a family tree can be printed or saved as a PDF in the forms genealogists know – a sheet per person, a sheet per family,
an ancestor list and a descendant list – to hand to relatives, to file with documents or to take to an archive.

## 1. Starting point

- The only printable output today is the **image of the family tree** (`frontend/src/features/tree/lib/treeExport.ts`):
  PNG, SVG, or `printImage` – an invisible iframe with the image, `window.print()`, and the user picks "Save as PDF" in
  the print dialog. That works in the browser and in the desktop app.
- The person page shows everything a person sheet needs, but spread over tabs and with controls; the browser's own
  print of that page would print navigation, buttons and only the open tab.
- Data per person comes from several queries (`getPerson`, `getEvents`, `getNotes`, `getPersonRelations`,
  `personCitations`, `getPersonMedia`); ancestors and descendants are computed in the frontend from all relations
  (`buildFamilyIndex`, `selectPersons`, `assignGenerations` in `features/tree/lib/treeUtils.ts`).
- No PDF library in the project; the frontend bundle avoids large dependencies (code splitting per page).

## 2. Principles

- **HTML with print styles, no PDF library.** A report is a page built for paper (A4, margins, page breaks, header and
  page numbers through `@page`). The browser and Electron turn it into a PDF themselves – real text that can be
  searched and copied, fonts embedded, no extra library.
- **What you see is what is printed.** A report opens as a preview page in the app; "Print" and "Save as PDF" print
  exactly that preview.
- **Language of the app.** Headings, labels and dates follow the UI language; data (names, places, notes) stays as
  entered.
- **Only the family tree that is open,** without the recycle bin.
- **No new data model,** no migration; the feature does not wait for Prisma 8.

## 3. Reports

### 3.1 Person sheet

One or more pages per person:

- Name with title, birth name and nickname; profile picture (optional); life dates with places; age.
- Personal data: gender, occupation, nationality, languages, marital status; contact data (optional, chapter 6).
- Parents, partners (with wedding date), children, siblings – with life dates.
- Life events in order of time, with date, place and description.
- Notes (optional).
- Citations as numbered footnotes at the facts they support, list of sources at the end (optional).
- Photos of the person as small images (optional).

### 3.2 Family sheet

One page per couple: both partners with life dates and parents, the wedding (date, place), and the children with
their life dates and partners – the classic "family group sheet". Chosen from a person: one sheet per partner of that
person.

### 3.3 Ancestor list (Kekulé numbering)

Starting person = 1, father = 2n, mother = 2n + 1, grouped by generation ("Generation III – great-grandparents").
Each line: number, name, life dates with places, and the wedding of the couple. Ancestors appearing more than once
(pedigree collapse) get their number once and a reference ("see 12") afterwards. Number of generations selectable
(default all, at most 15).

### 3.4 Descendant list

Starting person and their descendants, indented by generation with a d'Aboville number (1, 1.1, 1.1.2 …); partners
listed with each person. Number of generations selectable.

### 3.5 Later (not in the first version)

Birthday and anniversary calendar, list of all persons, place index, list of sources, ancestor chart as a graphic
(a printed family tree exists already as an image).

## 4. User interface

- **Person page:** a button "Report" next to "Show in family tree" opens the page "Reports" with this person as the
  start (built that way instead of a menu: one click less, the report type is chosen on the page).
- **Page "Reports"** (in the sidebar, lazily loaded like statistics): choose report, start person, generations and the
  options of chapter 6; the preview below. The family-tree sheet for several persons ("all persons as person sheets")
  lives here.
- **Preview:** a white paper-like page in the app, also in dark mode; above it "Print" and "Save as PDF", the options
  and the paper size (A4 / Letter, default from the language).
- Help: new section "Reports" in 10 languages; version history entry.

## 5. Printing and PDF

- **Browser:** "Print" and "Save as PDF" both open the print dialog (`window.print()` on an iframe holding only the
  report, as `printImage` does); for a PDF the user picks "Save as PDF". The dialog cannot be skipped in a browser.
- **Desktop app:** "Save as PDF" writes the file directly – a new IPC call in the shell renders the report page with
  `webContents.printToPDF` (A4, margins, header/footer with page numbers) and saves it through the "Save as" dialog,
  file name e.g. `Ahnenliste Anna Kraft.pdf`. "Print" opens the system print dialog.
- Page breaks: no person block, table row or family is split across pages (`break-inside: avoid`); every person sheet
  starts on a new page.
- Images are loaded before printing; the fonts are those of the app (embedded by Chromium in the PDF).

## 6. Options

| Option                                         | Default                                                     |
| ---------------------------------------------- | ----------------------------------------------------------- |
| Photos (profile picture, photos of the person) | on                                                          |
| Notes                                          | on                                                          |
| Sources and citations (footnotes)              | on                                                          |
| Contact data (address, phone, e-mail)          | off                                                         |
| Living persons: only name and year of birth    | off – shared with feature proposal 3 "privacy when sharing" |
| Paper size                                     | from the language (Letter for en-US/pt-BR … A4 otherwise)   |

The choice is remembered per device (settings store), like the views of the timeline.

## 7. Data

- **New query `reportPersons(ids: [ID!]!)`** returns for many persons at once what a sheet needs: person, events,
  notes, citations with source, media names and urls. One request instead of six per person; checks the family tree
  like every resolver. Limit 500 persons per request; the page asks in pieces of 200 ("all persons").
- Ancestors and descendants: computed in the frontend from `getPersons` and `getRelations` with own lookups
  (`features/reports/lib/family.ts`), which also keep the relation (wedding date) and father/mother.
- Kekulé and d'Aboville numbering: new pure functions in `features/reports/lib/`, unit-tested.

## 8. Phases and tests

1. Report page and preview, person sheet, printing in the browser, help. About 2–3 days.
2. Family sheet, ancestor list, descendant list. About 2 days.
3. Desktop "Save as PDF" through `printToPDF`, options, all persons as sheets. About 1–2 days.

Tests: unit tests for the numbering (pedigree collapse, missing parents, generations limit) and for `reportPersons`
(family tree scope, limit); component tests for each report with fixed data; E2E: open a report from a person and
check the preview; a hand test of the PDF in the desktop app (page breaks, umlauts, Cyrillic).

## 9. Decisions (15.10.2026)

1. **Reports:** all four in the first version – person sheet, family sheet, ancestor list (Kekulé), descendant list
   (d'Aboville).
2. **PDF:** the desktop app saves the PDF directly as a file through `printToPDF` (chapter 5); the browser uses the
   print dialog.
3. **Where:** both – the button "Report" on the person page and the page "Reports" in the sidebar (chapter 4).
4. **Options:** the defaults of chapter 6 stay as written; every option can be switched per report and is remembered
   per device.
5. **Release:** with 1.1.0 – no migration, so it does not depend on Prisma 8.
