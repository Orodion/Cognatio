/** Import/export via the backend's REST API (/api/v1/export/…, /api/v1/import/…), each for the active family tree. */
import i18n from '@/i18n';
import { TREE_HEADER, treeHeaders } from '@/stores/activeTreeStore';
import { apiUrl, downloadFrom, hasNativeDownload } from '@/lib/platform';
import type { ActivityControl } from '@/lib/activity';
import { postWithProgress } from '@/lib/upload';

export type ImportStrategy = 'OVERWRITE' | 'MERGE_NEWER' | 'MERGE_MANUAL';
export type ImportDecision = 'IMPORT' | 'KEEP';
export const IMPORT_STRATEGIES: ImportStrategy[] = ['MERGE_NEWER', 'MERGE_MANUAL', 'OVERWRITE'];

export interface ImportSummary {
  newPersons: number;
  updatedPersons: number;
  unchangedPersons: number;
  keptPersons: number;
  removedPersons: number;
  conflicts: number;
  newRelations: number;
  newEvents: number;
  newNotes: number;
  newMedia: number;
  /** Added to the library of sources (shared by all family trees) */
  newSources?: number;
  newCitations?: number;
}

export interface FieldChange {
  field: string;
  label?: string;
  existing: unknown;
  imported: unknown;
}

export interface ImportConflict {
  personId: string;
  name: string;
  existingUpdatedAt: string;
  importedUpdatedAt: string;
  importedNewer: boolean;
  changes: FieldChange[];
}

/** Earlier import of the same file */
export interface PreviousImport {
  importedAt: string;
  strategy: ImportStrategy;
  fileName: string;
}

/** Target of an import: the active family tree or a new one */
export type ImportTarget = 'CURRENT' | 'NEW';

export interface ImportPreview {
  kind: 'ZIP' | 'GEDCOM';
  target: ImportTarget;
  /** Suggested name for a new family tree (most common last name or file name) */
  suggestedTreeName: string;
  source: string | null;
  exportedAt: string;
  /** GEDCOM: persons recognised in the existing data (via identifier or name and birth year) */
  recognized: { byId: number; byName: number } | null;
  previousImports: PreviousImport[];
  existingPersons: number;
  importedPersons: number;
  missingFiles: string[];
  conflicts: ImportConflict[];
  summaries: Record<ImportStrategy, ImportSummary>;
  /** Per procedure: names of persons who would be their own ancestors afterwards – the import still runs */
  cycles: Record<ImportStrategy, string[][]>;
}

export interface ImportResult {
  /** Family tree the data was imported into – for a new one its id */
  familyTreeId: string;
  createdPersons: number;
  updatedPersons: number;
  removedPersons: number;
  missingFiles: string[];
  summary: ImportSummary;
}

/** Error with a code (`reason`, translated under importExport.errors.*), technical details and numbers for the message */
export class TransferApiError extends Error {
  constructor(
    public reason: string,
    public details: string[] = [],
    public params: Record<string, number> = {},
  ) {
    super(reason);
  }
}

/** Error for display (ErrorBox) */
export interface ErrorState {
  reason: string;
  details: string[];
  /** Numbers for the message, e.g. `limitMb` and `sizeMb` of a file that is too large */
  params?: Record<string, number>;
}

export { formatBytes, formatMb } from '@/lib/formatSize';

export const toError = (err: unknown): ErrorState =>
  err instanceof TransferApiError ? { reason: err.reason, details: err.details, params: err.params } : { reason: 'UNKNOWN', details: [] };

export async function request(url: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(apiUrl(url), { ...init, headers: { ...treeHeaders(), ...init?.headers } });
  } catch {
    throw new TransferApiError('NETWORK');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { reason?: string; details?: string[]; params?: Record<string, number> };
    throw new TransferApiError(body.reason ?? 'UNKNOWN', body.details ?? [], body.params ?? {});
  }
  return response;
}

/** File name from the Content-Disposition header */
export function filenameFrom(header: string | null, fallback: string): string {
  return header?.match(/filename="?([^";]+)"?/)?.[1] ?? fallback;
}

/** What the backend answers before a download (`?check=1`): errors come here, the download itself cannot report them */
export interface DownloadCheck {
  filename: string;
  size: number;
  missingMedia: number;
}

/** How long the page waits for a download of the browser to reach the backend before it counts as failed */
export const DOWNLOAD_START_MS = 30_000;

/**
 * Follows the job of a download (the backend counts the bytes it sends). Until the request arrives the job is unknown:
 * the desktop app first shows its "Save as" dialog, the browser starts the download a moment later. `stopped`: the
 * download ended on this side (dialog cancelled, error).
 */
