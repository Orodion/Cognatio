import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/platform', async (importOriginal) => ({ ...(await importOriginal<object>()), saveFile: vi.fn() }));

import { downloadBackup } from '../backup';

afterEach(() => vi.unstubAllGlobals());

const answer = (headers: Record<string, string>) =>
  new Response(new Blob(['zip']), { status: 200, headers: { 'Content-Disposition': 'attachment; filename="b.zip"', ...headers } });

describe('downloadBackup', () => {
  it('reports no warning for a backup within the limit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer({ 'X-Missing-Media': '2' })));

    expect(await downloadBackup()).toEqual({ filename: 'b.zip', missingMedia: 2, overLimit: null });
  });

  it('hands on size and limit of a backup that this app could not restore', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer({ 'X-Backup-Size-Mb': '3000', 'X-Backup-Limit-Mb': '2048' })));

    expect((await downloadBackup()).overLimit).toEqual({ sizeMb: 3000, limitMb: 2048 });
  });
});
