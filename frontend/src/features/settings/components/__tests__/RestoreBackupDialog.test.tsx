import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LARGE_SAFETY_BACKUP_BYTES, RestoreBackupDialog } from '../RestoreBackupDialog';
import { downloadBackup, previewBackup, restoreBackup, type BackupCounts } from '@/features/settings/lib/backup';
import { TransferApiError } from '@/features/transfer/lib/transfer';
import { useRestoreSession } from '@/features/settings/lib/restoreSession';
import { useActivityStore } from '@/stores/activityStore';

const reloadAllData = vi.fn(async () => undefined);
vi.mock('@/features/settings/lib/backup', () => ({ downloadBackup: vi.fn(), previewBackup: vi.fn(), restoreBackup: vi.fn() }));
vi.mock('@/features/family-trees/lib/useFamilyTrees', () => ({ useReloadAllData: () => reloadAllData }));

// Tests run in cimode: the confirmation word is the key itself
const WORD = 'settings.backup.restore.confirmWord';

const counts = (overrides: Partial<BackupCounts> = {}): BackupCounts => ({
  trees: 1,
  deletedTrees: 0,
  persons: 10,
  deletedPersons: 0,
  relations: 5,
  events: 3,
  notes: 2,
  media: 1,
  imports: 0,
  ...overrides,
});

const preview = {
  createdAt: '2026-09-28T10:00:00.000Z',
  appVersion: '1.0.0',
  version: 1,
  counts: counts({ trees: 2, persons: 300, deletedPersons: 4 }),
  trees: [
    { name: 'Mustermann', persons: 280, isDeleted: false },
    { name: 'Müller', persons: 20, isDeleted: false },
    { name: 'Alt', persons: 0, isDeleted: true },
  ],
  missingFiles: 0,
  cycleTrees: [] as string[],
  current: counts({ trees: 3, persons: 412 }),
  currentMediaBytes: 1024,
};

const result = {
  counts: preview.counts,
  missingFiles: 0,
  safetyBackup: 'cognatio_before_restore_20260930_120000.zip',
  backupDir: '/srv/backups',
};

function setup() {
  const onClose = vi.fn();
  render(<RestoreBackupDialog open onClose={onClose} />);
  return { onClose };
}

const chooseFile = () =>
  fireEvent.change(screen.getByLabelText('settings.backup.restore.file'), {
    target: { files: [new File(['zip'], 'cognatio_backup.zip', { type: 'application/zip' })] },
  });

const submit = () => screen.getByRole('button', { name: 'settings.backup.restore.submit' });

beforeEach(() => {
  useRestoreSession.setState(useRestoreSession.getInitialState(), true);
  useActivityStore.setState({ activities: [] });
  reloadAllData.mockClear();
  vi.mocked(previewBackup).mockReset().mockResolvedValue(preview);
  vi.mocked(restoreBackup).mockReset().mockResolvedValue(result);
  vi.mocked(downloadBackup).mockReset().mockResolvedValue({ filename: 'x.zip', size: 3, saved: true, missingMedia: 0, overLimit: null });
});

