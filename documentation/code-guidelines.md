# Code guidelines

The code follows the widely used TypeScript guidelines of Google ([TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)) and Microsoft ([TypeScript coding guidelines](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines)) and the [React docs](https://react.dev/learn/you-might-not-need-an-effect). What can be checked by a tool is enforced by ESLint (`npm run lint` in the root folder, also part of the pipeline).

| Rule                                                           | Source            | Enforced by                                      |
| -------------------------------------------------------------- | ----------------- | ------------------------------------------------ |
| `===` instead of `==` (only `== null` allowed)                 | Google            | `eqeqeq`                                         |
| Braces around every `if`/`for`/`while` body                    | Google, Microsoft | `curly`                                          |
| `const`/`let`, never `var`                                     | Google            | `no-var`, `prefer-const`                         |
| No `any`, no `eval`, throw only `Error` objects                | Google            | `no-explicit-any`, `no-eval`, `no-throw-literal` |
| `switch` always has a `default`                                | Google            | `default-case`                                   |
| `import type` for type-only imports                            | Google            | `consistent-type-imports`                        |
| `T[]` for simple types, `Array<...>` for complex ones          | Google            | `array-type`                                     |
| No `console` in application code (use the logger)              | –                 | `no-console`                                     |
| Hook dependencies are complete                                 | React             | `react-hooks/exhaustive-deps`                    |
| PascalCase types, camelCase variables/functions, no `I` prefix | Google, Microsoft | convention (review)                              |

Deliberate deviations:

- **Non-null assertions (`!`)** are allowed where the invariant is obvious (e.g. `map.get(id)!` right after `map.has(id)`), as the Google guide permits.
- **Default exports** are used where the tooling expects them (Express routers, `App`, i18n instance, help content discovered via `import.meta.glob`).

## Frontend features

`frontend/src/features/<name>/` holds one area of the app (pages, components, `lib/`, `graphql/`, `types/`). ESLint (`no-restricted-imports`, tables `FEATURE_DEPENDENCIES` and `PUBLIC_COMPONENTS` in `frontend/eslint.config.mjs`; tests are exempt) keeps the features apart:

- **Direction:** a feature imports only the features listed for it. `persons` and `family-trees` are the base (`family-trees` uses nothing, `persons` only `family-trees`, `sources`, `statistics` and `tree`); `tree` uses `persons`; `dashboard`, `settings`, `statistics`, `trash` and `transfer` are on top and use the ones they need; `help` uses none. Two pairs use each other on purpose: `persons` and `tree` (the person page draws the relation graph with the tree component, the tree draws persons) and `persons` and `statistics` (the statistics pick persons, the person list shows the persons behind a figure of the statistics, only through `StatisticsFilterChip`). Any other new dependency has to be added to the table, with a reason in the review.
- **What can be imported:** `lib/`, `types/` and `graphql/` of another feature, and the components named in `PUBLIC_COMPONENTS` (`MourningRibbon`, `PersonFormDialog`, `ErrorBox`, `FamilyTree`). Other `components/` and all `pages/` are private to their feature. If a second feature needs a component, either publish it in `PUBLIC_COMPONENTS` or move it to `components/` if it knows nothing about the feature.
- **Shared code** (`components/ui/`, `lib/`) never imports from a feature; `components/layout`, `stores/` and `App.tsx` (the shell) may.
- Use the `@/features/...` alias for other features (no relative paths across features).

## Portability (Windows app now, mobile fork later)

Rules that keep the later move to another platform and database small (see `distribution-concept.md`, section 3.6):

- **No PostgreSQL-only features outside `backend/src/lib/search/`:** raw SQL (`$queryRaw`, `$executeRaw`, `Prisma.sql`), `mode: 'insensitive'`, filters on list columns (`has`, `hasSome`, `hasEvery`, `isEmpty`). ESLint (`no-restricted-syntax` in `backend/eslint.config.mjs`) reports them elsewhere; tests are exempt. Also avoid new PostgreSQL-only schema features (full text with `tsvector`, `jsonb` operators, extensions such as `pg_trgm`) – that part is checked in the review. A justified exception (e.g. `SELECT 1` in the health check) gets an `eslint-disable-next-line` with the reason.

- **File access in the backend only through `backend/src/lib/files/`** (uploads, data folder) and the existing modules for backups and logs. No new direct `fs` calls elsewhere; new kinds of files get a function in `lib/files/`. ESLint (`no-restricted-imports` in `backend/eslint.config.mjs`) reports every import of `fs` outside the modules listed there (besides `lib/files/`, `lib/backup/` and the logs: migrations, built web page, bundled PostgreSQL, example family tree, system information, tests); a new module with a real reason is added to that list together with the reason.
- **Folders from the data directory:** new storage locations derive from `COGNATIO_DATA_DIR` via `dataDirPath()` instead of paths relative to the working directory.
- **Frontend: no direct downloads or hard-coded backend addresses.** Files are saved with `saveFile`/`saveDataUrl`, backend addresses go through `apiUrl` (both in `frontend/src/lib/platform.ts`); the Windows app and later the mobile app plug in their own implementation there. Exception: a plain link with `download` to a backend address from `apiUrl` (e.g. `MediaDownloadLink` with `GET /api/v1/media/:id/download`), so the browser streams a large file to disk instead of holding it in memory; the Windows app catches such downloads itself (`will-download` in `desktop/src/main.ts`, only for its own backend), the mobile app will need its own path for them.
- **Migrations stay plain, transaction-safe SQL** (no `CREATE INDEX CONCURRENTLY`); they are applied by `backend/src/lib/migrations.ts`, not by the Prisma CLI.
