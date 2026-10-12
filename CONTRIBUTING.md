# Contributing

## Contributions

Bug reports, ideas and questions are welcome as issues. **Please do not open pull requests (merge requests) without agreeing on them first:** open an issue, describe what you would like to change and wait for an answer. Pull requests that were not discussed beforehand may be closed without review.

Why: Cognatio is released under GPL-3.0-or-later, and every contributor keeps the copyright of their own contribution. The only formal requirement is the Developer Certificate of Origin (see below).

## Setup

Requirements: Node.js 22 or newer, a local PostgreSQL 16 (`npm run postgres:fetch` and `npm run db:start` provide one on Windows and Linux). See the [README](README.md) for the full setup.

```bash
npm install          # installs backend, frontend, e2e and desktop in one go (npm workspaces)
```

`scripts/start.ps1` starts the database and both servers. Individual servers: `npm run dev:backend`, `npm run dev:frontend`.

## Before you push

| Command (repository root)                        | What it does                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `npm run lint`                                   | ESLint for backend, frontend and desktop                                                               |
| `npm test`                                       | Unit tests of backend and frontend                                                                     |
| `npm run test:desktop`                           | Unit tests of the desktop shell (when you touch `desktop/`)                                            |
| `npm run test:scripts`                           | Tests of the release and licence scripts (when you touch `scripts/`)                                   |
| `npm run version:check`, `npm run notices:check` | One version everywhere; licence notices up to date (run `npm run notices` after changing dependencies) |
| `npm run test:e2e`                               | End-to-end tests (needs the running database)                                                          |
| `npm run build`                                  | Type check and production build                                                                        |

The pipeline runs the same steps. Coverage thresholds are set in `backend/jest.config.js` and `frontend/vite.config.ts`.

## Code

- Format the code with Prettier (`npm run format`, configuration in `.prettierrc.json`); the pipeline checks it with `npm run format:check`.
- Follow the [code guidelines](documentation/code-guidelines.md); most rules are enforced by ESLint.
- Code, comments, identifiers, log messages and documentation are written in English. Only the translation files contain other languages.
- Every new behaviour comes with a test; UI texts go into all language files (see [adding a language](documentation/adding-a-language.md)).
- The structure is described in [architecture](documentation/architecture.md). Frontend code lives in `frontend/src/features/<feature>/`; only what several features share stays in `components/`, `lib/` and `stores/`.
- Planned work is collected in [feature planning](documentation/feature-planning.md).

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary` in the imperative, e.g. `feat(tree): add descendants view`.
Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`. Add a line to [CHANGELOG.md](CHANGELOG.md) for user-visible changes.

## Developer Certificate of Origin

Every commit of a contribution carries a `Signed-off-by: Your Name <you@example.com>` line (`git commit -s`). It states that you wrote the change or have the right to submit it under the project licence, as described in the [Developer Certificate of Origin 1.1](https://developercertificate.org/). No contributor licence agreement (CLA) is needed.