async function followDownload(id: string, control: ActivityControl | undefined, stopped: () => boolean): Promise<void> {
  const since = Date.now();
  for (;;) {
    if (stopped()) {
      return;
    }
    let status: JobStatus | null = null;
    try {
      status = (await (await request(`/api/v1/jobs/${id}`)).json()) as JobStatus;
    } catch (err) {
      if (!(err instanceof TransferApiError && err.reason === 'JOB_NOT_FOUND')) {
        throw err;
      }
      if (!hasNativeDownload() && Date.now() - since > DOWNLOAD_START_MS) {
        throw new TransferApiError('DOWNLOAD_FAILED');
      }
    }
    if (status) {
      if (status.state === 'done') {
        return;
      }
      if (status.state !== 'running') {
        throw jobError(status);
      }
      control?.progress({ phase: status.phase, done: status.done, total: status.total });
    }
    await new Promise((resolve) => setTimeout(resolve, JOB_POLL_MS));
  }
}

/**
 * Downloads a file of the backend without holding it in memory: first the check (name, size, errors), then the
 * download goes straight into the file – the browser asks for the location, the desktop app shows its "Save as"
 * dialog. The backend counts the bytes it sends under the id of the activity, so the page knows the progress and the
 * end also in the browser, and can cancel it. `saved`: false if the user cancelled the dialog.
 */
export async function downloadChecked<T extends DownloadCheck>(path: string, control?: ActivityControl): Promise<{ check: T; saved: boolean }> {
  const separator = path.includes('?') ? '&' : '?';
  const check = (await (await request(`${path}${separator}check=1`)).json()) as T;
  control?.rename(check.filename);
  const id = control?.id ?? crypto.randomUUID();
  // A download link cannot send headers: the family tree and the id of the job go into the address
  const tree = treeHeaders()[TREE_HEADER];
  const address = `${path}${separator}activity=${encodeURIComponent(id)}${tree ? `&familyTree=${encodeURIComponent(tree)}` : ''}`;
  let cancelled = false;
  control?.progress({ phase: 'download', done: 0, total: check.size });
  control?.cancellable(() => {
    cancelled = true;
    void cancelJob(id);
  });
  let stopped = false;
  const following = followDownload(id, control, () => stopped);
  // Without a reaction the failure of the download is reported once below
  following.catch(() => undefined);
  const result = await downloadFrom(address, check.filename);
  if (!result.saved || result.error) {
    stopped = true;
    if (cancelled) {
      throw new TransferApiError('CANCELLED');
    }
    if (result.error) {
      throw new TransferApiError(result.error, [], { sizeMb: Math.ceil(check.size / (1024 * 1024)) });
    }
    return { check, saved: false };
  }
  // Browser: the download runs on – it is done when the backend has sent everything
  await following;
  return { check, saved: true };
}

/** Downloads the export straight into the file (see `downloadChecked`). `saved`: false if the user cancelled the dialog. */
export async function downloadExport(
  kind: 'zip' | 'gedcom',
  options: { media?: boolean; version?: '5.5.1' | '7.0' } = {},
  control?: ActivityControl,
): Promise<{ filename: string; size: number; missingMedia: number; saved: boolean }> {
  // ZIP: media included by default; GEDCOM: only on request (then as a GEDZIP/ZIP file)
  const params = new URLSearchParams(
    kind === 'zip' ? { media: options.media === false ? '0' : '1' } : { version: options.version ?? '5.5.1', media: options.media ? '1' : '0' },
  );
  const { check, saved } = await downloadChecked(`/api/v1/export/${kind}?${params}`, control);
  return { filename: check.filename, size: check.size, missingMedia: check.missingMedia, saved };
}

/** Step of a long operation: the upload, then the steps of the backend */
export type TransferPhase = 'upload' | 'waiting' | 'check' | 'safetyBackup' | 'media' | 'database' | 'download';

export interface TransferProgress {
  phase: TransferPhase;
  /** Bytes done and in total in this step; total 0: unknown */
  done: number;
  total: number;
}

/** Error of an answer of the backend */
function apiError(status: number, text: string): TransferApiError {
  let body: { reason?: string; details?: string[]; params?: Record<string, number> } = {};
  try {
    body = JSON.parse(text);
  } catch {
    // no JSON (e.g. a proxy)
  }
  return new TransferApiError(body.reason ?? (status === 0 ? 'NETWORK' : 'UNKNOWN'), body.details ?? [], body.params ?? {});
}

/** Uploads an import or backup file once with progress and returns its id; cancelling aborts it (CANCELLED) */
export async function uploadFile(path: string, file: File, control?: ActivityControl): Promise<string> {
  const data = new FormData();
  data.append('file', file);
  let answer: { status: number; text: string };
  try {
    answer = await postWithProgress(path, data, file.size, control);
  } catch (err) {
    throw new TransferApiError((err as { reason: string }).reason);
  }
  if (answer.status !== 201) {
    throw apiError(answer.status, answer.text);
  }
  return (JSON.parse(answer.text) as { uploadId: string }).uploadId;
}

/** Uploads of this page: a file chosen once is sent only once for preview and execution */
const uploads = new WeakMap<File, { path: string; id: Promise<string> }>();

