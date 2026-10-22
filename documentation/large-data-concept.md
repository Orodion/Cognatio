# Concept: large data (export, import, backup, restore of 50 GB and more)

Status: **phases 1–3 built** (12.10.2026; decisions of the project owner on the same day, see chapter 7). Every long
operation is also listed under **Activity** in the sidebar (frontend `stores/activityStore.ts`, `lib/activity.ts`, page
`features/activity/`): uploads, checks, import, restore, export and backup downloads and media uploads, with progress
and cancelling, kept in memory until the app is closed; downloads are jobs of the backend too (`?activity=<uuid>`), so
the page knows their progress and end also in the browser. Phase 4 stays
optional. Tests: unit and route tests in `backend/`, E2E, and a backup and restore of a 5 GB medium on request
(`COGNATIO_LARGE_TESTS=1 npx jest largeBackup` in `backend/`: about a minute, less than 300 MB more memory). Goal of the project owner (11.10.2026): export, import, backup and restore
handle **50 GB and more** (many photos, maybe videos in events) and read the data **in parts instead of all at once** –
on the desktop and especially later on Android. Up to 1.0.0 the limit of **2 GB per file** applied.

## 1. Starting point (1.0.0)

Every one of the four operations held the whole file in memory, often several times:

| Step                         | Where                                                                                    | Copies in memory                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Upload (import, restore)     | `multer.memoryStorage()` in `transferRoutes.ts`, `backupRoutes.ts`                       | the whole file as a `Buffer`                             |
| Read the ZIP                 | `unzipSync` in `readImport.ts`, `readBackup` in `backup.ts`                              | every entry unpacked as a `Uint8Array`                   |
| Write the media              | `applyPlan` (`Map<string, Uint8Array>`), `restoreBackup` (staging folder)                | from the memory copy                                     |
| Create the ZIP               | `createZip`/`createGedzip` (`exportData.ts`), `createBackup`: `readFileSync` + `zipSync` | all media files plus the finished archive                |
| Safety backup before restore | `writeSafetyBackup` = a complete `createBackup` of the current data                      | the current data a second time, plus a full copy on disk |
| Download in the frontend     | `response.blob()` → `saveFile` (`frontend/src/lib/platform.ts`)                          | the archive in the renderer                              |
| Save in the desktop app      | `preload.ts`: `data.arrayBuffer()` over IPC, `main.ts`: `writeFile`                      | again in the renderer, again in the main process         |

Consequences:

- **Memory:** a restore of a 2 GB backup can peak at roughly 8 GB: upload, unpacked entries, safety backup and its
  archive. A download passes through three processes as a whole.
- **Hard ceilings:** an `ArrayBuffer`/`Buffer` in V8 ends at a few GB, so a backup larger than the limit is created
  but saving it in the desktop app probably fails at the IPC step. fflate writes **no ZIP64**
  (`wzh`/`wzf` in fflate 0.8.3 write 32-bit sizes and offsets): an archive or entry above 4 GB would be damaged.
  Reading with `unzipSync` understands ZIP64, but only from a complete buffer.
- **Freezing:** `zipSync`/`unzipSync` block the event loop; the app does not answer while they run.
- **Twice the traffic:** import and restore upload the file once for the preview and again for the execution.
- **Disk:** the safety backup before a restore copies all current media once more.
- **Media:** a single upload is limited to 50 MB (`MAX_UPLOAD_MB` in `mediaRoutes.ts`), `Media.sizeBytes` is an `Int`
  (`schema.prisma`), so one file can be at most 2 GiB (`MAX_MEDIA_BYTES`). Videos need more.

What is **not** the problem: the data records (persons, relations, events, notes). A tree with 10 000 persons is a JSON
file of a few ten MB. The volume is in the media.

## 2. Principles

