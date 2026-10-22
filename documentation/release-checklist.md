# Release checklist

How a version of Cognatio is released (concept: [distribution-concept.md](distribution-concept.md), chapter 6). One person
works through this list; the pipelines do the building and publishing.

Two repositories: development happens in the **private repository on GitLab** (full history, `.gitlab-ci.yml`). The
**public repository on GitHub** gets one commit per release without the history (`scripts/public-snapshot.mjs`); its
release workflow (`.github/workflows/release.yml`) publishes the release that the installed apps update from. Both run
the same checks (`.gitlab-ci.yml` and `.github/workflows/ci.yml`); a change to one belongs into the other as well.

## 1. Before the release

- [ ] `main` is up to date, the working tree is clean, the pipeline of the last commit is green (lint, unit tests, E2E,
      **upgrade matrix** `test:upgrade`). On GitLab a push starts no pipeline: start it by hand (Build → Pipelines → New
      pipeline).
- [ ] `CHANGELOG.md`: everything user-visible is below `## [Unreleased]`, in the sections _Added_, _Changed_, _Fixed_,
      _Removed_ (the notes of the release page are taken from there). `npm run release:notes -- --unreleased` shows them.
- [ ] Help chapter "Version history": the new version with its main changes is added to `RELEASES` in
      `frontend/src/features/help/releases.ts` and to every `frontend/src/features/help/releaseNotes/<language>.ts`
      (English is the original; the tests check that all languages have all entries). The `date` of the entry is the day of the
      release (an entry written in advance has none until then; check its version against `npm run release:dry`).
- [ ] **New migration since the last release?**
  - [ ] It follows the rules of the migration policy (concept 3.4): forward only, expand before contract, never edit a
        released migration.
  - [ ] If it changes existing tables: a fixture `backend/prisma/upgrade-fixtures/<migration name>.sql` with data valid
        right after that migration exists, so the upgrade matrix covers it.
  - [ ] Tried on a **copy of real data**: Settings → Backup → download in the old version, restore in a development
        installation of the new one, look through the trees.
- [ ] Backup format: `version` in the backup manifest is only raised for incompatible changes; older backups still import.
- [ ] `npm run notices:check` is green (after changing dependencies run `npm run notices` and commit `THIRD-PARTY-NOTICES.md`; the pipeline checks it). A package with a licence that is not on the list in `scripts/third-party-notices.mjs` stops the script: replace the package or extend the list on purpose.
- [ ] `npm run version:check` is green (one version in backend, frontend, e2e, desktop and the lock file).

## 2. Create the release

```bash
npm run release:dry      # shows the new version and what would happen (version from the Conventional Commits)
npm run release          # raises the version, rolls the changelog (Unreleased → X.Y.Z), commits and tags vX.Y.Z
git push --follow-tags origin main
```

- First release (no tag yet): `npm run release -- --first-release` keeps 1.0.0.
- Force a version: `npm run release -- --release-as minor` (or `major`, `patch`, `1.4.0`).
- Rules for the number (concept 6.1): `fix` → patch, `feat` → minor, breaking change → major.

In the private repository the tag starts the GitLab release pipeline: `release:check` (tag = version, notes exist) →
`release:windows` (installer, portable ZIP, `SHA256SUMS`, update feed `latest.yml`; signed if the variables `CSC_LINK`
and `CSC_KEY_PASSWORD` are set) and `release:linux` (AppImage, `.deb`, `SHA256SUMS-linux`, update feed `latest-linux.yml`) →
`release:publish` (GitLab release with notes and files; it waits for both builds, so a failed Linux build stops the release page).
That release stays in the private project – it is the dress rehearsal. Then the release goes to the public repository:

```bash
# clone of the public repository next to this one, once: git clone https://github.com/<owner>/<name>.git ../cognatio-public
node scripts/public-snapshot.mjs --project <owner>/<name> --name "<author name>" --email <noreply address> --forbid "<word>,<word>,..." --into ../cognatio-public
cd ../cognatio-public
git push origin main --follow-tags
```

