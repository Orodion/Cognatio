import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/platform', async (importOriginal) => ({ ...(await importOriginal<object>()), downloadFrom: vi.fn() }));

import { downloadFrom } from '@/lib/platform';
import { track } from '@/lib/activity';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import { useActivityStore } from '@/stores/activityStore';
import { stubXhr } from '@/test/xhr';
import { downloadBackup, previewBackup, restoreBackup } from '../backup';

beforeEach(() => vi.mocked(downloadFrom).mockReset().mockResolvedValue({ saved: true }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  useActiveTreeStore.setState({ treeId: null });
  useActivityStore.setState({ activities: [] });
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('downloadBackup', () => {
  it('asks for name and size first, downloads straight into the file and waits until everything was sent', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.startsWith('/api/v1/jobs/')
        ? json({ state: 'done', phase: 'download', done: 3, total: 3 })
        : json({ filename: 'b.zip', size: 3, missingMedia: 2, overLimit: null }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await track({ kind: 'backup', label: 'x' }, (control) => downloadBackup(control));
    expect(result).toEqual({ filename: 'b.zip', size: 3, saved: true, missingMedia: 2, overLimit: null });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/backup?check=1');
    const [address, filename] = vi.mocked(downloadFrom).mock.calls[0];
    // The backend counts the bytes under the id of the activity
    const id = useActivityStore.getState().activities[0].id;
    expect(address).toBe(`/api/v1/backup?activity=${id}`);
    expect(filename).toBe('b.zip');
    expect(fetchMock).toHaveBeenCalledWith(`/api/v1/jobs/${id}`, expect.anything());
    expect(useActivityStore.getState().activities[0].label).toBe('b.zip');
  });

  it('hands on size and limit of a backup that this app could not restore, and a cancelled dialog', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ filename: 'b.zip', size: 3, missingMedia: 0, overLimit: { sizeMb: 3000, limitMb: 2048 } })),
    );
    vi.mocked(downloadFrom).mockResolvedValue({ saved: false });

    expect(await downloadBackup()).toMatchObject({ saved: false, overLimit: { sizeMb: 3000, limitMb: 2048 } });
  });

  it('reports a drive that takes no file this large', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ filename: 'b.zip', size: 5 * 1024 ** 3, missingMedia: 0, overLimit: null })),
    );
    vi.mocked(downloadFrom).mockResolvedValue({ saved: false, error: 'FILE_SYSTEM_LIMIT' });

    await expect(downloadBackup()).rejects.toMatchObject({ reason: 'FILE_SYSTEM_LIMIT', params: { sizeMb: 5120 } });
  });

  it('fails when the backend breaks the download off', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.startsWith('/api/v1/jobs/')
          ? json({ state: 'failed', result: { reason: 'DOWNLOAD_FAILED' } })
          : json({ filename: 'b.zip', size: 3, missingMedia: 0 }),
      ),
    );
    await expect(downloadBackup()).rejects.toMatchObject({ reason: 'DOWNLOAD_FAILED' });
  });
});

describe('previewBackup and restoreBackup', () => {
  it('upload the file once and follow the restore until it ends', async () => {
    const sent = stubXhr({ status: 201, body: { uploadId: 'u1', size: 3 } });
    const job = { state: 'running', phase: 'media', done: 5, total: 10, cancellable: true };
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/v1/backup/preview') {
        return json({ counts: {}, uploadId: JSON.parse(String(init?.body)).uploadId });
      }
      if (url === '/api/v1/backup/restore') {
        return json({ jobId: 'j1' }, 202);
      }
      // The job: once running, then done
      const answer = job.state === 'running' ? { ...job } : { state: 'done', result: { safetyBackup: 's.zip' } };
      job.state = 'done';
      return json(answer);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const file = new File(['zip'], 'b.zip');
    expect(await track({ kind: 'restoreCheck', label: 'b.zip' }, (control) => previewBackup(file, control))).toMatchObject({ uploadId: 'u1' });
    const restored = track({ kind: 'restore', label: 'b.zip' }, (control) => restoreBackup(file, control));
    await vi.advanceTimersByTimeAsync(1000);
    expect(await restored).toEqual({ safetyBackup: 's.zip' });
    // The file went up only once
    expect(sent).toHaveLength(1);
    const restore = fetchMock.mock.calls.find(([url]) => url === '/api/v1/backup/restore')!;
    expect(JSON.parse(String(restore[1]?.body))).toEqual({ uploadId: 'u1', confirm: 'DELETE_ALL' });
  });

  it('uploads again when the server no longer has the file', async () => {
    const sent = stubXhr({ status: 201, body: { uploadId: 'u1', size: 3 } });
    let first = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        if (first) {
          first = false;
          return json({ reason: 'UPLOAD_NOT_FOUND' }, 410);
        }
        return json({ counts: {} });
      }),
    );
    const file = new File(['zip'], 'b.zip');
    await previewBackup(file);
    // Uploaded, refused as unknown, uploaded once more
    expect(sent).toHaveLength(2);
    // The new upload is used from then on
    await previewBackup(file);
    expect(sent).toHaveLength(2);
  });

  it('turns a failed restore into its error', async () => {
    stubXhr({ status: 201, body: { uploadId: 'u1', size: 3 } });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url === '/api/v1/backup/restore'
          ? json({ jobId: 'j2' }, 202)
          : json({ state: 'failed', result: { reason: 'NOT_ENOUGH_SPACE', params: { neededMb: 10 } } }),
      ),
    );
    await expect(restoreBackup(new File(['zip'], 'c.zip'))).rejects.toMatchObject({ reason: 'NOT_ENOUGH_SPACE', params: { neededMb: 10 } });
  });
});