1. **Media never pass through memory as a whole.** They go file → stream → file, in chunks of 64 KB to a few MB.
2. **The records may stay in memory** (phase 1). They are validated completely before anything changes, as today
   (all or nothing). Only if trees with hundreds of thousands of persons become real is the record part read in
   parts as well (phase 4).
3. **One upload, one archive on disk.** An uploaded file lands once in a working folder of the data folder; preview and
   execution use it by an id.
4. **The archive stays readable by older versions** as long as it is small: ZIP64 only where it is needed (above 4 GB
   or 65 535 entries). The backup format version stays 1; new manifest fields are optional.
5. **Check before acting:** free disk space and the size of the archive are checked before writing starts.
6. **Long operations show progress and can be cancelled.**

## 3. Building blocks

### 3.1 ZIP library

| Option           | Write ZIP64 | Read from a file (random access) | Runs in Node | Runs in a WebView (Android M2) | Notes                                                                                                              |
| ---------------- | ----------- | -------------------------------- | ------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| fflate (today)   | no          | no (whole buffer or a stream)    | yes          | yes                            | stays for the small things: log ZIP in the frontend                                                                |
| **yazl + yauzl** | yes         | yes (central directory, lazy)    | yes          | no                             | small, no native parts, widely used; yazl can give the final size in advance for stored entries (`Content-Length`) |
| @zip.js/zip.js   | yes         | yes (`Reader` interfaces)        | yes          | yes                            | one library for Node and WebView; bigger API, web streams                                                          |

**Decided: yazl + yauzl** for the backend. yauzl is the most used ZIP reader in Node (Electron and Puppeteer use it
through `extract-zip`); both are plain JavaScript with one dependency each and use Node streams, which fit Express
and files directly. If Android is built as M2 (data layer in the WebView, chapter 4.2 of the
[distribution concept](distribution-concept.md)), zip.js comes in there behind the same interface (3.2).

Reading from a file instead of a stream matters: the central directory at the end of the ZIP tells which entries
exist, how large they are and where they start, so `persons.json`/`data.json` are read first and the media one by one
later – also directly by name for an import that uses only some of them.

### 3.2 Seam in the code: `ArchiveFiles` instead of `Map<string, Uint8Array>`

Today `readImportFile` and `readBackup` return `files: Map<string, Uint8Array>`; `applyPlan`, `restoreBackup` and the
preview (`missingFiles`) only ask for "exists", "size" and "content". A small interface replaces the map:

```ts
interface ArchiveFiles {
  has(name: string): boolean;
  size(name: string): number;
  /** Copies the entry to a file, checks size and CRC32 on the way; rejects on a damaged entry */
  copyTo(name: string, target: string): Promise<void>;
  close(): Promise<void>;
}
```

- One implementation over yauzl (an archive on disk), one over a map for the tests and for GEDCOM without media.
- `applyPlan` and `restoreBackup` already write into staging first and keep the database change in one transaction;
  only the source of the bytes changes.
- Writing gets the counterpart: `createBackup`/`createZip`/`createGedzip` add files by path
  (`zip.addFile(fullPath, name, { compress: false })`) and the JSON part as a buffer; the archive goes into a stream.

### 3.3 Uploads: once, to disk

- `multer.diskStorage` into `uploads/.staging/<purpose>-<random>.upload` (a dot folder, not served) – the same drive as `uploads/`, so the staging can
  rename instead of copy.
- `POST /import/upload` and `POST /backup/upload` store the file and return `{ uploadId, size }`; preview, execute
  and restore take `uploadId` instead of a file. The file hash for the import history is computed while it arrives.
- Uploads are removed after the execution, when a new one starts, after 24 h, and at every start of the backend.
- **Decided: switched at once.** The old fields (`file` in preview, execute and restore) are removed in the same
  version: the frontend and the backend are always shipped together, and the API has no other callers.

### 3.4 Downloads: streamed to the target file

