import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, ShieldCheck } from 'lucide-react';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { ErrorBox } from '@/features/transfer/components/ErrorBox';
import { TransferProgressBar } from '@/features/transfer/components/TransferProgressBar';
import { formatBytes } from '@/features/transfer/lib/transfer';
import type { BackupCounts } from '@/features/settings/lib/backup';
import { checkBackup, resetRestore, runRestore, useRestoreSession } from '@/features/settings/lib/restoreSession';
import { useReloadAllData } from '@/features/family-trees/lib/useFamilyTrees';
import { cancelActivity, runningProgress } from '@/lib/activity';
import { useActivityStore } from '@/stores/activityStore';
import { formatDateTime } from '@/lib/formatDate';

interface RestoreBackupDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Rows of the comparison "now" ↔ "in the backup" */
const ROWS: Array<{ key: string; value: (c: BackupCounts) => number }> = [
  { key: 'trees', value: (c) => c.trees },
  { key: 'persons', value: (c) => c.persons },
  { key: 'relations', value: (c) => c.relations },
  { key: 'events', value: (c) => c.events },
  { key: 'notes', value: (c) => c.notes },
  { key: 'media', value: (c) => c.media },
  // Backups made before sources existed have no such numbers
  { key: 'sources', value: (c) => c.sources ?? 0 },
  { key: 'citations', value: (c) => c.citations ?? 0 },
  { key: 'trash', value: (c) => c.deletedPersons + c.deletedTrees },
];

/** Above this size of the current media the dialog says that the backup before the restore takes space and time */
export const LARGE_SAFETY_BACKUP_BYTES = 4 * 1024 * 1024 * 1024;

/**
 * Restore of a backup in three steps: choose a file (uploaded once and checked immediately, changes nothing),
 * comparison with the current data and confirmation by a typed word, result. The backend always saves the current
 * state completely first; it can also be downloaded. Upload and restore show their progress; the restore can be
 * cancelled until the data is replaced.
 */
