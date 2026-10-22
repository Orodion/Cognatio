import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Downloads, FAT32_MAX_BYTES, downloadFailure, type DownloadItemLike } from './downloads.js';

/** A download item as Electron would hand it over */
function item(url: string, total: number) {
  const listeners: Record<string, Array<(event: unknown, state: string) => void>> = {};
  let received = 0;
  let savePath = '';
  const fake: DownloadItemLike = {
    getURL: () => url,
    setSavePath: (p) => (savePath = p),
    getReceivedBytes: () => received,
    getTotalBytes: () => total,
    on: (event: string, listener: (event: unknown, state: string) => void) => (listeners[event] ??= []).push(listener),
  };
  return {
    fake,
    savePath: () => savePath,
    update: (bytes: number) => {
      received = bytes;
      listeners.updated?.forEach((l) => l({}, 'progressing'));
    },
    done: (state: string) => listeners.done?.forEach((l) => l({}, state)),
  };
}

describe('Downloads', () => {
  it('saves a requested download into the chosen file and reports the progress', async () => {
    const progress: number[] = [];
    const downloads = new Downloads((f) => progress.push(f));
    const result = downloads.expect('http://127.0.0.1:5000/api/v1/backup', 'D:\\Sicherung\\b.zip');
    const download = item('http://127.0.0.1:5000/api/v1/backup', 200);

    assert.equal(downloads.take(download.fake), true);
    assert.equal(download.savePath(), 'D:\\Sicherung\\b.zip');
    download.update(100);
    download.done('completed');
    assert.deepEqual(await result, { saved: true });
    assert.deepEqual(progress, [0.5, -1]);
  });

  it('leaves other downloads alone (e.g. a medium the page links to)', () => {
    const downloads = new Downloads();
    void downloads.expect('http://127.0.0.1:5000/api/v1/backup', 'x.zip');
    assert.equal(downloads.take(item('http://127.0.0.1:5000/api/v1/media/m1/download', 10).fake), false);
  });

  it('reports a failed download, at the 4 GB limit as a limit of the drive', async () => {
    const downloads = new Downloads();
    const failed = downloads.expect('http://127.0.0.1:5000/api/v1/backup', 'x.zip');
    const small = item('http://127.0.0.1:5000/api/v1/backup', 1000);
    downloads.take(small.fake);
    small.update(10);
    small.done('interrupted');
    assert.deepEqual(await failed, { saved: false, error: 'DOWNLOAD_FAILED' });

    const large = downloads.expect('http://127.0.0.1:5000/api/v1/export/zip?media=1', 'y.zip');
    const big = item('http://127.0.0.1:5000/api/v1/export/zip?media=1', 6 * 1024 ** 3);
    downloads.take(big.fake);
    big.update(FAT32_MAX_BYTES);
    big.done('interrupted');
    assert.deepEqual(await large, { saved: false, error: 'FILE_SYSTEM_LIMIT' });
  });
});

describe('downloadFailure', () => {
  it('names the limit of FAT32 only for a file above 4 GB that broke off there', () => {
    assert.equal(downloadFailure(FAT32_MAX_BYTES, FAT32_MAX_BYTES + 10), 'FILE_SYSTEM_LIMIT');
    assert.equal(downloadFailure(1024, FAT32_MAX_BYTES + 10), 'DOWNLOAD_FAILED');
    assert.equal(downloadFailure(FAT32_MAX_BYTES, FAT32_MAX_BYTES), 'DOWNLOAD_FAILED');
  });
});