The script replaces the files of the clone with those of the tagged commit, points the addresses to the public project,
refuses to continue if private data is left (see "First release" below) and commits "Cognatio X.Y.Z" with the tag. The
tag starts `.github/workflows/release.yml`: `check` (tag = version, notes) → `ci` (all checks; a finding of `npm audit`
in the shipped packages stops it) → `build` (`desktop-build.yml`: the same Windows and Linux files as above; signed if the
repository secrets `CSC_LINK` and `CSC_KEY_PASSWORD` are set) → `publish` (GitHub release with notes, files and both
`SHA256SUMS` files; it waits for both builds). Without `CSC_LINK` the release notes end with the section "Windows warning (installer not signed yet)": what SmartScreen shows and
how to compare the download with `SHA256SUMS` (`unsignedNote` in `scripts/lib/changelog.mjs`). The section disappears on its own once
the installer is signed. Plan for signing: SignPath Foundation (free for open source, needs the public repository and an
application); the pipeline then has to send the installer to SignPath and build `latest.yml` from the signed file. Together with
signing switch on the fuse `enableEmbeddedAsarIntegrityValidation` in `desktop/electron-builder.yml` (the other fuses are already set).

### Test versions (beta channel)

A test version goes to the people who chose "Also test versions (beta)" in Settings → System; everybody else keeps getting
real releases only. Use it before a release with a risky change (migration, update, installer).

```bash
npm run release:beta:dry   # 1.4.0-beta.0, then 1.4.0-beta.1, ...
npm run release:beta       # raises the version to X.Y.Z-beta.N, does NOT roll the changelog, tags vX.Y.Z-beta.N
git push --follow-tags origin main
```

- Public repository (GitHub): `public-snapshot.mjs --into` and the push work as for a release. The workflow publishes
  the test version as a **pre-release** ("latest", which the stable channel reads, stays on the last real release) and
  replaces `beta.yml` and `beta-linux.yml` in the pre-release `beta-channel` (`desktop/scripts/channel-feed.mjs` makes the
  addresses absolute; the first release workflow creates `beta-channel`). Every real release replaces them too, so beta
  users move on to it.
- Private repository (GitLab): the tag pipeline builds the installer and uploads it to the package registry like a
  release, but creates **no GitLab release** and uploads the feed as `beta.yml` (Linux: `beta-linux.yml`) to the package
  `cognatio-channel/beta`. GitLab must allow duplicate uploads for generic packages (default) – the newest `beta.yml` is
  what the address serves.
- The notes of a test version are what stands below `## [Unreleased]` in the changelog; the final `npm run release`
  rolls them into the release section (`--release-as 1.4.0` if the version does not jump from the beta on its own).
- Going back: choosing "released versions only" never installs an older version – it waits for the next release.
  A database that a test version migrated cannot be opened by an earlier version (the app says so); the safety
  backup taken before the update stays in `backups/db`.
- Test the channel: `node desktop/scripts/update-test.mjs --old <setup.exe> --feed <folder with the test installer, its blockmap and beta.yml> --beta`
  (build the test installer with `npx electron-builder --win -c.extraMetadata.version=1.4.0-beta.1` in `desktop/`).

## 3. After the pipeline

The checks are about the release page of the public repository on GitHub (the private GitLab release has the same files).

- [ ] The release page lists: `Cognatio-Setup-X.Y.Z.exe`, `Cognatio-X.Y.Z-portable.zip`, `SHA256SUMS`, `latest.yml`, the
      `.blockmap`; the notes are the changelog section.
- [ ] `Cognatio-X.Y.Z.AppImage`, `Cognatio-X.Y.Z.deb`, `SHA256SUMS-linux` and `latest-linux.yml` are on the page too.
- [ ] `https://github.com/<owner>/<name>/releases/latest/download/latest.yml` answers with the new version (a test
      version: `…/releases/download/beta-channel/beta.yml` names it); the repository has to be public for the installed
      apps to read it.
