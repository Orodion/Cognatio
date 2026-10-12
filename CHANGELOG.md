# Changelog

All notable changes are listed here, newest first. Format: [Keep a Changelog](https://keepachangelog.com/), sections per release.

## [Unreleased]

## [1.0.0] - 2026-10-12

### Changed

- Family trees: also the last one can be moved to the recycle bin, and the backend no longer creates a family tree by itself (before: an empty "My Family Tree" on the first request). Without any family tree the app shows the pages that need none (family trees, import/export, recycle bin, settings, help); the others offer to create one, import a file into a new one or get one back from the recycle bin. Requests that need a family tree are answered with `TREE_NOT_FOUND`.
- Desktop app: the backend runs as an Electron utility process, and the program file is hardened with Electron fuses (no ELECTRON_RUN_AS_NODE, no NODE_OPTIONS, no `--inspect`, only its own `app.asar`), so a signed Cognatio.exe cannot be misused to run other scripts. `desktop/scripts/smoke.mjs --packaged` and `update-test.mjs` drive the installed app through `--remote-debugging-port`.
- Backend: listens on `127.0.0.1` unless `HOST` names another address, answers only under its own address (IP addresses, `localhost` and the names in the new `ALLOWED_HOSTS`; protection against DNS rebinding) and refuses changes sent by another website (`Sec-Fetch-Site`/`Origin`; uploads, imports and restores could otherwise be triggered from any page).
- GraphQL API: the times of persons, life events, notes and media are ISO timestamps like those of family trees and relations (before: milliseconds as text).
- Media upload: a file above 50 MB is answered with 413 (`FILE_TOO_LARGE`) instead of a general error, an unknown `type` is refused, and the medium, its link to the event and the profile picture are written in one transaction.
- Import: the size of an imported medium is that of the stored file; a file above 2 GiB, which the database cannot record, is refused with a message (`MEDIA_TOO_LARGE`).
- Restore: of the backups the server takes before a restore (`cognatio_before_restore_….zip`) only the last three are kept.
- GraphQL API: gender (`MALE`, `FEMALE`, `UNKNOWN`) and date precisions (`EXACT`, `MONTH`, `YEAR`, `APPROXIMATE`) of persons and life events take only the known values (`INVALID_GENDER`, `INVALID_DATE_PRECISION`; before any text was stored). An import file with other values, or with an unknown event category, takes the neutral value (`UNKNOWN`, no precision, `OTHER`) like the GEDCOM import.
- Import, export, backup and restore run one at a time: another one started meanwhile is answered with 409 (`OPERATION_IN_PROGRESS`, with a message in the app) instead of doubling the memory or mixing its changes with the running one. The check comes before the upload (a refused file is read and dropped, not kept in memory), and the operation counts as running until its work is done – also when the browser cancelled the request.
- Media upload: a person in the recycle bin gets no new files (409, `PERSON_IN_TRASH`). Upload and permanent deletion of a person or family tree lock the family tree in their transaction and so run one after the other: the deletion reads its list of files inside the transaction, an upload after it finds its person gone – no file stays behind on the disk.
- Derived relations (second parent, siblings) are written in one statement, all together or not at all.
- The app shows a message with "Reload" when a page fails instead of an empty window (in the desktop app nothing but closing it was left); the error goes into the log, the navigation stays usable. An unknown address leads to the overview.
- Desktop app: the texts of the shell (start, error and update dialogs) are available in all ten languages of the app.
- `scripts/public-snapshot.mjs`: the private words to look for are passed with `--forbid` and are no longer written into the script (they would have been published with it); the old project address is read from `desktop/src/feeds.ts`, and `.git-blame-ignore-revs` is emptied in the snapshot (its commits do not exist there). Test data no longer uses real surnames.
- CI: `npm audit` of the shipped packages (`audit:prod`) stops a release (other pipelines only show the findings); the build tools are checked separately (`audit:dev`). The image of `release:publish` and `@as-integrations/express4` are pinned instead of "latest".
- Error details and fallbacks of the backend are English (`(root)`, `unknown`).

- Frontend: ESLint keeps the features apart (`FEATURE_DEPENDENCIES` and `PUBLIC_COMPONENTS` in `frontend/eslint.config.mjs`): a feature imports only the features allowed for it, and of those only `lib`, `types`, `graphql` and the listed components; `components/ui` and `lib` import nothing from a feature. Rules in `documentation/code-guidelines.md`.
- The whole code base is formatted with Prettier (`npm run format`); the pipeline checks it with `npm run format:check`. The formatting commit is listed in `.git-blame-ignore-revs`.
- GraphQL API: `updateNote` and `updateEvent` take their own input types (`UpdateNoteInput`, `UpdateEventInput`) without `personId`, because the person of a note or event cannot be changed; `createNote` and `createEvent` are unchanged.
- Backend: an ESLint rule (`no-restricted-imports`) reports direct imports of `fs` outside `src/lib/files/` and the few listed modules (backups, logs, migrations, built web page, bundled PostgreSQL, example family tree, system information); the code for the upload folder in the import, export and size check moved to `lib/files/uploads.ts`.
- Search: hits of equal relevance are sorted in the alphabet of the language of the app (the app sends it as the new optional argument `language` of `search`); without a language the order no longer depends on the server (root collation instead of a fixed German one).
- The "React Flow" mark in the corner of the family tree and the relationship graph is hidden; the library is named in the README and in the licence notices.
- Size limit of export, import, backup and restore: one file may be up to 2 GB (import was 500 MB). A larger export is refused before anything is packed, because it could not be imported again; a larger backup is still created, and the app warns that it cannot restore it. The messages name the limit (and the size) and the help mentions it. Settings → Data and backup → Size limits lets the user raise the limits on a computer with plenty of memory; above 4 GB the settings warn that at least twice the file size must be free as memory. The values are kept in `settings.json` in the data folder. The limits are listed in the README.
- Development database: `npm run db:start` runs the PostgreSQL that the Windows app bundles as a plain server on 127.0.0.1:5432 (data in `.dev-data/`, databases `cognatio_db` and `cognatio_test`); `db:stop`, `db:status`, `db:backup` and `db:restore` complete it. The CI keeps its PostgreSQL service for the Linux runners.
- Help: the version history shows the release date of 1.0.0.
- Windows installer: setup and uninstaller are available in the ten languages of the app and follow the language of Windows (English for all others); the two questions of an interactive uninstall (delete the data too?) are translated into all of them.
- Windows app: the error dialog names the real reason of a failed start (log of the backend of this attempt, otherwise its error output) instead of only "The backend ended during start (exit code 1)".
- The app starts in the language of the operating system (English if it is not translated); Settings → System offers "Same as the operating system" besides the fixed languages.
- Update check: a refused or failed request shows a short message (e.g. "HTTP 403") instead of the whole answer of the server.
- CI: a push to a branch no longer starts a pipeline; it is started by hand (Build → Pipelines → New pipeline). Merge requests and tags still start theirs automatically.
- CI: Node.js 22.23.3 on the Windows runner, downloaded from nodejs.org (dependencies need 22.13 or newer; the Chocolatey package does not carry every patch version). The Windows build caches npm, Electron and PostgreSQL, the virus scanner ignores the build folder, the log has timestamps, and the build no longer publishes by itself.
- Upload library multer 1.x (known vulnerabilities) replaced by multer 2.x.
- The installer contains exactly the versions of the backend dependencies from `package-lock.json` (generated lock file for the stage, `npm ci`) instead of the newest matching ones of the build day.
- Windows installer is 22 MB smaller (150 MB): only the Chromium language files of the app languages are kept (`electronLanguages`), and the bundled PostgreSQL leaves out programs and files the app never uses (`desktop/scripts/prune-postgres.mjs`: only postgres, initdb, pg_ctl, pg_dump and pg_restore with the DLLs they load, no contrib modules, no translated server messages).
- The shell of the Windows app is bundled into one file (esbuild) so the installer contains the updater.
- Settings page: one column with the always visible block "System" and collapsible blocks (font and colours, family tree appearance, family tree behaviour, data and backup) that show their current values while closed.
- Family tree: cards have a fixed width so they never overlap; partner and family lines follow moved cards.
- English is the default language; the language is chosen only under Settings (no longer in the top bar).
- The application is called **Cognatio** (formerly Generatio).
- Repository structure: npm workspaces with one lockfile in the root, scripts in `scripts/`, frontend organised by feature (`src/features/`), backend `lib/` grouped into `search/` and `files/`.
- All code, comments, log messages and documentation are in English; ESLint enforces the Google/Microsoft TypeScript guidelines.
- Tooling: Jest 30 (backend), ESLint 10 with typescript-eslint 8 in backend and frontend (frontend moved to the flat config `eslint.config.mjs`), Playwright pinned to 1.63.0 to match the CI image; lockfile regenerated; Tailwind CSS 4 (Vite plugin, theme in `index.css`, no PostCSS/Autoprefixer); `npm audit --omit=dev` reports nothing, the remaining moderate findings are in the installer tooling (electron-builder, development only).
- Database migrations are applied by an own runner instead of `prisma migrate deploy` (no Prisma CLI needed at run time; downgrade guard).

### Added

- Media: a download button on every file (media tab of a person, also on the files of other persons linked with its events, and on the thumbnails in the timeline) saves it under its original name instead of the generated one it is stored under. New route `GET /api/v1/media/:id/download` (only media of the active family tree, `?familyTree=`; streamed, so the size does not matter); the desktop app accepts downloads only from its own backend and asks where to save them.
- Public repository on GitHub: `.github/workflows` runs the checks of `.gitlab-ci.yml` (`ci.yml`), builds the Windows and Linux apps for a trial (`desktop-build.yml`), publishes a release for a tag (`release.yml`: GitHub release with installer, portable ZIP, AppImage, `.deb`, checksums and feed files; test versions as pre-releases, the beta channel in the pre-release `beta-channel`) and runs CodeQL (`codeql.yml`). The installed apps take the feed from the project address (`desktop/src/feeds.ts`: GitHub `releases/latest/download`, GitLab permalink). `scripts/public-snapshot.mjs` targets GitHub by default (`--host`), turns the release address into the GitHub form and adds later releases as one commit each to a clone of the public repository (`--into`).
- Person form and the new person in the relation dialog: the box "First name unknown" saves a person without a known first name (shown as "(first name unknown)"); the help no longer tells to enter "?", which the form refuses.
- Notes can be up to 10,000 characters long; the field shows how many are used, and the backend refuses longer ones (`NOTE_TOO_LONG`).

- Person page: a filter field next to the tabs narrows the entries of the open tab (life events, relations, notes, media) while typing – case and accents are ignored, all words must occur, matches are highlighted, and the relation graph shows only the remaining persons. The text stays when switching tabs; Esc or the X clears it. The Overview tab has no filter.
- Relations tab of a person: a graph draws the relations as a diagram beside the list (above it on narrow screens) – parents above, partners beside, children below; a click on a person opens them; the button "Graph" hides or shows it, the choice is remembered per device.
- Life events of a person (tab Life story / Timeline): choose the order, newest first (default) or oldest first, and show them as a table (date, event, category, place, description, files, edit and delete) besides the timeline; the choices are remembered per device.
- GEDCOM import: languages that another program writes as a name ("German", "Deutsch") or a language tag ("de-AT") are stored as the language code, like the app does itself; unknown names stay as they are.
- Example family tree "Familie Kraft (Demo)" (`demo/Cognatio-Demo-Familie-Kraft.zip`, 4 MB): ten fictional persons in four generations with relations, life events, notes and 19 AI-generated photos. The desktop app creates it on the first start, so it does not open without a family tree (once per installation, the installer contains the file). The help points to it.
- Deceased persons (date or place of death entered) show a black mourning ribbon on the family tree cards, the person cards and the profile; Settings → Family tree: appearance can switch it off.
- Help: new chapter "Desktop app" (install, data folder, updates), more detail in the chapters Settings and Relations (appearance, system block, log export, automatically derived relations), the start page and the tile/list view of media, and new questions (where the data is stored, moving to another computer, updating); the version history names the Linux app. All ten languages.
- Linux app: the same app as an AppImage (x64) that puts itself into the application menu and updates itself like the Windows one (`latest-linux.yml`, beta channel `beta-linux.yml`), and as a Debian package (`.deb`, brings its libraries along via apt, no self-update). The release pipeline builds it (manual job `build:linux` for a trial run); PostgreSQL is built from the official source (no ICU/OpenSSL, runs from any folder).
- Windows app: update channel in Settings → System ("Released versions only" or "Also test versions (beta)"). `npm run release:beta` publishes test versions (tag `vX.Y.Z-beta.N`) that only the beta channel sees; going back to released versions never installs an older version.
- Help: chapter "Version history" with an entry per version (newest first), the main features of 1.0.0 linking to their help chapters, translated into the language of the app; a button switches to the English original.
- Windows app: if an update of the database fails after earlier migrations of it were applied, the safety backup taken before is restored automatically, so the previous version still works with the data (tested with the real PostgreSQL).
- Windows app: no menu bar any more (only the app is shown) and a _Quit_ button at the end of the sidebar.
- Uploaded files of any type are sent as a download unless they are images, PDF, video or audio (HTML and SVG files can no longer be displayed under the address of the app).
- `scripts/BuildAppInstaller.bat` / `.ps1`: build the Windows installer locally for testing (optionally with the portable ZIP).
- Pipeline: manual job `build:windows` builds the Windows installer without a release (trial run, artifacts for seven days); `release:windows` shares its build steps.
- Open-source licences: `THIRD-PARTY-NOTICES.md` (generated by `npm run notices`, checked by the release pipeline) with the licence texts of all shipped npm packages, shown under Settings → System and installed with the Windows app; `license` field (GPL-3.0-or-later) in all `package.json` files; licence section in the README.
- `CONTRIBUTING.md`: pull requests only after agreement (issue first); contributions are signed off under the Developer Certificate of Origin, no CLA.
- PostgreSQL server log (`logs/postgres.log`) is rotated at the start from 5 MB on, the last 3 files are kept.
- Windows installer: app icon (installer, uninstaller, program) and, on an interactive uninstall, the question whether to delete the data too – with a hint to export first and a second confirmation; a silent uninstall (also during updates) never deletes data.
- `scripts/public-snapshot.mjs`: prepares a new repository with a single commit of a release (no development history), rewrites the project address of the update feed and refuses to continue if private data is left.
- Updates of the Windows app: looks for a new version at the start and daily (switch, _Check now_ and _Restart and install_ in Settings → System), downloads in the background, stops the database before it installs; feed is the newest GitLab release (`COGNATIO_UPDATE_URL` for another one). Tested with a real update from 1.0.0 to 1.0.1 (`desktop/scripts/update-test.mjs`).
- Portable ZIP of the Windows app (`desktop/scripts/portable.mjs`): a `portable` file next to the program keeps all data in `data/` next to it.
- Release process: `npm run release` (commit-and-tag-version) raises the version from the Conventional Commits, rolls the changelog and sets the tag; the tag pipeline builds installer, portable ZIP, `SHA256SUMS` and update feed and publishes the GitLab release; signing is prepared (variables `CSC_LINK`, `CSC_KEY_PASSWORD`). [Release checklist](documentation/release-checklist.md).
- Upgrade matrix test: every earlier state of the migration chain is filled with test data (`backend/prisma/upgrade-fixtures/`), migrated to the current version and compared with a fresh database (job `test:upgrade`).
- Windows app (`desktop/`): Electron shell that starts the backend with the bundled PostgreSQL, one window, single instance, token cookie, "Save as" dialog through the platform layer, error dialog with restart and log folder, NSIS installer per user (`npm run desktop:dist`), smoke test with the real app. The backend stops itself when the shell disappears.
- Bundled PostgreSQL for the Windows app (`COGNATIO_PG_DIR`): the backend creates the database on first start (UTF-8, scram-sha-256, random password in `config.json`), runs it on `127.0.0.1` on a free port, recovers after a crash, makes safety backups (`pg_dump`, before every migration and daily, last 5 kept, in `backups/db`) and stops it on exit or on a `shutdown` message. `npm run postgres:fetch` downloads and slims the binaries.
- `scripts/StartApp.bat` / `StartApp.ps1`: start the production version (database, build, backend serving the frontend, browser).
- `FRONTEND_DIR`: the backend can serve the built frontend itself (with fallback for client-side routes, cache headers and a Content-Security-Policy) – first step of the Windows app.
- Languages: Spanish, French, Italian, Portuguese, Polish, Dutch and Ukrainian (besides English, German and Russian).
- Project documentation: architecture, code guidelines, adding a language, feature planning; `CONTRIBUTING.md`, `SECURITY.md`, `.editorconfig`, Prettier configuration.
- Settings → Appearance: font (Inter, serif, highly legible, system, monospace), font size, accent colour, line style/width/colour, partner line, card size, corners, border, photo and dates, border colours by gender and tree background – with a live preview; stored per device.
- Settings → System: status and versions of backend and frontend, data in the database, log level of the running server, log viewer (server and browser), log export for the error analysis and clearing the logs.
- Settings search: finds a setting, opens its block and focuses the field.
- Media of a person can be shown as tiles or as a list.
- Preparation for the Windows app: one data folder (`COGNATIO_DATA_DIR`), access token for a local backend (`COGNATIO_ACCESS_TOKEN`), `HOST`, free port with `PORT=0`, migrations on start (`MIGRATE_ON_START`), configurable backend address in the frontend (`VITE_API_BASE`, platform layer for saving files).
- Test that every field of every table survives a backup (fields read from the Prisma schema).
- ESLint reports PostgreSQL-only database features (raw SQL, case-insensitive mode, list filters) outside `backend/src/lib/search/`.
- One version for the whole product: `npm run version:check` (in the pipelines) and `npm version` keep backend, frontend and e2e in step.

### Fixed

- Desktop app: language, colour scheme, chosen family tree and the views were forgotten at every start, because the backend got a new port each time and the page with it a new origin (and an empty local storage). The port of the first start is kept in `desktop.json`; if it is taken, the backend takes a free one (`COGNATIO_PORT_FALLBACK`) and the shell keeps that from then on.
- Start and end of relations were shown one day early west of UTC (e.g. in Brazil): they are stored as midnight UTC and are now shown as that day everywhere.
- Desktop app: cancelling the "Save as" dialog no longer counts as saved – a restore with "Also download the current state" does not start without that copy, and export and backup report success only for a saved file.
- Desktop app: when the backend does not end in time or is killed, the shell stops its database server, and the backend stops it also after an error while shutting down – a server left running would lock the program folder for the next update.
- Linux AppImage: the menu entry of a file whose path contains `%` or a backslash is written as the Desktop Entry Specification asks.
- A data folder the backend creates (`COGNATIO_DATA_DIR`) is readable by the user only.
- `desktop/scripts/update-test.mjs` deleted `%APPDATA%\Cognatio` at the end – on a machine with an installed Cognatio that is its data; the test now refuses to run there.

- Life events without a saved sort order (e.g. imported from a GEDCOM file) are placed by their date instead of by the text of the date; the example family tree carries the sort order of its events.
- Example family tree: the years on the banners of two photos ("ABI '98", "Absolventenfeier 2003") now match the dates of the events (1969, 1974); the file is built anew.
- Life events show only the date as typed; the kind of precision ("Exact (day, month, year)") is no longer written behind it.
- A person can no longer become their own ancestor: a parent-child relation that would close a circle is refused (new message "CYCLE"). The same check applies when a relation is changed or restored.
- Changing a relation checks for duplicates like creating one does, and a relation that becomes a parent-child relation derives the second parent and the siblings; a relation that is restored is checked too.
- Deleting a medium removes its use as profile picture and the medium itself in one transaction.
- Statistics: equally frequent last names and places are sorted by the language of the app instead of always by German rules, and spellings are grouped regardless of the language.
- The backend build now copies the generated Prisma client to `dist`; `npm start` failed without it.

### Removed

- Obsolete transition logic (phonetics backfill, settings migration, deprecated fields).

## Earlier work

Person, relation, event, note and media management with approximate dates; family tree views (family tree, ancestors, descendants, network) with PNG/SVG/print export;
several family trees with a recycle bin; phonetic cross-field search and duplicate hints; import/export (ZIP, GEDCOM 5.5.1/7.0 with media, re-import recognition);
full backup and restore; statistics; help page with search; accessibility (WCAG 2.1 AA checked with axe-core); security headers; automatic backup container; unit, component and end-to-end tests.
