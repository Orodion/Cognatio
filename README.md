# Cognatio – family tree

Cognatio is a modern web application for managing and visualising family trees.

## Features

- **Several family trees** managed separately: create, rename, switch (selection in the sidebar), move to the recycle bin; every page shows only the open one
- **Persons** created and edited – with flexible dates (`04.01.1980`, `01.1980`, `1980`, `about 1980`, `1980-1985`; the precision is detected automatically), calendar popup, languages and validation
- **Relations** (mother, father, child, sibling, husband/wife, life partner, partner) with an optional period; derived relations are added automatically (e.g. a child also for the parent's spouse); the person can be created right in the relation dialog, parent-child relations start automatically with the child's birth
- **Family tree** as an interactive graph (parent → child, partners dashed) with the views **ancestor chart**, **descendant chart** and **relationship network**, a selectable focus person and generation depth; export (complete or the visible area) as **PNG/SVG** or **print/PDF**
- **Life events, notes and media** per person, including a **profile picture**; life events as timeline or table, relations also as a **graph**, and a **filter field** that narrows the open tab while typing
- **Search** across all details including life events and notes, with **phonetic name matching** (Cologne phonetics: "Maier" also finds "Meyer") and a hint about possible **duplicates** when creating a person
- **Recycle bin:** deletions can be undone, restored or made permanent
- **Import/export:** complete ZIP export (data + media) and GEDCOM 5.5.1/7.0 for other genealogy programs, optionally with images and documents (GEDZIP); import into the open or a new family tree, with preview, a backup beforehand and the strategies overwrite, merge (newer wins) or decide manually; a repeated GEDCOM import recognises existing persons; import history
- **Statistics:** key figures, age distribution, most common last names, places of origin and generation overview
- **Accessible** according to WCAG 2.1 AA (checked automatically), fully usable by keyboard; smooth even with several thousand persons
- **Safety backups** of the database in the Windows and Linux app (before every update and daily)
- **Backup/restore** of all family trees under Settings: one file with everything (including media and the recycle bin); the restore checks the file first, asks for a typed confirmation word and saves the current state automatically beforehand
- **Multilingual** (English by default, German, Spanish, French, Italian, Portuguese, Polish, Dutch, Russian, Ukrainian); the language is switched under Settings; further languages are added by dropping in a file – see [documentation/adding-a-language.md](documentation/adding-a-language.md); light and dark mode (by default like the operating system)
- **Help** in all languages with search; the ? button at the top opens the section for the current page
- **Settings:** language, colour scheme and default view of the family tree per device; state of the backup and the server

Technical overview: see [architecture](documentation/architecture.md).

## Architecture

The project consists of three main components:

- **Database:** PostgreSQL 16 (development: the same PostgreSQL the Windows app bundles, started with `npm run db:start`)
- **Backend:** Node.js, Express, GraphQL (Apollo Server), Prisma ORM; file upload via REST (`/api/v1/media/upload`)
- **Frontend:** React 18, Vite, TypeScript, Apollo Client, Tailwind CSS, components in shadcn/ui style, react-i18next

### Project structure

| Folder           | Content                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/`       | GraphQL API, Prisma schema (`prisma/schema.prisma`), REST routes for upload, import/export (`src/lib/transfer/`) and backup (`src/lib/backup/`); uploaded files go to `backend/uploads/` (not versioned)                                                                                                                                                                              |
| `frontend/`      | Web UI, organised by feature (`src/features/`); translations in `src/i18n/locales/`, help texts in `src/features/help/content/`                                                                                                                                                                                                                                                       |
| `e2e/`           | End-to-end tests with Playwright                                                                                                                                                                                                                                                                                                                                                      |
| `desktop/`       | Windows and Linux app: Electron shell, installer and package configuration, smoke test (see [Windows app](#windows-app) and [Linux app](#linux-app))                                                                                                                                                                                                                                  |
| `scripts/`       | Start and test scripts for Windows (`start.ps1`, `test.ps1` and `.bat` variants), the local database (`dev-db.mjs`), the PostgreSQL download or build (`fetch-postgres.mjs`), local installer build (`BuildAppInstaller`, `StartApp`), release and licence tooling (`release-*.mjs`, `third-party-notices.mjs`, `public-snapshot.mjs`)                                                |
| `demo/`          | The example family tree "Familie Kraft (Demo)" as an export file with photos (see [demo/README.md](demo/README.md)); the desktop app creates it on the first start                                                                                                                                                                                                                    |
| `documentation/` | [Release checklist](documentation/release-checklist.md), [architecture](documentation/architecture.md), [code guidelines](documentation/code-guidelines.md), [adding a language](documentation/adding-a-language.md), [feature planning](documentation/feature-planning.md), [distribution concept](documentation/distribution-concept.md) (desktop app, releases, later Android/iOS) |
| `backups/`       | Local data, not versioned: default target of the automatic backups                                                                                                                                                                                                                                                                                                                    |

`backend`, `frontend`, `e2e` and `desktop` are npm workspaces of the root `package.json`: one `npm install` in the root folder installs everything (one `package-lock.json`).

## Licence

Copyright (C) 2026 The Cognatio authors. Cognatio is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version (see [LICENSE](LICENSE)). It comes without any warranty.

The family tree and the relationship graph are drawn with [React Flow](https://reactflow.dev) (@xyflow/react, MIT licence); the mark it shows in the corner is hidden. The licences of the components it contains are collected in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) (generated by `npm run notices`, checked in the release pipeline); the desktop app shows them under Settings → System and installs them in the `licenses` folder next to the program. Electron and Chromium bring their own notices (`LICENSE.electron.txt`, `LICENSES.chromium.html`), the bundled PostgreSQL its `server_license.txt`.

Contributing: [CONTRIBUTING.md](CONTRIBUTING.md), security: [SECURITY.md](SECURITY.md), changes: [CHANGELOG.md](CHANGELOG.md).

---

## Starting the local development environment

To run the project locally you need **Node.js 22.12 or newer** (22.x, or 24 and later; for frontend and backend). The database is a PostgreSQL 16 that runs from `tools/postgres` as a plain program (`npm run postgres:fetch` downloads it on Windows and builds it from the official source on Linux, which needs gcc, make and bzip2; elsewhere set `COGNATIO_PG_DIR` to a PostgreSQL 16 folder or run your own server and adjust `DATABASE_URL`).

### Quick start (Windows)

`scripts/start.ps1` (or `scripts/start.bat`) installs the dependencies if needed, starts the database, waits until it is ready, applies pending database migrations and opens backend and frontend in windows of their own. Your data is kept. On Linux run the steps below one by one.

```bash
powershell -ExecutionPolicy Bypass -File scripts/start.ps1
```

Alternatively, run the steps one by one:

### 1. Install the dependencies and start the database

Open a terminal in the root folder of the project, install the dependencies of all parts once, fetch the PostgreSQL binaries (once; about 250 MB on Windows, a few minutes of compiling on Linux) and start the database in the background:

```bash
npm install
npm run postgres:fetch
npm run db:start
```

The server listens on `127.0.0.1:5432` only, keeps its data in `.dev-data/` (not versioned) and has two databases: `cognatio_db` (development) and `cognatio_test` (E2E and upgrade tests). `npm run db:stop` stops it, `npm run db:status` shows its state. `node scripts/dev-db.mjs reset --yes` deletes all local data.

### 2. Start the backend

The backend runs on port 4000. It connects to the database and provides the GraphQL API.
Open a new terminal in the `backend` folder:

```bash
cd backend
npx prisma generate
npm run db:migrate
npm run dev
```

> The GraphQL API and the Apollo Sandbox for testing are now available at **http://localhost:4000/graphql**

### 3. Start the frontend

The frontend runs on port 3000 and forwards API requests (`/graphql`, `/api`, `/uploads`) to the backend automatically.
Open another terminal in the `frontend` folder:

```bash
cd frontend
npm run dev
```

> The web application is now available at **http://localhost:3000**

---

## Configuration

Settings are environment variables; the backend reads `backend/.env` (template: `backend/.env.example`). Everything except `DATABASE_URL` has a default.

| Variable                                  | Meaning                                                                                                                                                                                                                                                                                                                                                                | Default                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `DATABASE_URL`                            | PostgreSQL connection of the backend                                                                                                                                                                                                                                                                                                                                   | see `backend/.env.example`                     |
| `PORT`                                    | Port of the backend; `0` picks a free port                                                                                                                                                                                                                                                                                                                             | `4000`                                         |
| `COGNATIO_PORT_FALLBACK`                  | `1`: if `PORT` is taken, a free port is used instead (the desktop app asks for the port of the last start)                                                                                                                                                                                                                                                             | off                                            |
| `HOST`                                    | Address the backend listens on, e.g. `0.0.0.0` for the network – the backend has no login of its own                                                                                                                                                                                                                                                                   | `127.0.0.1` (this machine only)                |
| `ALLOWED_HOSTS`                           | Further host names the backend answers to (comma-separated), e.g. the domain of a reverse proxy in front of it; IP addresses and `localhost` always work (protection against DNS rebinding)                                                                                                                                                                            | none                                           |
| `COGNATIO_DATA_DIR`                       | One folder for all data of an installation (`uploads/`, `backups/`, `logs/` below it); the single settings below still take precedence                                                                                                                                                                                                                                 | none (development folders)                     |
| `UPLOAD_DIR`                              | Storage of uploaded files                                                                                                                                                                                                                                                                                                                                              | `backend/uploads`                              |
| `COGNATIO_ACCESS_TOKEN`                   | If set, every request needs this token (header `X-Cognatio-Token` or cookie `cognatio_token`; `/api/v1/health` stays open) – for a backend on the user's own machine                                                                                                                                                                                                   | none (no check)                                |
| `COGNATIO_PG_DIR`                         | Folder of the bundled PostgreSQL (with `bin/`; Windows and Linux app). The backend then creates the database in `COGNATIO_DATA_DIR/pgdata`, starts it on a free port at `127.0.0.1`, migrates it, makes safety backups and stops it on exit; `DATABASE_URL` is not needed. Needs `COGNATIO_DATA_DIR`. `npm run postgres:fetch` puts the binaries into `tools/postgres` | off                                            |
| `COGNATIO_UPDATE_URL`                     | Desktop app: address of another update feed (folder with `latest.yml`, on Linux `latest-linux.yml`) instead of the release of the project; also makes an unpackaged app look for updates                                                                                                                                                                               | newest release                                 |
| `COGNATIO_BETA_UPDATE_URL`                | Desktop app: another feed for the beta channel only (`beta.yml`, on Linux `beta-linux.yml`)                                                                                                                                                                                                                                                                            | package `cognatio-channel/beta` of the project |
| `COGNATIO_NO_DESKTOP_ENTRY`               | Linux AppImage: `1` stops it from adding itself to the application menu                                                                                                                                                                                                                                                                                                | off                                            |
| `FRONTEND_DIR`                            | Folder of the built frontend (`frontend/dist`); the backend then serves the web page itself, including the fallback for client-side routes                                                                                                                                                                                                                             | off                                            |
| `MIGRATE_ON_START`                        | `true`: the backend applies pending migrations itself before it starts                                                                                                                                                                                                                                                                                                 | `false`                                        |
| `CORS_ORIGINS`                            | Additional allowed origins (comma-separated)                                                                                                                                                                                                                                                                                                                           | none                                           |
| `IMPORT_MAX_MB`, `IMPORT_MAX_UNPACKED_MB` | Size limit of an import file (packed / unpacked); an export larger than `IMPORT_MAX_MB` is refused, because it could not be imported again; Settings → Data and backup → Size limits overrides it                                                                                                                                                                      | `2048` / twice the limit                       |
| `VITE_API_BASE` (frontend, build time)    | Address of the backend if it does not run under the same address as the page                                                                                                                                                                                                                                                                                           | none (same address)                            |
| `BACKUP_*`, `LOG_*`                       | see [Backup](#backup) and [Logging](#logging)                                                                                                                                                                                                                                                                                                                          |                                                |
| `APP_VERSION`                             | Version shown under Settings → System, e.g. from CI                                                                                                                                                                                                                                                                                                                    | `version` in `package.json`                    |
| `DEV_DB_PORT`                             | Port of the development database (`npm run db:start`)                                                                                                                                                                                                                                                                                                                  | `5432`                                         |

The technical overview (components, data model, API) is in [documentation/architecture.md](documentation/architecture.md).

---

## Backup

The desktop app (Windows and Linux) makes safety backups of its database itself (before every migration and once a day, in `backups/db`). For development there is a manual backup:

```bash
npm run db:backup                                   # backups/cognatio_db_YYYYmmdd_HHMMSS.dump, the newest 14 are kept
npm run db:restore -- backups/cognatio_db_YYYYmmdd_HHMMSS.dump   # replaces the content of cognatio_db
```

The **Settings** page shows the latest backup and warns if it is older than three days; the backend reads the folder `BACKUP_DIR` for this (default: `backups/` next to the `backend` folder). The uploaded files are in `backend/uploads` and are not part of the dump; the backup ZIP under Settings → Backup contains both.

It is simpler in the app: **Settings → Backup → Download backup** creates one file with all
family trees, media, the recycle bin and the import history. **Restore backup…** checks the file first, shows its
content next to the current data and replaces all data after the confirmation word ("LÖSCHEN" in German, "DELETE" in
English) has been typed. Before that the backend stores the current state as `cognatio_before_restore_YYYYmmdd_HHMMSS.zip`
in the folder `BACKUP_DIR` – it can be used to undo the restore; the last three of these files are kept. A backup file larger than `BACKUP_MAX_MB`
(default 2048) is still created, but the app warns that it cannot restore it (the upload of a restore is refused); `BACKUP_MAX_UNPACKED_MB` (unpacked, default 4096) limits what a file may expand to. The limits can be raised in
**Settings → Data and backup → Size limits** (stored in `settings.json` in the data folder; applies at once). The
settings warn above 4 GB: at least twice the file size must be free as memory. Single family trees can
still be saved via **Import/Export**. Export, import, backup and restore hold the whole file in memory; a procedure
that reads the data in parts (for much larger files) is planned.

---

## Database migrations

The database schema is versioned: every change to `backend/prisma/schema.prisma` is committed as a migration under
`backend/prisma/migrations/`. `npm run db:migrate` (folder `backend`, also runs in `scripts/start.ps1`) applies all
pending migrations and creates the database if it does not exist yet. It does not need the Prisma CLI
(`backend/src/lib/migrations.ts`): each migration runs in one transaction, a failed one is undone completely, and a
database that was migrated by a newer version is refused. The bookkeeping is Prisma's table `_prisma_migrations`, so
`prisma migrate dev` and `prisma migrate status` keep working. Migrations must not contain statements that PostgreSQL
forbids in transactions (e.g. `CREATE INDEX CONCURRENTLY`).

Changing the schema (development):

```bash
cd backend
npm run db:migrate:dev -- --name description_of_the_change
```

This creates the migration, applies it to the local database and updates the Prisma client. The new file in
`prisma/migrations/` belongs in the commit.

---

## Logging

The backend writes errors, warnings and requests as **JSON lines** to a log file and to the console.
In a terminal the console output is formatted on one line for readability, otherwise it is JSON as well.

| Variable          | Meaning                                                        | Default                                                                   |
| ----------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `LOG_LEVEL`       | `debug`, `info`, `warn`, `error` or `silent`                   | `info`                                                                    |
| `LOG_FILE`        | Log file (relative to the `backend` folder); empty = no file   | `logs/cognatio.log` (with `COGNATIO_DATA_DIR`: `logs/cognatio.log` in it) |
| `LOG_FORMAT`      | Console: `json` or `pretty`                                    | `pretty` in a terminal, otherwise `json`                                  |
| `LOG_MAX_SIZE_MB` | Size from which the file is rotated (`cognatio.log.1`, `.2` …) | `10`                                                                      |
| `LOG_KEEP`        | Number of rotated files kept                                   | `5`                                                                       |

At **INFO** changes (GraphQL mutations, uploads, imports) and exports are logged, at **DEBUG** also
plain reads; error responses and GraphQL errors appear as **WARN** or, with a stack trace, as **ERROR**.
Content such as personal data or GraphQL variables is not logged.

**In the app** (Settings → System): the log level can be changed while the server is running (it applies until the next
restart, then `LOG_LEVEL` counts again); the log of the server and of the browser can be viewed with a level filter,
exported as one ZIP file for the error analysis (server log files, browser log, versions, no environment variables and
no family tree data) and deleted after a confirmation. The endpoints are `GET /api/v1/logs`, `GET /api/v1/logs/export`
and `DELETE /api/v1/logs`. The log of the browser (console warnings and errors, uncaught errors, failed requests) is kept
in the session storage, limited to the last 500 entries.

**Security:** the backend sets security headers (`helmet`) and a strict Content-Security-Policy for `/api` and `/uploads`.
CORS is switched off because the frontend runs under the same address; further origins can be allowed via
`CORS_ORIGINS` (comma-separated, e.g. `https://studio.apollographql.com`). It listens on `127.0.0.1` by default, answers
only requests under its own address (IP addresses, `localhost`, `ALLOWED_HOSTS`; answer `403 HOST_NOT_ALLOWED`) and refuses
changes that another website sends (`Sec-Fetch-Site`/`Origin`; answer `403 CROSS_SITE_REQUEST`). The desktop app also
needs its access token.

The health check `GET /api/v1/health` reports the state of the application and the database connection
(`200 {"status":"ok","database":"ok"}` or `503` if the database is unreachable).

---

## Windows app

The Windows app runs without Node or a browser: an Electron window around the backend, which starts the bundled PostgreSQL itself (concept: [documentation/distribution-concept.md](documentation/distribution-concept.md)).

```bash
npm run postgres:fetch        # once: PostgreSQL binaries into tools/postgres
npm run desktop:dev           # builds backend and frontend, starts the app (own data folder %APPDATA%\Cognatio-dev)
npm run desktop:dist          # installer: desktop/release/Cognatio-Setup-<version>.exe
node desktop/scripts/smoke.mjs                          # starts the real app and checks it (add --packaged <Cognatio.exe> for an installed one; it is then driven through --remote-debugging-port and the checks of the main process are skipped)
```

- **Start:** one instance only; the shell starts the backend as an Electron utility process at `127.0.0.1` with a random token, always on the same port (kept in `desktop.json`, so the page keeps its settings in its local storage; a free one if it is taken) (sent as an HttpOnly cookie, never in the URL), waits until it is ready and opens the window. Closing the window stops the backend and PostgreSQL.
- **Hardening:** the program file has the Electron fuses for `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS` and `--inspect` switched off and only loads its own `app.asar` (`electronFuses` in `desktop/electron-builder.yml`), so it cannot be used to run other scripts.
- **Data:** `%APPDATA%\Cognatio\` (`pgdata/`, `uploads/`, `backups/`, `logs/`, `config.json`), separate from the program, so updating or uninstalling never touches it. `COGNATIO_DATA_DIR` overrides the folder; a file called `portable` next to the program stores the data in `data/` next to it.
- **Problems:** if the backend or the database does not start or ends unexpectedly, a dialog shows the last error of the log and offers _Restart_, _Open log folder_ and _Quit_.
- **Installer:** NSIS, per user without administrator rights (`%LOCALAPPDATA%\Programs\Cognatio`); the uninstaller keeps the data. Not signed yet (phase 3 of the concept).
- **Example family tree:** on the very first start (empty database) the backend creates "Familie Kraft (Demo)" from `demo/Cognatio-Demo-Familie-Kraft.zip` (the installer carries it in `resources/demo`, `COGNATIO_DEMO_FILE`) so the app does not start without a family tree; a marker file `demo-offered` in the data folder makes sure it happens once, also after the user has deleted it (`backend/src/lib/demo/seedDemo.ts`).
- **Updates:** the app looks for a new version shortly after the start and then once a day (Settings → System → Program updates: switch, _Check now_, _Restart and install_). It downloads in the background and installs when the app is closed or on request; before that the database is stopped in order. The only thing sent is the request for the version file `latest.yml`. The feed is the newest release of the project (`desktop/src/feeds.ts`: GitHub releases of the public repository, GitLab releases of the development repository; see [documentation/release-checklist.md](documentation/release-checklist.md)); `COGNATIO_UPDATE_URL` points the app to another feed. The portable variant is not updated.
- **Portable ZIP:** `node desktop/scripts/portable.mjs` (after `desktop:dist`) zips the program with a `portable` marker file: all data then lives in `data/` next to it.
- **Tests:** `npm run test:desktop` (shell logic, no Electron needed); the smoke test needs Windows or Linux (with a display, `xvfb-run` is enough), the Electron binary and `tools/postgres`.

### Linux app

The same app as an AppImage and as a Debian package (`desktop/release/Cognatio-<version>.AppImage` and `.deb`, x64): `npm run postgres:fetch` builds PostgreSQL (a few minutes, once), then

```bash
npm run dist:linux -w desktop    # AppImage, .deb and latest-linux.yml in desktop/release
node desktop/scripts/smoke.mjs --packaged desktop/release/linux-unpacked/cognatio
```

- **Data:** `~/.config/Cognatio/` (same contents as on Windows). There is no portable variant. Removing the program (deleting the AppImage, `sudo apt remove cognatio-desktop`) leaves the data.
- **AppImage:** one file, `chmod +x` and start it. On the first start it puts itself into the application menu (`~/.local/share/applications/cognatio.desktop` and the icon, no administrator rights); started from another place, the entry follows the file. `COGNATIO_NO_DESKTOP_ENTRY=1` switches that off; deleting the file leaves a dead menu entry to remove by hand.
- **Debian package:** `sudo apt install ./Cognatio-<version>.deb` (Debian, Ubuntu and derivatives) installs the libraries it needs, the menu entry and the sandbox set-up, so no extra switches are necessary. Installed with `dpkg -i` instead, the package stays half set up (dpkg fetches no libraries and the set-up script does not run, so the program stops at the start with a sandbox error): `sudo apt --fix-broken install` completes it. It is updated with the system: download the new package and install it again; the program does not update itself.
- **Updates:** the AppImage replaces itself from `latest-linux.yml` (feed and channels as on Windows, beta channel: `beta-linux.yml`); a program that was started in another way is not updated.
- **Requirements (AppImage):** a desktop distribution with glibc 2.36 or newer (Debian 12, Ubuntu 24.04, Fedora 38 and newer; the pipeline builds on Debian 12), GTK 3 and NSS and FUSE 2 for AppImages (Ubuntu 24.04: `sudo apt install libfuse2t64`). If Ubuntu 24.04 or newer refuses to start it because of the restriction on user namespaces, start it with `--no-sandbox`.

---

## Releases

Version numbers follow Semantic Versioning, one number for the whole product (root `package.json`). `npm run release` raises it from the Conventional Commits, rolls `CHANGELOG.md` and sets the tag `vX.Y.Z`; the tag pipeline builds the Windows installer, the portable ZIP, the Linux AppImage and the Debian package and publishes them as a release. The project is developed in a private GitLab repository; every release goes as one commit without the history to the public repository on GitHub (`scripts/public-snapshot.mjs`), whose release workflow publishes the release the apps update from. The steps and checks are in [documentation/release-checklist.md](documentation/release-checklist.md); `npm run release:dry` shows what would happen.

## Production build

`scripts/BuildAppInstaller.bat` (or `BuildAppInstaller.ps1`) builds the Windows installer locally for testing (`desktop/release/Cognatio-Setup-<version>.exe`; `BuildAppInstaller.bat portable` also builds the portable ZIP).

`scripts/StartApp.bat` (or `StartApp.ps1`) does all of the following in one step: starts the database, builds frontend and backend and runs the app at <http://localhost:4000> (frontend and API on one address), then opens the browser.

```bash
npm ci
npm run build -w frontend                   # static files in frontend/dist
cd backend && npx prisma generate && npm run build && npm run db:migrate && npm start
```

The backend serves the API and the uploads. With `FRONTEND_DIR=../frontend/dist` it also serves the built web page (hashed files cached for a year, `index.html` never, strict Content-Security-Policy), so no separate web server is needed – this is how the Windows app runs. Without `FRONTEND_DIR` a web server has to serve `frontend/dist` and forward `/graphql`, `/api` and `/uploads` to the backend (as the Vite dev server does).

---

## Continuous integration

`.gitlab-ci.yml` runs the stages **lint** (ESLint for backend, frontend and desktop, version, licence notices and script tests), **test** (backend, desktop, frontend and E2E tests with coverage thresholds, the upgrade matrix `test:upgrade`), **build** (backend and frontend), **test_security** (`npm audit` – a finding in the shipped packages stops a release –, GitLab SAST and secret detection) and **release**. A push to a branch starts no pipeline: start it under Build → Pipelines → New pipeline (merge requests and tags still start theirs by themselves). The release stage only runs for tags (`release:check`, `release:windows`, `release:linux`, `release:publish`, see [Releases](#releases)); the manual jobs `build:windows` and `build:linux` build the apps for a trial without publishing anything. On GitHub the same checks run in `.github/workflows/ci.yml` (pushes to `main`, pull requests, by hand), the app builds in `desktop-build.yml` (by hand), the release in `release.yml` (tags) and the static analysis in `codeql.yml`; changes to one pipeline belong into the other as well. Code style rules are described in [documentation/code-guidelines.md](documentation/code-guidelines.md); run `npm run lint` in the root folder before committing.

---

## Running the tests

The project has automated tests for backend and frontend as well as end-to-end tests.
`scripts/test.ps1` (or `scripts/test.bat`) runs all three one after another; the E2E tests need the running database.
In GitLab CI the backend and frontend tests run in every pipeline (`test:backend`, `test:frontend`), the E2E tests (`test:e2e`) in merge requests, on the main branch and for tags. On GitHub every run of the workflow CI includes all of them.
With `--coverage` a minimum coverage applies (`coverageThreshold` in `backend/jest.config.js`, `coverage.thresholds` in
`frontend/vite.config.ts`); if coverage drops below it, the run – and thereby the pipeline – fails.

### Backend tests

The backend uses **Jest**. The database is mocked, so the tests need no active database connection.

```bash
npm run test -w backend
```

To create a coverage report:

```bash
npm run test -w backend -- --coverage
```

### Frontend tests

The frontend uses **Vitest** together with the **React Testing Library**.

```bash
npm run test -w frontend
```

To create a coverage report:

```bash
npm run test -w frontend -- --coverage
```

### End-to-end tests

The E2E tests (**Playwright**, Chromium) check the most important flows in a real browser against real servers:
creating a person with a relation, automatically derived relations, family tree views and export, several family trees,
import/export (ZIP and GEDCOM round trip), backup/restore, statistics, recycle bin, profile picture upload, help,
switching the language and accessibility (automatic WCAG 2.1 AA check with axe-core and keyboard use).

They start their own servers on ports **3100** (frontend) and **4100** (backend) and use their own database
`cognatio_test` and the upload folder `e2e/.tmp/uploads` – the normal development environment and its data stay untouched.
The local database is required (`npm run db:start`).

One-time setup:

```bash
npm ci                                  # in the root folder
npx playwright install chromium         # in the e2e folder
```

Run:

```bash
npm run test:e2e
```

Further commands: `npm run test:ui` (interactive mode), `npm run report` (HTML report of the last run) and
`npm run db:reset` (empties the test database; only possible for databases named `*_test`). The tests need
no reset because they use unique names. The log of the test backend is in `e2e/.tmp/backend.log`
(in CI as an artifact of the job `test:e2e`).
