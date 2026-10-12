/** Import/export via the backend's REST API (/api/v1/export/…, /api/v1/import/…), each for the active family tree. */
import { treeHeaders } from '@/stores/activeTreeStore';
import { apiUrl, saveFile } from '@/lib/platform';

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

/** "500 MB", "2 GB", "1.5 GB" */
export function formatMb(mb: number): string {
  return mb >= 1024 ? `${Number((mb / 1024).toFixed(1))} GB` : `${mb} MB`;
}

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

/** Downloads the export; depending on its settings the browser asks for the location. `saved`: false if the user cancelled. */
export async function downloadExport(
  kind: 'zip' | 'gedcom',
  options: { media?: boolean; version?: '5.5.1' | '7.0' } = {},
): Promise<{ filename: string; missingMedia: number; saved: boolean }> {
  // ZIP: media included by default; GEDCOM: only on request (then as a GEDZIP/ZIP file)
  const params = new URLSearchParams(
    kind === 'zip' ? { media: options.media === false ? '0' : '1' } : { version: options.version ?? '5.5.1', media: options.media ? '1' : '0' },
  );
  const response = await request(`/api/v1/export/${kind}?${params}`);
  const fallback = kind === 'zip' ? 'family_tree.zip' : options.media ? 'family_tree_gedcom.zip' : 'family_tree.ged';
  const filename = filenameFrom(response.headers.get('Content-Disposition'), fallback);
  const saved = await saveFile(await response.blob(), filename);
  return { filename, missingMedia: Number(response.headers.get('X-Missing-Media') ?? 0), saved };
}

const formData = (file: File, fields: Record<string, string> = {}) => {
  const data = new FormData();
  data.append('file', file);
  for (const [key, value] of Object.entries(fields)) {
    data.append(key, value);
  }
  return data;
};

/** Checks the import file and returns the planned changes per strategy (compared with the target family tree). */
export async function previewImport(file: File, target: ImportTarget = 'CURRENT'): Promise<ImportPreview> {
  const response = await request('/api/v1/import/preview', { method: 'POST', body: formData(file, { target }) });
  return response.json();
}

export async function executeImport(
  file: File,
  strategy: ImportStrategy,
  decisions: Record<string, ImportDecision> = {},
  target: { target: ImportTarget; treeName?: string } = { target: 'CURRENT' },
): Promise<ImportResult> {
  const response = await request('/api/v1/import/execute', {
    method: 'POST',
    body: formData(file, {
      strategy,
      decisions: JSON.stringify(decisions),
      target: target.target,
      ...(target.treeName ? { treeName: target.treeName } : {}),
    }),
  });
  return response.json();
}

/** Summary for manual merging based on the current decisions */
export function manualSummary(preview: ImportPreview, decisions: Record<string, ImportDecision>): ImportSummary {
  const base = preview.summaries.MERGE_MANUAL;
  const updated = preview.conflicts.filter((c) => decisions[c.personId] === 'IMPORT').length;
  return { ...base, updatedPersons: updated, keptPersons: preview.conflicts.length - updated };
}
