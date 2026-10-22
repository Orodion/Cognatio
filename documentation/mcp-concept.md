# Concept: AI assistants through MCP

Status: **phases 1 and 2 built** (21.10.2026, for 1.1.0; decisions of the project owner in chapter 10, what the
implementation does differently in chapter 11). Goal of
the project owner: an AI assistant (Claude Desktop, Claude Code or any other client of the
[Model Context Protocol](https://modelcontextprotocol.io)) can work with the family trees of Cognatio – look persons up,
answer questions such as "which ancestors came from Pomerania?", point out gaps and, if allowed, enter what the user
dictates or what a scanned church book entry says.

## 1. Starting point

- The backend already offers everything an assistant needs, through GraphQL (`backend/src/schema/typeDefs.ts`):
  family trees, persons, relations, events, notes, media, sources and citations, the search with phonetic matching
  (`search`, `searchSources`), possible duplicates (`similarPersons`), `systemInfo`. About 40 mutations create, change
  and delete these records; deleting puts them into the recycle bin.
- **Family tree scope:** every request applies to one family tree, named in the header `X-Family-Tree-Id`
  (`backend/src/lib/treeScope.ts`); without it the oldest one applies.
- **Access protection:** the desktop app starts the backend with a new random `COGNATIO_ACCESS_TOKEN` at every start
  (`desktop/src/backend.ts`) and hands it to its window as an HttpOnly cookie. No other program learns it. In addition,
  `hostCheck` refuses foreign host names (DNS rebinding) and `requestGuard` refuses changes from foreign web pages.
- The backend listens only on `127.0.0.1`. The desktop app reuses its port from `desktop.json`, but takes another one
  if that port is taken (`COGNATIO_PORT_FALLBACK`).
- Statistics are computed in the frontend (`frontend/src/features/statistics/lib/statistics.ts`), except
  `sourceStatistics`.
- Consequence: an assistant cannot connect today, and it must not get the token of the app – that token opens
  everything, including backup, restore and import.

## 2. Principles

- **Off by default.** Data reaches an assistant only after the user switched it on. The family data then goes to the
  provider of the AI model, and the settings say so in plain words.
- **One place for the rules.** MCP tools do not touch the database directly. They run the existing GraphQL operations,
  so validation, family tree scope, cycle checks, the derivation of the second parent and the recycle bin apply
  unchanged.
- **Own token, own permissions** (decision 10.1). The MCP endpoint has a token of its own, separate from the token of
  the app. What it may do is set per area in the settings section "MCP" (chapter 5.1): switched on, every area is
  _read only_; with every permission granted, the assistant can do everything the app can.
- **Nothing is lost unless the user allows it.** With the default permissions an assistant changes nothing; with
  "write" its changes can be undone in the app (deleted records go to the recycle bin); only the permission "delete"
  allows what cannot be undone, and granting it warns the user. All changes are logged with the source `mcp`.
- **Small answers.** A family tree can hold thousands of persons; tools return pages and summaries instead of the
  whole tree, so the answer fits into the context of a model.
- **No new data model.** No migration; the MCP settings live in `settings.json` next to the size limits
  (`backend/src/lib/files/appSettings.ts`). The feature therefore does not wait for Prisma 8.

## 3. Architecture

```
AI client (Claude Desktop / Claude Code / …)
   │  Streamable HTTP, POST http://127.0.0.1:<port>/mcp
   │  Authorization: Bearer <MCP token>
   ▼
Backend (Express)
   hostCheck ─► mcpAuth ─► MCP server (@modelcontextprotocol/sdk, stateless)
                              │ tool call
                              ▼
                          Apollo executeOperation(query, variables, context: tree, source "mcp")
                              ▼
                          existing resolvers ─► Prisma ─► PostgreSQL
```

- **Library:** the official TypeScript SDK `@modelcontextprotocol/sdk` (MIT, version pinned exactly; 1.32.1 at the
  time of writing). It accepts zod 4, which the backend already uses for the tool parameters.
- **Transport:** Streamable HTTP in the stateless mode – every request stands alone, the backend keeps no MCP
  sessions. It is mounted at `/mcp` in `backend/src/app.ts`, behind `hostCheck`. The MCP specification asks servers to
  check the `Origin` header against DNS rebinding; `hostCheck` already does that for the host, and `/mcp` additionally
  refuses any request that carries an `Origin` of a web page.
- **Code:** `backend/src/lib/mcp/` with `server.ts` (creates the server and registers the tools), `auth.ts` (token
  check), `graphql.ts` (runs an operation on the Apollo server with the family tree of the tool call) and one file per
  group of tools (`tools/persons.ts`, `tools/relations.ts`, `tools/sources.ts` …).
- **Why not a separate program over stdio:** it would have to find the backend (port) and get a token anyway, and
  the desktop app cannot start scripts (the fuse `RunAsNode` is off). A stdio bridge stays possible later (chapter 8,
  phase 3) for clients that only speak stdio.

## 4. Tools

Names in `snake_case`, descriptions in English (they are read by the model, not by the user). Every tool takes an
optional `familyTree` (id or name); without it the active family tree of the app applies. Each tool carries the MCP
annotations `readOnlyHint` and `destructiveHint`, so clients can ask the user before a change.

### 4.1 Reading (phase 1)

| Tool                                | Answer                                                                                  | GraphQL                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `list_family_trees`                 | id, name, number of persons, active tree                                                | `familyTrees`, `activeFamilyTree`                                                               |
| `search`                            | persons and sources matching the text, phonetic, at most 20                             | `search`, `searchSources`                                                                       |
| `list_persons`                      | page of persons (50) with dates and places; filter by name, living, born between, place | `getPersons`                                                                                    |
| `get_person`                        | all fields, life events, notes, relations, citations, names of the media                | `getPerson`, `getEvents`, `getNotes`, `getPersonRelations`, `personCitations`, `getPersonMedia` |
| `get_family`                        | parents, partners, children and siblings of a person                                    | `getPersonRelations`                                                                            |
| `get_ancestors` / `get_descendants` | persons up to n generations (at most 10), as a list with the generation                 | `getRelations`                                                                                  |
| `find_duplicates`                   | possible duplicates of a person or of a name with birth date                            | `similarPersons`                                                                                |
| `list_possible_errors`              | possible errors of the family tree (page "Possible errors") as English sentences        | `plausibilityIssues`                                                                            |
| `list_sources` / `get_source`       | sources with archive and citations                                                      | `sources`, `source`                                                                             |
| `get_statistics`                    | counts, life span, most common names and places, use of sources                         | new resolver (logic moves from the frontend to a shared module)                                 |

### 4.2 Changing (phase 2)

| Tool                                             | Effect                                                                     | GraphQL                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `create_person` / `update_person`                | create or change a person; warns about possible duplicates before creating | `similarPersons`, `createPerson`, `updatePerson`              |
| `add_event` / `update_event`                     | life event with date, place, description                                   | `createEvent`, `updateEvent`                                  |
| `add_note` / `update_note`                       | note at a person                                                           | `createNote`, `updateNote`                                    |
| `create_relation` / `update_relation`            | parent–child, partner, sibling …                                           | `createRelation`, `updateRelation`                            |
| `create_source`, `add_citation`, `link_citation` | source, citation, link to a person, event or relation                      | `createSource`, `createCitation`, `linkCitation`              |
| `move_to_recycle_bin`                            | person, event, note or relation into the recycle bin                       | `deletePerson`, `deleteEvent`, `deleteNote`, `deleteRelation` |

### 4.3 Further tools, each behind its permission (phase 2)

With every permission granted the assistant can do everything the app can (decision 10.1):

| Tool                                                               | Effect                                                                              | Permission                   |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------- |
| `restore_from_recycle_bin`                                         | restore a person, relation, family tree, source or archive                          | Recycle bin: write           |
| `delete_for_good`                                                  | delete a record in the recycle bin for good                                         | Recycle bin: delete          |
| `create_family_tree` / `rename_family_tree` / `delete_family_tree` | family trees (deleting puts it into the recycle bin)                                | Family trees: write / delete |
| `add_media`                                                        | file from a path on this computer or a URL to a person or event                     | Media: write                 |
| `remove_media`                                                     | delete a medium                                                                     | Media: delete                |
| `export_family_tree`                                               | ZIP or GEDCOM into a folder on this computer                                        | Import and export: read      |
| `import_file`                                                      | preview and import of a ZIP or GEDCOM file (new tree, merge)                        | Import and export: write     |
| `import_file` with "overwrite"                                     | import that replaces the persons of a tree                                          | Import and export: delete    |
| `create_backup` / `list_backups`                                   | full backup into the backup folder                                                  | Backup: read                 |
| `restore_backup`                                                   | restore a backup – replaces all data (a safety backup is made first, as in the app) | Backup: delete               |
| `get_settings` / `set_settings`                                    | size limits, log level, other settings of the backend                               | Settings: read / write       |

Files are read from and written to paths on this computer, never sent through MCP itself; paths outside the data,
backup and user folders are refused. Long tasks (import, backup, restore) run as jobs and appear under Activity with
progress and cancel, like in the app; the tool answers with the job id, `get_job` reports the state.

**Never through MCP, whatever the permissions:** the MCP section of the settings itself – switching MCP on or off,
the permissions, the token. Otherwise an assistant could grant itself rights the user did not give.

### 4.4 Resources and prompts (phase 3)

- Resources: the help chapters (`frontend/src/features/help/content/en.ts`) as `cognatio://help/<section>`, so an
  assistant can explain the app; a person as `cognatio://person/<id>`.
- Prompts: "check this family tree for implausible dates", "summarise the life of a person", "enter this church book
  entry" (with source and citation).

## 5. Access and security

- **MCP token:** 32 random bytes, shown once in the settings with a copy button; the backend keeps only its SHA-256
  hash in `settings.json`. "New token" replaces it, "switch off" deletes it. The check uses `timingSafeEqual` as
  `accessToken.ts` does.
- **Permissions:** see 5.1. Tools the permissions do not allow are not even listed (`tools/list`), so the model does
  not try them; after a change of the permissions the server sends `notifications/tools/list_changed`. A call is
  checked again against the permissions of that moment.
- **Family trees** (setting): all, or a chosen list; others are invisible to MCP – `list_family_trees` leaves them out,
  `familyTree` refuses them.
- **Logging:** every tool call is written to the backend log with the tool name, family tree and ids (no field values
  beyond ids); changes carry `source: "mcp"`. The log page of the app gets a filter for it.
- **Limits:** at most 20 tool calls per second; answers of more than 200 KB are cut with a note to ask for the next
  page.
- **Server mode – later** (decision 10.7; backend without the desktop app, e.g. on a NAS): `COGNATIO_MCP_TOKEN` and
  `COGNATIO_MCP_PERMISSIONS` as environment variables instead of the settings page. Outside `127.0.0.1` only behind
  HTTPS (reverse proxy, `ALLOWED_HOSTS`).

### 5.1 Permissions (decision 10.1)

Set per area in the settings section "MCP". Each area has the levels **off**, **read**, **write** (create, change,
move into the recycle bin – can be undone) and **delete** (cannot be undone). A higher level includes the lower ones.

| Area                              | read                                 | write                                      | delete                               |
| --------------------------------- | ------------------------------------ | ------------------------------------------ | ------------------------------------ |
| Persons, events, notes, relations | look up, search, family, ancestors   | create, change, into the recycle bin       | –                                    |
| Sources and citations             | look up, search                      | create, change, cite, into the recycle bin | –                                    |
| Media                             | names and data of the files          | add                                        | delete a medium                      |
| Family trees                      | list                                 | create, rename, into the recycle bin       | –                                    |
| Recycle bin                       | list its content                     | restore                                    | delete for good                      |
| Import and export                 | import history, export into a folder | import as new tree or merge                | import with "overwrite"              |
| Backup                            | list backups, create a backup        | –                                          | restore a backup (replaces all data) |
| Settings                          | read                                 | change (size limits, log level …)          | –                                    |
| Statistics and log                | read                                 | –                                          | –                                    |

- **Switching on** sets every area to **read**.
- **Granting write or delete** in any area opens a warning first. For "write": the assistant can change the data on
  its own; changes can be undone in the app. For "delete": the assistant can delete data for good or replace all
  data; this cannot be undone. The level is set only after the user confirms.
- The settings show a summary ("read only", "read and write", "everything allowed") next to the switch.
- The permissions are stored in `settings.json` with the hash of the token; changing them needs no new token and no
  restart.

## 6. User interface

Settings → own section **MCP (AI assistants)** (10 languages):

- Switch "Allow AI assistants" (off), with the note that the data goes to the provider of the AI model the user
  chooses.
- Permissions per area as in 5.1 (all "read" after switching on), with the warnings before "write" and "delete";
  family trees: all / chosen.
- Address `http://127.0.0.1:<port>/mcp` and the token (once), each with a copy button.
- Ready-made configuration to copy:
  - Claude Code: `claude mcp add --transport http cognatio http://127.0.0.1:<port>/mcp --header "Authorization: Bearer <token>"`
  - Claude Desktop and other clients: the matching JSON block.
- A note if the desktop app had to take another port at its last start (the client configuration then needs the new
  address). The shell keeps the port stable, so this is rare.
- Help: new section "AI assistants (MCP)" in all 10 languages; the version history gets an entry.

## 7. Undo and transparency

- Changes of an assistant show up like the user's own: in the person, in the recycle bin, in the statistics.
- **Activity** (sidebar) lists MCP changes of the running session as one entry per tool call ("Claude added a life
  event to Anna Kraft"), so the user sees what happened while the assistant worked. Like other finished entries they
  are kept until the app ends.

## 8. Phases

Phases 1 and 2 are built and released together (decision 10.2); they stay separate steps of the work, each with its
own tests.

1. **Reading:** endpoint, token, settings section, tools of 4.1 (without `get_statistics`), help, tests. About 2–3 days.
2. **Changing:** tools of 4.2 and 4.3, permissions per area with warnings, activity entries, logging with
   `source: "mcp"`. About 3–4 days.
3. **Extras (optional):** `get_statistics` with the logic moved to a shared module; resources and prompts; a stdio
   bridge for clients without HTTP; a plausibility tool once feature proposal 1 exists.

## 9. Tests

- Unit tests per tool with the in-memory transport of the SDK (client and server in one process) against the test
  database `cognatio_test`: results, paging, family tree scope, refused trees.
- Access: missing or wrong token → 401, foreign host or `Origin` → 403, switched off → 404; per area and level the
  allowed tools are listed and callable, all others neither; a call after lowering a permission is refused; no tool
  can change the MCP section of the settings.
- Settings page: switching on sets every area to "read"; "write" and "delete" open the warning and keep the old level
  on cancel.
- Changes go through GraphQL: a cycle or an invalid date is refused with the same error code as in the app.
- E2E (`cognatio_test`): switching on in the settings shows address and token; the copied command contains both.
- Hand test: Claude Code against the desktop app – search, read a person, (phase 2) add an event and see it in the
  app and in Activity.

## 10. Decisions (15.10.2026)

1. **Permissions** are set per area in an own settings section "MCP" (chapter 5.1). Switching MCP on makes every
   area _read only_. With every permission granted the assistant can do everything the app can – backup, restore,
   import, settings and deleting for good included (chapter 4.3). Granting "write" or "delete" warns the user first.
   Only the MCP section itself stays out of reach of the assistant. This replaces the fixed reduced set of rights of
   the first draft and answers the former question "may an assistant delete".
2. **Scope:** phases 1 and 2 are built together, so the permissions are complete from the first version on
   (chapter 8).
3. **Transport:** Streamable HTTP endpoint `/mcp` in the backend (chapter 3); no own stdio program. A stdio bridge
   stays an optional extra of phase 3.
4. **Token:** shown once after it is created, with a copy button; only its SHA-256 hash is stored (chapter 5). A lost
   token is replaced by a new one.
5. **Family trees:** after switching on, all family trees are open to the assistant, new ones included; single trees
   can be excluded in the MCP section (chapter 5).
6. **Living persons:** no extra setting; the assistant sees what the permission "read" allows, living persons
   included.
7. **Server mode:** not now; MCP is set up only in the MCP section of the settings of the app. The environment
   variables of chapter 5 come later, if needed.
8. **Release:** with 1.1.0 – no migration, so it does not depend on Prisma 8; the version history of 1.1.0 gets an
   entry.

## 11. Implementation (21.10.2026)

How to connect and use an assistant: [MCP usage](mcp-usage.md).

Phases 1 and 2 are built (`backend/src/lib/mcp/`, settings section `frontend/src/features/settings/components/McpSection.tsx`,
help chapter "AI assistants (MCP)" in 10 languages, version history 1.1.0). Where the implementation differs from the
chapters above:

1. **"Delete" also for persons and sources.** The app deletes life events and notes for good (they have no recycle bin),
   and `deleteCitation` removes a citation in all family trees. So `delete_event`, `delete_note` (area persons) and
   `delete_citation` (area sources) need the level "delete"; both areas offer it.
2. **More tools than listed in chapter 4:** `list_media`, `set_profile_picture`, `list_recycle_bin`, `list_imports`,
   `list_repositories`, `create_repository`, `update_repository`, `update_source`, `update_citation`, `unlink_citation`,
   `move_source_to_recycle_bin`, `delete_event`, `delete_note`, `delete_citation`, `read_log` (area "Statistics and log")
   and `get_job` (import/export or backup). `update_event` needs the id of the person besides the event (there is no
   query for a single event).
3. **`get_statistics` already now:** it counts from the GraphQL data of the family tree (persons, living, years of birth,
   life span, names, places, families, `sourceStatistics`) instead of moving the statistics of the frontend into a
   shared module.
4. **`add_media` takes a path only, no URL:** the backend makes no requests to the internet; an assistant that has a
   file on the web saves it first.
5. **Paths:** only in the home folder, the data folder and the backup folder (links are resolved first); an export needs
   an existing folder.
6. **No `notifications/tools/list_changed`:** without sessions there is no connection to send it on. Every request lists
   the tools of that moment anyway; a tool that is no longer allowed is unknown to the next request, and a call is
   checked again when it runs.
7. **Family tree without `familyTree`:** the one the app showed last (header of its last request), otherwise the oldest
   visible one – as in the app after a restart.
8. **Activity:** one entry per call of a changing tool (also refused ones), with the name the client gave when it
   connected; the app asks for new entries every 5 seconds while MCP is switched on and then reloads the open page.
9. **Not built (phase 3):** resources, prompts and a stdio bridge.
10. **Every area offers every level** (after the first hand test): "backup: write" creates a backup (before: "read"),
    "family trees: delete" is needed besides "recycle bin: delete" to delete a family tree for good; the other levels
    without a tool of their own grant nothing more. So "all areas" can be ticked in every column.
11. **Checks of the app in the backend:** the app checks dates and family tree names in its forms, not in GraphQL. MCP
    checks them itself with the rules of the form (`backend/src/lib/flexibleDate.ts`, same date words as the UI):
    impossible days, dates in the future, reversed ranges, free text, a death before the birth or a life longer than
    125 years are refused, and a family tree may not get the name of another one. Days of relations come back as
    `DD.MM.YYYY` like all other dates; `get_settings` calls its backup numbers `databaseBackupCount` because they count
    the automatic database backups, not the ZIP backups of `list_backups`. `create_relation` starts a parent-child relation with
    the exact date of birth of the child like the form, and `list_recycle_bin` names both persons of a relation and the
    time it went there.

Tests: `backend/src/lib/mcp/__tests__/` (endpoint, permissions, every tool with a fake GraphQL server, files and jobs),
`frontend/src/features/settings/components/__tests__/McpSection.test.tsx`, the activity hook, and the end-to-end test
`e2e/tests/mcp.spec.ts` against `cognatio_test` (switch on in the settings, an assistant searches, the permission
"write" after the warning, a life event added through MCP appears in the database and under "Activity", refusals,
switching off). A client of the official SDK connected to a backend on `cognatio_test`, listed the tools and called them.
The hand test with Claude Code against the desktop app (21.10.2026) found the unchecked dates and the duplicate family
tree names (point 11).