- **Backend:** the archive is written straight into the response (`yazl` → `res`). For stored entries the final size
  is known before the first byte, so the response gets a `Content-Length` and the browser shows real progress.
  Problems such as a missing medium are found before writing starts (as today); an error in the middle aborts the
  download, and the frontend reports it.
- **Browser:** no `fetch` + `blob()` any more; the download is a normal navigation (`<a href download>`). The token is
  the HttpOnly cookie anyway. Errors that are known in advance (limit, tree not found) come from a check request first
  (`GET …?check=1`, a small JSON).
- **Desktop app:** a new bridge function `downloadTo(url, suggestedName)`: the main process shows "Save as" first,
  then lets Electron download the URL into that file (`webContents.downloadURL` + `will-download` with
  `item.setSavePath`), with progress from `item.getReceivedBytes()`. The old `saveFile(blob)` stays for small files
  (log ZIP, tree image).
- **Android later:** the backend writes into the app's cache folder, the share sheet or the Storage Access Framework
  takes the file from there – the same "stream into a file" path.

### 3.5 Backup and restore

- **Decided: the safety backup before a restore stays a complete backup** with all media, as today – it can be
  restored on its own like any other backup. It is now written as a stream (no memory peak), but it still needs the
  space and the time of a full copy. The restore dialog says so when the current data are large (for example above
  4 GB: "the current state is saved first; this needs about … GB and takes a while"). The three newest are kept
  (`KEEP_SAFETY_BACKUPS`).
- **Free space** (`fs.promises.statfs`, Node 22): before a backup on the server, before a restore (staging plus the
  full safety backup) and before an import (sum of the media sizes from the central directory). Too little → a clear
  message with the numbers, nothing written.
- **Integrity – decided: CRC32 and size.** Every ZIP entry carries a CRC32 already; while copying, size and CRC32
  (`zlib.crc32`, Node 22) are checked against the ZIP, which detects a cut or damaged file reliably. `data.json`
  keeps its SHA-256 in the manifest as today. No SHA-256 per medium: it would not detect more damage, and without a
  signature it does not protect against a deliberate change either (the manifest can be changed as well).

### 3.6 Progress and cancelling

- Long operations run as a **job**: `POST` starts it and returns `jobId`, `GET /api/v1/jobs/:id` returns
  `{ phase, done, total, error? }` (bytes), `DELETE` cancels. `oneAtATime` stays and becomes the job queue (one job at
  a time).
- Phases: upload → waiting (for a running operation, e.g. the download of the current state) → check → safety backup → copy media → database.
- Cancelling is possible until the database transaction starts; after that the job finishes (all or nothing stays).
- The frontend shows a progress bar in the import and restore dialogs; the download shows the browser's or the
  desktop app's own progress.

### 3.7 Limits afterwards

- The memory reason for the 2 GB limits disappears. What stays is the protection against ZIP bombs: the unpacked
  size from the central directory must fit on the disk (instead of "twice the limit").
- **Decided: media above 2 GiB, without a fixed limit per file** – only the free space counts (videos, also digitised
  home videos of one or two hours). For that:
  - `Media.sizeBytes` becomes `BigInt` (migration `ALTER COLUMN … TYPE bigint`); GraphQL returns it as `Float`
    (exact up to 8 PiB), the export and backup formats keep a JSON number;
  - `MAX_UPLOAD_MB` in `mediaRoutes.ts` and the check before sending in the frontend are removed, `MAX_MEDIA_BYTES`
    becomes `Number.MAX_SAFE_INTEGER`; `MEDIA_TOO_LARGE` is no longer needed;
  - an export or backup with a medium above 2 GiB cannot be read by 1.0.0 (its check refuses the size) – the message
    there names the reason.
- **Decided: the setting "Size limits" stays, as an optional upper limit.** By default there is no limit; the user can
  set one for import/export and for backup/restore. `IMPORT_MAX_MB` and `BACKUP_MAX_MB` stay for the server operation.
  The warning about the memory (from 4 GB) is removed; the help texts in all languages are adjusted.