export function RestoreBackupDialog({ open, onClose }: RestoreBackupDialogProps) {
  const { t, i18n } = useTranslation();
  const reloadAllData = useReloadAllData();
  const { file, preview, result, error, busy, activityId } = useRestoreSession();
  const activity = useActivityStore((state) => state.activities.find((a) => a.id === activityId));
  const progress = runningProgress(activity);
  const [downloadFirst, setDownloadFirst] = useState(true);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (open) {
      // A restore that is still running stays as it is; otherwise the dialog starts afresh
      resetRestore();
      setDownloadFirst(true);
      setTyped('');
    }
  }, [open]);

  const word = t('settings.backup.restore.confirmWord');
  const confirmed = typed.trim().toLocaleUpperCase(i18n.language) === word.toLocaleUpperCase(i18n.language);
  const number = (n: number) => n.toLocaleString(i18n.language);

  // Closing is possible at any time: a running restore goes on and shows under "Activity"
  const close = () => onClose();

  const choose = (chosen: File | undefined) => {
    setTyped('');
    if (chosen) {
      void checkBackup(chosen);
    } else {
      useRestoreSession.getState().set({ file: null, preview: null, error: null });
    }
  };

  const restore = (e: React.FormEvent) => {
    e.preventDefault();
    if (file && confirmed) {
      // All data was replaced: reload it – also when the dialog has been closed meanwhile
      void runRestore(downloadFirst, reloadAllData);
    }
  };

  const cancel = activity?.cancel ? () => cancelActivity(activity.id) : undefined;

  return (
    <Dialog open={open} onClose={close}>
      <DialogHeader>
        <DialogTitle>{t('settings.backup.restore.title')}</DialogTitle>
      </DialogHeader>

      {result ? (
        <div className="space-y-4 text-sm">
          <p className="flex items-start gap-2" role="status">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {t('settings.backup.restore.done', { trees: result.counts.trees, count: result.counts.persons })}
          </p>
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="break-all">{t('settings.backup.restore.safetyBackup', { file: result.safetyBackup, dir: result.backupDir })}</span>
          </p>
          {result.missingFiles > 0 && <p>{t('settings.backup.restore.missingFiles', { count: result.missingFiles })}</p>}
          <DialogFooter>
            <Button onClick={() => onClose()}>{t('common.close')}</Button>
          </DialogFooter>
        </div>
      ) : (
        <form onSubmit={restore} className="space-y-4 text-sm" noValidate>
          <p className="text-muted-foreground">{t('settings.backup.restore.intro')}</p>
          <div className="space-y-1.5">
            <Label htmlFor="restore-file">{t('settings.backup.restore.file')}</Label>
            <Input id="restore-file" type="file" accept=".zip,application/zip" onChange={(e) => choose(e.target.files?.[0])} disabled={busy !== null} />
          </div>

          {busy === 'preview' && <TransferProgressBar progress={progress} onCancel={cancel} cancelling={activity?.cancelling} />}
          {error && <ErrorBox error={error} />}

          {preview && (
            <>
              <p>
                {t('settings.backup.restore.backupFrom', {
                  date: formatDateTime(preview.createdAt, i18n.language),
                  version: preview.appVersion,
                })}
              </p>
              <table className="w-full text-left">
                <caption className="sr-only">{t('settings.backup.restore.compare')}</caption>
                <thead className="text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-1 font-medium" />
                    <th scope="col" className="py-1 text-right font-medium">
                      {t('settings.backup.restore.current')}
                    </th>
                    <th scope="col" className="py-1 text-right font-medium">
                      {t('settings.backup.restore.inBackup')}
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {ROWS.map((row) => (
                    <tr key={row.key} className="border-t">
                      <th scope="row" className="py-1 font-normal">
                        {t(`settings.backup.restore.rows.${row.key}`)}
                      </th>
                      <td className="py-1 text-right">{number(row.value(preview.current))}</td>
                      <td className="py-1 text-right">{number(row.value(preview.counts))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-muted-foreground">
                {t('settings.backup.restore.trees')}{' '}
                {preview.trees
                  .filter((tree) => !tree.isDeleted)
                  .map((tree) => `${tree.name} (${number(tree.persons)})`)
                  .join(', ')}
              </p>
              {preview.missingFiles > 0 && <p>{t('settings.backup.restore.missingFiles', { count: preview.missingFiles })}</p>}
              {preview.cycleTrees.length > 0 && (
                <p data-testid="restore-cycles">{t('settings.backup.restore.cycleTrees', { trees: preview.cycleTrees.join(', ') })}</p>
              )}

              {/* Text in the normal colour – red on light red does not reach the required contrast */}
              <div className="flex items-start gap-2 rounded-md border border-destructive/60 bg-destructive/10 p-3" role="alert">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                <p className="font-medium">{t('settings.backup.restore.warning')}</p>
              </div>
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {t('settings.backup.restore.autoBackup')}
              </p>
              {preview.currentMediaBytes > LARGE_SAFETY_BACKUP_BYTES && (
                <p data-testid="restore-large">{t('settings.backup.restore.largeSafetyBackup', { size: formatBytes(preview.currentMediaBytes) })}</p>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={downloadFirst}
                  onChange={(e) => setDownloadFirst(e.target.checked)}
                  disabled={busy !== null}
                />
                {t('settings.backup.restore.downloadFirst')}
              </label>
              <div className="space-y-1.5">
                <Label htmlFor="restore-confirm">{t('settings.backup.restore.typeToConfirm', { word })}</Label>
                <Input
                  id="restore-confirm"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={busy !== null}
                />
              </div>
              {busy === 'download' && (
                <p className="text-muted-foreground" role="status">
                  {t('settings.backup.restore.downloading')}
                </p>
              )}
              {(busy === 'download' || busy === 'restore') && <TransferProgressBar progress={progress} onCancel={cancel} cancelling={activity?.cancelling} />}
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              {t(busy === 'download' || busy === 'restore' ? 'common.close' : 'common.cancel')}
            </Button>
            {preview && (
              <Button type="submit" variant="destructive" disabled={!confirmed || busy !== null}>
                {busy === 'restore' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                {t('settings.backup.restore.submit')}
              </Button>
            )}
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}