- [ ] Checksum of the downloaded installer matches `SHA256SUMS` (`Get-FileHash`), of the Linux files `SHA256SUMS-linux` (`sha256sum -c`).
- [ ] **Signature** (only if signed): file properties → digital signatures; no SmartScreen warning on a clean machine.

## 4. Tests on real Windows (before telling anybody)

Trial run of the build without a release: in GitLab start a pipeline of the branch by hand (Build → Pipelines → New
pipeline) or open the one of the merge request, then start the manual job `build:windows` (play button). It builds
installer and portable ZIP on the Windows runner the same way as `release:windows`; the installer and `latest.yml` stay as
artifacts for seven days, nothing is published. `build:linux` does the same for AppImage and `.deb` (artifacts as well).
On GitHub the same is Actions → Desktop build → Run workflow (artifacts `app-windows` and `app-linux`). Do it once in the
public repository before the first tag.

Automatic helpers in `desktop/scripts/` (`update-test.mjs` exists for Windows only) – run them with the installers from the release (or from `npm run desktop:dist`):

- [ ] **Smoke test of the installed app:** install the setup file on a clean Windows (VM), start Cognatio – the example family
      tree "Familie Kraft (Demo)" is there on the first start –, create a family tree and a person with a photo, make a backup (Save-as dialog), close – no `postgres.exe` or `Cognatio.exe` stays
      in the task manager. (`node desktop/scripts/smoke.mjs --packaged <path>\Cognatio.exe` does the technical part: the fuses
      switch `--inspect` off, so it drives the page through `--remote-debugging-port` and skips the checks of the main process;
      close a running Cognatio first.)
- [ ] **Update from the previous version:** install the previous release, then
      `node desktop/scripts/update-test.mjs --old <previous setup.exe> --feed <folder with the new setup.exe, its blockmap and latest.yml>`
      → _versionAfter_ is the new version, _dataKept_ lists the trees created before, _processesLeft_ is 0.
      Also once by hand with the real feed (Settings → System → Check now). The test refuses to run where
      `%APPDATA%\Cognatio` exists (the folder of an installed Cognatio): use a clean machine or VM.
- [ ] **Portable ZIP:** unpack, start – `data/` appears next to the program, Settings shows no update block.
- [ ] **Portable ZIP on a USB stick** formatted with exFAT (the usual format): start from the stick, create a person with a
      photo, quit, start again – the data is there and the database starts without an error (PostgreSQL on exFAT is untested).
- [ ] **Confirmation dialogs:** delete a note (the app asks), then type into a text field right away – the field takes the
      input (Electron on Windows has a known problem with the focus after native `confirm` dialogs).
- [ ] **Uninstall** (Apps & features): the data question appears (Cancel aborts, No keeps `%APPDATA%\Cognatio`, Yes asks a second time); silent `/S` uninstall keeps the data, `/S --delete-app-data` removes it.
- [ ] **Linux:** make the AppImage executable and start it on a clean Ubuntu LTS and Fedora (desktop session; the menu entry appears),
      install the `.deb` with `sudo apt install ./Cognatio-X.Y.Z.deb` on the current Ubuntu LTS (starts without `--no-sandbox`; `/etc/apparmor.d/cognatio` exists; tried on 26.04 for 1.0.0); create a tree, make a
      backup, close – no `postgres` process stays. `node desktop/scripts/smoke.mjs --packaged <unpacked app>/cognatio` does the technical part
      (build it with `npm run dist:linux -w desktop`; the unpacked app is `desktop/release/linux-unpacked`).
- [ ] User name with umlaut and space, program on a path with spaces: start works (the smoke test uses such paths).
- [ ] **Only in a release that changes the PostgreSQL major version** (new app major version; also the release after 1.0.0, 16 → 18): `MAJOR` and `UPGRADE_FROM` in
      `scripts/fetch-postgres.mjs` are set (the checksum of a new version is pinned there), `desktop/stage/postgres/upgrade/<old>`
      exists after the build, and with `COGNATIO_PG_UPGRADE_DIR=desktop/stage/postgres` (converts with the slimmed servers of the
      installer; the old data comes from `tools/postgres/upgrade/<old>`) the upgrade test of
      `backend/src/lib/postgres/__tests__/bundledPostgres.integration.test.ts` passes. Developers run `npm run db:upgrade` once.
      By hand: install the previous release, create data, update – the data is there, `pgdata-<old>.old` lies next to `pgdata`.