describe('RestoreBackupDialog', () => {
  it('checks the file first and compares it with the current data', async () => {
    setup();
    expect(screen.queryByRole('button', { name: 'settings.backup.restore.submit' })).not.toBeInTheDocument();
    chooseFile();
    const table = await screen.findByRole('table', { name: 'settings.backup.restore.compare' });
    const persons = screen.getByRole('row', { name: /settings.backup.restore.rows.persons/ });
    expect(persons).toHaveTextContent('412');
    expect(persons).toHaveTextContent('300');
    expect(table).toHaveTextContent('4');
    // Family trees in the backup's recycle bin are not listed
    expect(screen.getByText(/Mustermann \(280\), Müller \(20\)$/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('settings.backup.restore.warning');
    expect(restoreBackup).not.toHaveBeenCalled();
    expect(screen.queryByTestId('restore-cycles')).not.toBeInTheDocument();
  });

  it('warns about family trees in which someone is their own ancestor, but still restores', async () => {
    vi.mocked(previewBackup).mockResolvedValue({ ...preview, cycleTrees: ['Müller'] });
    setup();
    chooseFile();
    expect(await screen.findByTestId('restore-cycles')).toHaveTextContent('settings.backup.restore.cycleTrees');
    expect(screen.getByLabelText(/settings.backup.restore.typeToConfirm/)).toBeEnabled();
  });

  it('enables restoring only after typing the confirmation word', async () => {
    setup();
    chooseFile();
    await screen.findByRole('table');
    const input = screen.getByLabelText('settings.backup.restore.typeToConfirm');
    expect(submit()).toBeDisabled();
    fireEvent.change(input, { target: { value: 'ja' } });
    expect(submit()).toBeDisabled();
    // Case and surrounding spaces do not matter
    fireEvent.change(input, { target: { value: `  ${WORD.toLowerCase()} ` } });
    expect(submit()).toBeEnabled();
  });

  it('downloads the current state first, then restores and reports the safety backup', async () => {
    const { onClose } = setup();
    chooseFile();
    await screen.findByRole('table');
    expect(screen.getByLabelText('settings.backup.restore.downloadFirst')).toBeChecked();
    fireEvent.change(screen.getByLabelText('settings.backup.restore.typeToConfirm'), { target: { value: WORD } });
    fireEvent.click(submit());

    expect(await screen.findByText('settings.backup.restore.done')).toBeInTheDocument();
    expect(downloadBackup).toHaveBeenCalledTimes(1);
    expect(vi.mocked(downloadBackup).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(restoreBackup).mock.invocationCallOrder[0]);
    expect(screen.getByText('settings.backup.restore.safetyBackup')).toBeInTheDocument();
    // All data was replaced: reloaded at once, also without closing the dialog
    expect(reloadAllData).toHaveBeenCalled();
    // Every step shows under "Activity", newest first
    expect(useActivityStore.getState().activities.map((a) => [a.kind, a.state])).toEqual([
      ['restore', 'done'],
      ['backup', 'done'],
      ['restoreCheck', 'done'],
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('skips the download when unchecked', async () => {
    setup();
    chooseFile();
    await screen.findByRole('table');
    fireEvent.click(screen.getByLabelText('settings.backup.restore.downloadFirst'));
    fireEvent.change(screen.getByLabelText('settings.backup.restore.typeToConfirm'), { target: { value: WORD } });
    fireEvent.click(submit());
    await waitFor(() => expect(restoreBackup).toHaveBeenCalled());
    expect(downloadBackup).not.toHaveBeenCalled();
  });

  it('does not restore when the download of the current state fails', async () => {
    vi.mocked(downloadBackup).mockRejectedValue(new TransferApiError('BACKUP_FAILED'));
    setup();
    chooseFile();
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('settings.backup.restore.typeToConfirm'), { target: { value: WORD } });
    fireEvent.click(submit());
    expect(await screen.findByText('importExport.errors.BACKUP_FAILED')).toBeInTheDocument();
    expect(restoreBackup).not.toHaveBeenCalled();
  });

  it('does not restore when the "Save as" dialog for the current state is cancelled', async () => {
    vi.mocked(downloadBackup).mockResolvedValue({ filename: 'x.zip', size: 3, saved: false, missingMedia: 0, overLimit: null });
    setup();
    chooseFile();
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('settings.backup.restore.typeToConfirm'), { target: { value: WORD } });
    fireEvent.click(submit());
    expect(await screen.findByText('importExport.errors.DOWNLOAD_CANCELLED')).toBeInTheDocument();
    expect(restoreBackup).not.toHaveBeenCalled();
  });

  it('says that the backup of large current data needs space and time', async () => {
    vi.mocked(previewBackup).mockResolvedValue({ ...preview, currentMediaBytes: LARGE_SAFETY_BACKUP_BYTES + 1 });
    setup();
    chooseFile();
    expect(await screen.findByTestId('restore-large')).toHaveTextContent('settings.backup.restore.largeSafetyBackup');
  });

  it('shows the progress of the restore and can cancel it', async () => {
    const stop = vi.fn();
    let finish: (value: never) => void = () => undefined;
    vi.mocked(restoreBackup).mockImplementation(async (_file, control) => {
      control?.cancellable(stop);
      control?.progress({ phase: 'safetyBackup', done: 512, total: 1024 });
      return new Promise((_, reject) => (finish = reject as never));
    });
    setup();
    chooseFile();
    await screen.findByRole('table');
    fireEvent.click(screen.getByLabelText('settings.backup.restore.downloadFirst'));
    fireEvent.change(screen.getByLabelText('settings.backup.restore.typeToConfirm'), { target: { value: WORD } });
    fireEvent.click(submit());

    const bar = await screen.findByRole('progressbar', { name: 'transferProgress.phases.safetyBackup' });
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    fireEvent.click(screen.getByRole('button', { name: 'transferProgress.cancel' }));
    expect(stop).toHaveBeenCalled();
    // The restore also shows under "Activity"
    expect(useActivityStore.getState().activities[0]).toMatchObject({ kind: 'restore', state: 'running', cancelling: true });
    finish(new TransferApiError('CANCELLED') as never);
    expect(await screen.findByText('importExport.errors.CANCELLED')).toBeInTheDocument();
  });

  it('shows why a file is rejected', async () => {
    vi.mocked(previewBackup).mockRejectedValue(new TransferApiError('BACKUP_IS_EXPORT'));
    const { onClose } = setup();
    chooseFile();
    expect(await screen.findByText('importExport.errors.BACKUP_IS_EXPORT')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
