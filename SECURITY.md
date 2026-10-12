# Security policy

## Reporting a vulnerability

Please do not open a public issue for security problems. Report them privately (on GitHub with "Report a vulnerability" under the Security tab, on GitLab as a confidential issue, or directly to the maintainers) with a description and steps to reproduce. You will get an answer as soon as possible; a fix is released before the details are made public.

## Scope and assumptions

- Cognatio is a single-user application without login. It is meant to run on a trusted machine or behind a reverse proxy that provides authentication and HTTPS. Do not expose it to the internet as it is.
- The backend listens on `127.0.0.1` by default, answers only under its own address (protection against DNS rebinding; further names in `ALLOWED_HOSTS`) and refuses changes sent by another website. In the desktop app every request also needs a random token of the current start.
- The backend sets security headers (`helmet`) and a strict Content-Security-Policy for `/api` and `/uploads`.
- The program file of the desktop app has the Electron fuses for `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS` and `--inspect` switched off.
- Dependencies are checked by `npm audit` in the pipeline (a finding in the shipped packages stops a release); SAST and secret detection run on every pipeline.
- Backups and uploads contain personal data: protect the `backups/` and `backend/uploads/` folders like the database.
