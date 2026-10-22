/**
 * Platform layer between the app and its surroundings. In the browser everything works as on any web page;
 * a shell (the Windows app, later a mobile app) can provide its own implementation as `window.cognatioPlatform`
 * before the app starts – everything it leaves out falls back to the browser.
 */
export type UpdateStatus = {
  state: 'off' | 'idle' | 'checking' | 'up-to-date' | 'downloading' | 'ready' | 'error';
  /** Version of the update that is downloading or ready */
  version?: string;
  message?: string;
};

export interface UpdateSettings {
  /** False where there is nothing to update (portable variant) */
  supported: boolean;
  /** Look for updates automatically, once a day */
  check: boolean;
  /** "beta" also gets the pre-releases */
  channel: 'stable' | 'beta';
  status: UpdateStatus;
}

/** Updates of the program itself – only the Windows app has them */
export interface UpdatesBridge {
  getSettings: () => Promise<UpdateSettings>;
  setCheck: (check: boolean) => Promise<UpdateSettings>;
  setChannel: (channel: 'stable' | 'beta') => Promise<UpdateSettings>;
  checkNow: () => Promise<UpdateStatus>;
  /** Restarts the app and installs the downloaded update */
  installNow: () => Promise<void>;
}

export interface PlatformBridge {
  /** Address of the backend, e.g. `http://127.0.0.1:51234`; empty: same address as the page */
  apiBase?: string;
  /** Saves a file, e.g. with a "Save as" dialog of the operating system; false if the user cancelled it */
  saveFile?: (data: Blob, filename: string) => Promise<boolean | void>;
  /**
   * Downloads an address of the backend straight into a file the user chooses ("Save as"), without holding it in
   * memory. `error`: FILE_SYSTEM_LIMIT (the drive takes no file this large, e.g. FAT32) or DOWNLOAD_FAILED.
   */
  downloadTo?: (url: string, filename: string) => Promise<DownloadResult>;
  /** Saves the page as printed (print styles) as a PDF with a "Save as" dialog; false if the user cancelled it */
  savePdf?: (filename: string) => Promise<boolean>;
  /** Quits the application (the Windows app has no browser tab to close) */
  quit?: () => Promise<void>;
  updates?: UpdatesBridge;
}

declare global {
  interface Window {
    cognatioPlatform?: PlatformBridge;
  }
}

export interface DownloadResult {
  /** False if the user cancelled the "Save as" dialog */
  saved: boolean;
  error?: 'FILE_SYSTEM_LIMIT' | 'DOWNLOAD_FAILED';
}

const bridge = (): PlatformBridge => (typeof window === 'undefined' ? {} : (window.cognatioPlatform ?? {}));

/** Address of the backend without a trailing slash: from the shell, otherwise VITE_API_BASE at build time, otherwise the page itself */
export const apiBase = (): string => (bridge().apiBase ?? import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '');

/** Address of a backend path (`/graphql`, `/api/v1/…`, `/uploads/…`); other addresses (blob:, data:, https:) stay unchanged */
export const apiUrl = (path: string): string => (path.startsWith('/') && !path.startsWith('//') ? `${apiBase()}${path}` : path);

/** True if the shell saves downloads itself (with its "Save as" dialog); false in the browser */
export const hasNativeDownload = (): boolean => !!bridge().downloadTo;

/** Saving the page as a PDF file of the shell; undefined in the browser, where the print dialog offers it */
export const savePdfBridge = (): ((filename: string) => Promise<boolean>) | undefined => bridge().savePdf;

/** Quits the application; undefined in the browser, where the user closes the tab */
export const quitApp = (): (() => Promise<void>) | undefined => bridge().quit;

/** The update functions of the shell; undefined in the browser */
export const updatesBridge = (): UpdatesBridge | undefined => bridge().updates;

function clickDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Saves a file; in the browser as a download (depending on its settings the browser asks for the location). Resolves
 * with false if the user cancelled the "Save as" dialog of the app; a browser does not tell, so there it is always true.
 */
export async function saveFile(data: Blob, filename: string): Promise<boolean> {
  const native = bridge().saveFile;
  if (native) {
    return (await native(data, filename)) !== false;
  }
  const url = URL.createObjectURL(data);
  clickDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

/**
 * Downloads a path of the backend (`/api/v1/…`) into a file without holding it in memory: in the browser as a normal
 * download (it streams into the file and shows its progress), in the desktop app with its "Save as" dialog.
 */
export async function downloadFrom(path: string, filename: string): Promise<DownloadResult> {
  const native = bridge().downloadTo;
  if (native) {
    // The desktop app needs the full address; the page itself has it relative
    return native(new URL(apiUrl(path), window.location.href).toString(), filename);
  }
  clickDownload(apiUrl(path), filename);
  return { saved: true };
}

/** Saves a data URL (e.g. the image of the family tree); false as with saveFile */
export async function saveDataUrl(dataUrl: string, filename: string): Promise<boolean> {
  const native = bridge().saveFile;
  if (native) {
    return (await native(await (await fetch(dataUrl)).blob(), filename)) !== false;
  }
  clickDownload(dataUrl, filename);
  return true;
}