### 3.8 FAT32 sticks

A file on FAT32 is at most 4 GB. A 50 GB backup cannot be saved there in one piece. **Decided: a clear message, no
split archives.** If saving fails at the 4 GB limit, the app explains the reason and recommends a drive with exFAT or
NTFS (the desktop app knows the size before the first byte and the error of the file system; the browser only reports a
failed download, so the hint is also in the help). Split archives (`.001`, `.002` …) only if users ask for them – they
would work only in the desktop app, and Explorer cannot open them.

## 4. Phases

| Phase | Content                                                                                                                                                                | Visible to the user                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1     | Reading: `ArchiveFiles` (3.2), uploads to disk with `uploadId` (3.3), yauzl for import and restore, free-space check, CRC32 check                                      | import/restore above 2 GB, one upload instead of two |
| 2     | Writing: yazl for export, GEDZIP, backup and safety backup as streams (3.4 backend, 3.5); `Media.sizeBytes` as `BigInt`, no limit per medium (3.7)                     | backups above 4 GB, no freezing, large videos        |
| 3     | Frontend and desktop: download without blob, `downloadTo` in the desktop app, jobs with progress and cancelling (3.6), size limits optional (3.7), FAT32 message (3.8) | progress bars, no size limit by default              |
| 4     | Optional: records in parts (JSON Lines per table in the backup, `persons.jsonl`), split archives                                                                       | only if needed                                       |

Each phase is a release of its own; the archives stay compatible in both directions as long as they are below 4 GB.

## 5. Tests

- Unit tests of `ArchiveFiles` with small archives: damaged CRC, wrong size, entry names with `..`, ZIP64 archives made
  with yazl's `forceZip64Format`.
- Integration test with one medium of 5 GB (generated as a stream, needs about 15 GB of free disk for the medium, the
  backup and the restore): backup → restore, the peak memory (`process.memoryUsage().rss`) must stay below for
  example 300 MB. Only on request (`COGNATIO_LARGE_TESTS=1`), not in every pipeline.
- E2E: import and restore through `uploadId`, progress visible, cancelling before the database step leaves everything
  unchanged.
- Compatibility: a backup of 1.0.0 is restored by the new version and a small new backup by 1.0.0 (upgrade matrix);
  the migration of `sizeBytes` to `BigInt` keeps all values.

## 6. Android

- **M1** (Node on the phone): the backend code of phases 1–3 runs unchanged; the files are in app-private storage,
  import comes through the file picker (copied into `uploads/.staging/` once), export and backup go through the share sheet from
  the cache folder.
- **M2** (data layer in the WebView): `ArchiveFiles` gets an implementation over zip.js and the Capacitor file system;
  the records part may then need phase 4, because a WebView has less memory than a desktop.
- In both cases the phone gets the same rule: media from file to file, never as a whole in memory.

## 7. Decisions (12.10.2026)

| #   | Question                       | Decision                                                  | Usual practice behind it                                                |
| --- | ------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | ZIP library                    | yazl + yauzl in the backend; zip.js only for Android M2   | yauzl is the common reader in Node, both small and stream-based         |
| 2   | Old upload fields              | removed at once                                           | transition periods are for public APIs with other callers               |
| 3   | Safety backup before a restore | complete backup as today, written as a stream             | self-contained, restorable on its own; costs space and time             |
| 4   | Check of the media             | CRC32 and size from the ZIP; SHA-256 only for `data.json` | ZIP programs rely on CRC32; SHA-256 per file pays off for deduplication |
| 5   | Media above 2 GiB              | yes, `BigInt`, no fixed limit per file                    | –                                                                       |
| 6   | Setting "Size limits"          | stays as an optional upper limit, none by default         | –                                                                       |
| 7   | FAT32                          | clear message, no split archives                          | simple programs report it; splitting only in large backup suites        |