/**
 * Sends a request that refers to the uploaded file (`uploadId`); the file is uploaded first if needed. If the backend
 * no longer has it (expired, restarted), it is uploaded once more.
 */
export async function withUpload(path: string, file: File, send: (uploadId: string) => Promise<Response>, control?: ActivityControl): Promise<Response> {
  const upload = () => {
    const entry = { path, id: uploadFile(path, file, control) };
    uploads.set(file, entry);
    entry.id.catch(() => uploads.delete(file));
    return entry.id;
  };
  const known = uploads.get(file);
  const ready = async (id: Promise<string>) => {
    const uploadId = await id;
    control?.progress({ phase: 'check', done: 0, total: 0 });
    return send(uploadId);
  };
  try {
    return await ready(known?.path === path ? known.id : upload());
  } catch (err) {
    if (err instanceof TransferApiError && err.reason === 'UPLOAD_NOT_FOUND') {
      return ready(upload());
    }
    throw err;
  }
}

const json = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/** How often the page asks for the progress of a job */
export const JOB_POLL_MS = 500;

/** State of a job of the backend (GET /api/v1/jobs/:id) */
export interface JobStatus {
  id: string;
  operation: string;
  label: string;
  state: 'running' | 'done' | 'failed' | 'cancelled';
  phase: TransferPhase;
  done: number;
  total: number;
  cancellable: boolean;
  result?: unknown;
}

const jobError = (status: JobStatus) => {
  const body = (status.result ?? {}) as { reason?: string; details?: string[]; params?: Record<string, number> };
  return new TransferApiError(body.reason ?? 'UNKNOWN', body.details ?? [], body.params ?? {});
};

/**
 * Follows a job of the backend until it ends; the result as the route answers it, or its error. The activity can
 * cancel it as long as the backend allows that (before the database is changed).
 */
export function followJob<T>(id: string, control?: ActivityControl): Promise<T> {
  return (async () => {
    let cancellable: boolean | undefined;
    for (;;) {
      const status = (await (await request(`/api/v1/jobs/${id}`)).json()) as JobStatus;
      if (status.state === 'done') {
        return status.result as T;
      }
      if (status.state !== 'running') {
        throw jobError(status);
      }
      control?.progress({ phase: status.phase, done: status.done, total: status.total });
      if (status.cancellable !== cancellable) {
        cancellable = status.cancellable;
        control?.cancellable(cancellable ? () => void cancelJob(id) : undefined);
      }
      await new Promise((resolve) => setTimeout(resolve, JOB_POLL_MS));
    }
  })();
}

/** Asks the backend to stop a job; it stops before it changes the database, otherwise it runs to its end */
export async function cancelJob(id: string): Promise<void> {
  await request(`/api/v1/jobs/${id}`, { method: 'DELETE' }).catch(() => undefined);
}

/** The jobs that run on the backend (after reloading the page) */
export async function runningJobs(): Promise<JobStatus[]> {
  return (await request('/api/v1/jobs')).json();
}

/** Language for texts the import writes (titles of standard GEDCOM events, words of approximate dates) */
const importLanguage = () => i18n.language;

/** Checks the import file and returns the planned changes per strategy (compared with the target family tree). */
export async function previewImport(file: File, target: ImportTarget = 'CURRENT', control?: ActivityControl): Promise<ImportPreview> {
  const response = await withUpload(
    '/api/v1/import/upload',
    file,
    (uploadId) => request('/api/v1/import/preview', json({ uploadId, target, language: importLanguage() })),
    control,
  );
  return response.json();
}

/** Runs the import as a job of the backend and follows it to its end */
export async function executeImport(
  file: File,
  strategy: ImportStrategy,
  decisions: Record<string, ImportDecision> = {},
  target: { target: ImportTarget; treeName?: string } = { target: 'CURRENT' },
  control?: ActivityControl,
): Promise<ImportResult> {
  const body = { strategy, decisions, target: target.target, language: importLanguage(), ...(target.treeName ? { treeName: target.treeName } : {}) };
  const response = await withUpload('/api/v1/import/upload', file, (uploadId) => request('/api/v1/import/execute', json({ uploadId, ...body })), control);
  const { jobId } = (await response.json()) as { jobId: string };
  return followJob<ImportResult>(jobId, control);
}

/** Summary for manual merging based on the current decisions */
export function manualSummary(preview: ImportPreview, decisions: Record<string, ImportDecision>): ImportSummary {
  const base = preview.summaries.MERGE_MANUAL;
  const updated = preview.conflicts.filter((c) => decisions[c.personId] === 'IMPORT').length;
  return { ...base, updatedPersons: updated, keptPersons: preview.conflicts.length - updated };
}

/** Groups of names for a warning line – long lists are shortened */
export function cycleText(cycles: string[][], maxGroups = 3, maxNames = 5): string {
  const groups = cycles.slice(0, maxGroups).map((names) => names.slice(0, maxNames).join(', ') + (names.length > maxNames ? ', …' : ''));
  return groups.join('; ') + (cycles.length > maxGroups ? '; …' : '');
}
