import { create } from 'zustand';
import { track } from '@/lib/activity';
import { useActivityStore } from '@/stores/activityStore';
import {
  downloadExport,
  executeImport,
  previewImport,
  toError,
  type ErrorState,
  type ImportDecision,
  type ImportPreview,
  type ImportResult,
  type ImportStrategy,
  type ImportTarget,
} from './transfer';

/**
 * State of the import page that outlives the page: a check or an import keeps running and its result arrives when the
 * user has gone to another page – coming back shows it. Kept in memory only (the chosen file cannot be stored).
 */
interface ImportSession {
  file: File | null;
  target: ImportTarget;
  /** The user chose the target; otherwise it follows the kind of the file */
  targetTouched: boolean;
  treeName: string;
  treeNameTouched: boolean;
  preview: ImportPreview | null;
  strategy: ImportStrategy;
  decisions: Record<string, ImportDecision>;
  error: ErrorState | null;
  result: ImportResult | null;
  /** Name of the new family tree of the last import (null: into the open one) */
  newTreeName: string | null;
  backupDone: boolean;
  busy: 'preview' | 'import' | 'backup' | null;
  /** Activity of the running check, import or backup (progress and cancelling) */
  activityId: string | null;
  set: (change: Partial<ImportSession>) => void;
}

const empty = {
  file: null,
  targetTouched: false,
  treeName: '',
  treeNameTouched: false,
  preview: null,
  decisions: {},
  backupDone: false,
};

export const useImportSession = create<ImportSession>()((set) => ({
  ...empty,
  target: 'CURRENT',
  strategy: 'MERGE_NEWER',
  error: null,
  result: null,
  newTreeName: null,
  busy: null,
  activityId: null,
  set: (change) => set(change),
}));

const session = () => useImportSession.getState();

/** Forgets the chosen file and its check (after an import or on "Cancel"); the result of the last import stays */
export const resetImport = () => session().set({ ...empty });

/** Checks the file against the target; a newer check (another target, another file) replaces an older one */
export async function loadPreview(file: File, target: ImportTarget) {
  session().set({ error: null, preview: null, decisions: {}, busy: 'preview' });
  try {
    await track(
      { kind: 'importCheck', label: file.name, link: '/import-export' },
      async (control) => {
        session().set({ activityId: control.id });
        const preview = await previewImport(file, target, control);
        if (session().activityId !== control.id) {
          return preview;
        }
        session().set({
          preview,
          // Empty data: nothing to merge – overwriting is equivalent and the simplest
          strategy: preview.existingPersons === 0 ? 'OVERWRITE' : 'MERGE_NEWER',
          ...(session().treeNameTouched ? {} : { treeName: preview.suggestedTreeName }),
        });
        return preview;
      },
      (preview) => ({ persons: preview.importedPersons }),
    );
  } catch (err) {
    session().set({ error: toError(err) });
  } finally {
    session().set({ busy: null });
  }
}

/**
 * Runs the import of the checked file. `afterImport` reloads the views (or opens the new family tree); it runs also
 * when the page has been left meanwhile.
 */
export async function runImport(afterImport: (result: ImportResult, newTreeName: string | null) => Promise<void>) {
  const { file, preview, strategy, decisions, treeName } = session();
  if (!file || !preview) {
    return;
  }
  const newTree = preview.target === 'NEW' ? treeName.trim() : null;
  session().set({ busy: 'import', error: null });
  try {
    const result = await track(
      { kind: 'import', label: file.name, link: '/import-export' },
      (control) => {
        session().set({ activityId: control.id });
        return executeImport(file, strategy, decisions, newTree !== null ? { target: 'NEW', treeName: newTree } : { target: 'CURRENT' }, control);
      },
      (r) => ({ created: r.createdPersons, updated: r.updatedPersons, removed: r.removedPersons, missing: r.missingFiles.length }),
    );
    session().set({ result, newTreeName: newTree });
    resetImport();
    await afterImport(result, newTree);
  } catch (err) {
    session().set({ error: toError(err) });
  } finally {
    session().set({ busy: null });
  }
}

/** Saves the open family tree with its media before an import; only a saved file counts as backup */
export async function backupBeforeImport() {
  session().set({ busy: 'backup', error: null });
  try {
    const saved = await exportTracked('zip', { media: true }, (id) => session().set({ activityId: id }));
    session().set({ backupDone: saved });
  } catch (err) {
    session().set({ error: toError(err) });
  } finally {
    session().set({ busy: null });
  }
}

/**
 * Downloads an export as an activity (progress, cancelling, also in the browser). False if the user cancelled the
 * "Save as" dialog – then the activity is removed again, nothing happened.
 */
export async function exportTracked(kind: 'zip' | 'gedcom', options: { media?: boolean; version?: '5.5.1' | '7.0' }, onStart?: (id: string) => void) {
  let activity = '';
  const result = await track(
    { kind: 'export', label: kind === 'zip' ? 'ZIP' : `GEDCOM ${options.version ?? '5.5.1'}`, link: '/import-export' },
    (control) => {
      activity = control.id;
      onStart?.(control.id);
      return downloadExport(kind, options, control);
    },
    (r) => ({ file: r.filename, size: r.size, missing: r.missingMedia }),
  );
  if (!result.saved) {
    useActivityStore.getState().remove(activity);
  }
  return result.saved;
}