## 5. Afterwards

- [ ] Open issues and the roadmap noted in `documentation/` still match; announce the release.
- [ ] A bad release: do **not** delete the tag. Fix, release the next patch version – the update feed always points to the
      newest release. (A release with a data-damaging bug: remove its assets from the release page so nobody installs
      it, and release the fix at once.)

## First release in the public repository (GitHub)

The development history up to 1.0 stays private: the public repository starts with **one commit**, and every later
release adds one more (section 2). The private repository on GitLab stays the place of development.

1. Finish 1.0 in the private repository (sections 1 to 4 above, apart from the steps that need the public repository)
   and run `npm run release -- --first-release` there (changelog rolled, tag `v1.0.0`).
2. Create an **empty public repository** on GitHub (no README, no licence file, no `.gitignore`) and note its path
   `<owner>/<name>`. Settings there before the first push:
   - Actions → General: actions allowed; workflow permissions "Read repository contents" is enough (the release job asks
     for write access itself).
   - Make it public (Settings → General → Danger Zone → Change visibility) before the tag: the installed apps read the
     update feed anonymously, and the security features below are free for public repositories only.
   - Advanced Security: secret scanning and push protection on (the counterpart of the secret detection of GitLab),
     Dependabot alerts on, private vulnerability reporting on ("Report a vulnerability", see `SECURITY.md`). Code
     scanning needs no "default setup": CodeQL runs as `.github/workflows/codeql.yml` (skipped while the repository is
     private); start it once by hand and look through Security → Code scanning before the tag.
   - Optionally the repository secrets `CSC_LINK` and `CSC_KEY_PASSWORD` (signing).
3. Create the snapshot (nothing is pushed):

   ```bash
   node scripts/public-snapshot.mjs --project <owner>/<name> --name "<author name>" --email <noreply address> --forbid "<word>,<word>,..."
   ```

   The script exports the files of the tagged commit without history, points the update feed and the links to the new
   project (`--host gitlab.com` for a public project on GitLab instead), **refuses to continue if private data is
   left** (the old project address and every word given with `--forbid`: private e-mail address, real names, local
   paths – the words are never written into a file of the repository) and makes one commit "Cognatio 1.0.0" with tag
   `v1.0.0` under the given identity. `--trial` takes an untagged state and sets **no tag** (commit "Cognatio 1.0.0
   (not released yet)"): pushing it runs the checks of the public repository but publishes nothing – the way to upload a
   state before the release; a later run with `--into` adds the next state. `--tree <commit>` exports another state
   (e.g. `git stash create` for uncommitted changes). With a clone of the empty repository instead of a new folder, give
   it with `--into` (the remote is then already set).

   To start the public history with the release itself instead of on top of trial states, empty the clone first:
   `git checkout --orphan fresh` and `git rm -rqf .` in the clone, run the script with `--into`, then
   `git branch -D main`, `git branch -m fresh main` and push with `git push --force-with-lease origin main` (only before
   the first tag – a published history is never rewritten).

4. Check the folder it created (it is a complete repository), then push by hand – first without the tag, so the checks
   and a trial build run before anything is published:
   `git remote add origin https://github.com/<owner>/<name>.git`, `git push -u origin main`; the workflow CI runs, start
   Actions → Desktop build → Run workflow. Pushing the workflows needs a token with the `workflow` scope (or the login of
   Git Credential Manager).
5. When both are green: `git push origin v1.0.0`. The tag starts the release workflow (section 3 of this list). The
   repository has to be public: the installed apps read the update feed anonymously.
6. Later releases: section 2 (`--into` a clone of the public repository). Check before every push that no private data
   goes in: the checks of the script are a good list (e-mail addresses, real names, absolute paths).

## Not yet part of the process

Code signing certificate, Android/iOS: see concept chapters 6 and 7.
