/** What the page learns about a download into a file (see frontend/src/lib/platform.ts, `downloadTo`) */
export interface DownloadResult {
  saved: boolean;
  error?: 'FILE_SYSTEM_LIMIT' | 'DOWNLOAD_FAILED';
}

/** The parts of Electron's DownloadItem that are used here */
export interface DownloadItemLike {
  getURL(): string;
  setSavePath(path: string): void;
  getReceivedBytes(): number;
  getTotalBytes(): number;
  on(event: 'updated', listener: (event: unknown, state: string) => void): unknown;
  on(event: 'done', listener: (event: unknown, state: string) => void): unknown;
}

/** Largest file on FAT32 (many USB sticks): 4 GB minus one byte */
export const FAT32_MAX_BYTES = 2 ** 32 - 1;

/**
 * Why a download did not finish. A file larger than 4 GB that broke off at about 4 GB hit the limit of FAT32 – the
 * page then explains that the drive takes no file this large.
 */
export function downloadFailure(received: number, total: number): NonNullable<DownloadResult['error']> {
  return total > FAT32_MAX_BYTES && received >= FAT32_MAX_BYTES - 64 * 1024 * 1024 ? 'FILE_SYSTEM_LIMIT' : 'DOWNLOAD_FAILED';
}

const normalize = (url: string) => {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
};

/**
 * Downloads that the page started with "Save as" (backup, export): the file goes straight from the backend to the
 * chosen place, piece by piece – nothing is held in memory. Other downloads (e.g. a medium) keep the normal behaviour.
 */
export class Downloads {
  private readonly pending = new Map<string, { savePath: string; resolve: (result: DownloadResult) => void }>();

  constructor(private readonly progress: (fraction: number) => void = () => undefined) {}

  /** Waits for the download of `url` into `savePath`; start it afterwards (webContents.downloadURL) */
  expect(url: string, savePath: string): Promise<DownloadResult> {
    return new Promise((resolve) => this.pending.set(normalize(url), { savePath, resolve }));
  }

  /** Called for every download (session event "will-download"); false if it is not one of ours */
  take(item: DownloadItemLike): boolean {
    const url = normalize(item.getURL());
    const entry = this.pending.get(url);
    if (!entry) {
      return false;
    }
    this.pending.delete(url);
    item.setSavePath(entry.savePath);
    item.on('updated', () => {
      const total = item.getTotalBytes();
      if (total > 0) {
        this.progress(item.getReceivedBytes() / total);
      }
    });
    item.on('done', (_event, state) => {
      this.progress(-1);
      entry.resolve(state === 'completed' ? { saved: true } : { saved: false, error: downloadFailure(item.getReceivedBytes(), item.getTotalBytes()) });
    });
    return true;
  }
}
