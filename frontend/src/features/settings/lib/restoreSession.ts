import { create } from 'zustand';
import { track } from '@/lib/activity';
import { useActivityStore } from '@/stores/activityStore';
import { toError, type ErrorState } from '@/features/transfer/lib/transfer';
import { downloadBackup, previewBackup, restoreBackup, type BackupPreview, type RestoreResult } from './backup';

/**
 * State of the restore that outlives the dialog and the settings page: the check and the restore keep running when
 * the user goes elsewhere, and reopening the dialog shows where they are. Kept in memory only.
 */
interface RestoreSession {
  file: File | null;
  preview: BackupPreview | null;
  result: RestoreResult | null;
  error: ErrorState | null;
  busy: 'preview' | 'download' | 'restore' | null;
  /** Activity of the running step (progress and cancelling) */
  activityId: string | null;
  set: (change: Partial<RestoreSession>) => void;
}

export const useRestoreSession = create<RestoreSession>()((set) => ({
  file: null,
  preview: null,
  result: null,
  error: null,
  busy: null,
  activityId: null,
  set: (change) => set(change),
}));

const session = () => useRestoreSession.getState();

/**
 * Downloads the backup of all family trees as an activity (progress, cancelling, also in the browser). False if the
 * user cancelled the "Save as" dialog – then the activity is removed again, nothing happened.
 */
export async function downloadBackupTracked(onStart?: (id: string) => void): Promise<boolean> {
  let activity = '';
  const result = await track(
    { kind: 'backup', label: 'cognatio_backup.zip', link: '/settings#data' },
    (control) => {
      activity = control.id;
      onStart?.(control.id);
      return downloadBackup(control);
    },
    (r) => ({
      file: r.filename,
      size: r.size,
      missing: r.missingMedia,
      ...(r.overLimit ? { overLimitSizeMb: r.overLimit.sizeMb, overLimitLimitMb: r.overLimit.limitMb } : {}),
    }),
  );
  if (!result.saved) {
    useActivityStore.getState().remove(activity);
  }
  return result.saved;
}

/** Starts afresh (the dialog opens again); a running restore is not touched */
export function resetRestore() {
  if (!session().busy) {
    session().set({ file: null, preview: null, result: null, error: null, activityId: null });
  }
}

/** Uploads the backup once and checks it – nothing changes yet */
export async function checkBackup(file: File) {
  session().set({ file, preview: null, error: null, busy: 'preview' });
  try {
    const preview = await track(
      { kind: 'restoreCheck', label: file.name, link: '/settings#data' },
      (control) => {
        session().set({ activityId: control.id });
        return previewBackup(file, control);
      },
      (p) => ({ persons: p.counts.persons }),
    );
    if (session().file === file) {
      session().set({ preview });
    }
  } catch (err) {
    session().set({ error: toError(err) });
  } finally {
    session().set({ busy: null });
  }
}

/**
 * Replaces all data with the checked backup, after downloading the current state if wanted (the restore starts only
 * when that download is complete). `afterRestore` reloads all data – also when the dialog has been closed meanwhile.
 */
export async function runRestore(downloadFirst: boolean, afterRestore: () => Promise<void>) {
  const { file } = session();
  if (!file) {
    return;
  }
  session().set({ error: null });
  try {
    if (downloadFirst) {
      session().set({ busy: 'download' });
      // Cancelled "Save as": the user wanted a copy of the current state first – do not restore without it
      if (!(await downloadBackupTracked((id) => session().set({ activityId: id })))) {
        session().set({ error: { reason: 'DOWNLOAD_CANCELLED', details: [] } });
        return;
      }
    }
    session().set({ busy: 'restore' });
    const result = await track(
      { kind: 'restore', label: file.name, link: '/settings#data' },
      (control) => {
        session().set({ activityId: control.id });
        return restoreBackup(file, control);
      },
      (r) => ({ trees: r.counts.trees, persons: r.counts.persons, missing: r.missingFiles }),
    );
    session().set({ result });
    await afterRestore();
  } catch (err) {
    session().set({ error: toError(err) });
  } finally {
    session().set({ busy: null });
  }
}
