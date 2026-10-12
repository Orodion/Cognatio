import type { UpdateChannel } from './feeds.js';
import { readSettings, writeSettings } from './settings.js';

/** The part of electron-updater's `autoUpdater` that is used (a stand-in replaces it in the tests) */
export interface UpdaterLike {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  /** Feed file that is read: "latest" (latest.yml) or "beta" (beta.yml) */
  channel: string | null;
  /** Never go back to an older version (a beta user who chooses "stable" waits for the next release) */
  allowDowngrade: boolean;
  setFeedURL(options: { provider: 'generic'; url: string }): void;
  on(event: 'checking-for-update' | 'update-not-available', listener: () => void): unknown;
  on(event: 'update-available' | 'update-downloaded', listener: (info: { version: string }) => void): unknown;
  on(event: 'error', listener: (error: Error) => void): unknown;
  checkForUpdates(): Promise<unknown>;
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
}

export type UpdateState = 'off' | 'idle' | 'checking' | 'up-to-date' | 'downloading' | 'ready' | 'error';

export interface UpdateStatus {
  state: UpdateState;
  /** Version of the update that is downloading or ready */
  version?: string;
  message?: string;
}

/**
 * Short, readable text for the settings page. electron-updater puts the whole answer of the server into the message:
 * a refused request (403 from the sign-in page of a private project) would show a page of HTML.
 */
export function readableError(message: string): string {
  const status = /^(\d{3})\b/.exec(message.trim())?.[1];
  if (status) {
    return `The update server answered with HTTP ${status}. Is the project public and does it have a release?`;
  }
  const text = message
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 200 ? `${text.slice(0, 200)} …` : text;
}

export interface UpdateSettingsView {
  /** False for the portable variant and for development: there is nothing to update */
  supported: boolean;
  check: boolean;
  channel: UpdateChannel;
  status: UpdateStatus;
}

export interface UpdateManagerOptions {
  updater: UpdaterLike;
  dataDir: string;
  supported: boolean;
  /** Where each channel looks for updates; without it the feed of the installed app is used */
  feeds?: Record<UpdateChannel, string>;
  /** Called once when an update is downloaded and waits for the restart */
  onReady?: (version: string) => void;
  /** How often to look for updates (default: daily) and how long to wait after the start */
  intervalMs?: number;
  startDelayMs?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Looks for updates in the background: shortly after the start and once a day, if the user allows it. Downloads
 * the update and installs it when the app is closed (or on request). This is the only network access of the
 * app; nothing but the request for the version file is sent.
 */
export class UpdateManager {
  private status: UpdateStatus = { state: 'idle' };
  private timer: NodeJS.Timeout | null = null;
  private starter: NodeJS.Timeout | null = null;
  private readyReported = false;

  constructor(private readonly options: UpdateManagerOptions) {
    const { updater } = options;
    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;
    updater.on('checking-for-update', () => this.set({ state: 'checking' }));
    updater.on('update-not-available', () => this.set({ state: 'up-to-date' }));
    updater.on('update-available', (info) => this.set({ state: 'downloading', version: info.version }));
    updater.on('update-downloaded', (info) => {
      this.set({ state: 'ready', version: info.version });
      if (!this.readyReported) {
        this.readyReported = true;
        options.onReady?.(info.version);
      }
    });
    updater.on('error', (error) => this.set({ state: 'error', message: readableError(error.message) }));
    this.status = { state: this.checkEnabled() ? 'idle' : 'off' };
    this.applyChannel();
  }

  /** Points the updater at the feed of the chosen channel */
  private applyChannel(): void {
    const { updater, feeds } = this.options;
    const channel = readSettings(this.options.dataDir).updates.channel;
    // Explicit in both directions: a pre-release build would otherwise read beta.yml from the stable feed
    updater.channel = channel === 'beta' ? 'beta' : 'latest';
    updater.allowDowngrade = false;
    if (feeds) {
      updater.setFeedURL({ provider: 'generic', url: feeds[channel] });
    }
  }

  private checkEnabled = () => this.options.supported && readSettings(this.options.dataDir).updates.check;

  private set(status: UpdateStatus) {
    this.status = status;
  }

  view(): UpdateSettingsView {
    const { check, channel } = readSettings(this.options.dataDir).updates;
    return { supported: this.options.supported, check, channel, status: this.status };
  }

  /** Starts the regular checks (after a short delay, so the window comes first) */
  start(): void {
    this.stop();
    if (!this.checkEnabled()) {
      this.set({ state: 'off' });
      return;
    }
    this.starter = setTimeout(() => void this.checkNow(), this.options.startDelayMs ?? 15_000);
    this.timer = setInterval(() => void this.checkNow(), this.options.intervalMs ?? DAY_MS);
    this.starter.unref();
    this.timer.unref();
  }

  stop(): void {
    if (this.starter) {
      clearTimeout(this.starter);
    }
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.starter = this.timer = null;
  }

  /** The switch in the settings: stores the choice and starts or stops the regular checks */
  setCheck(check: boolean): UpdateSettingsView {
    const settings = readSettings(this.options.dataDir);
    writeSettings(this.options.dataDir, { ...settings, updates: { ...settings.updates, check } });
    if (check) {
      this.set({ state: 'idle' });
      this.start();
    } else {
      this.stop();
      this.set({ state: 'off' });
    }
    return this.view();
  }

  /** The channel chosen in the settings: stored, takes effect for the next check (which is started right away) */
  setChannel(channel: UpdateChannel): UpdateSettingsView {
    const settings = readSettings(this.options.dataDir);
    if (settings.updates.channel !== channel) {
      writeSettings(this.options.dataDir, { ...settings, updates: { ...settings.updates, channel } });
      this.applyChannel();
    }
    return this.view();
  }

  /** "Check now": works even if the regular check is off – the user asked for it */
  async checkNow(): Promise<UpdateStatus> {
    if (!this.options.supported) {
      return this.status;
    }
    if (this.status.state === 'ready' || this.status.state === 'downloading') {
      return this.status;
    }
    try {
      await this.options.updater.checkForUpdates();
    } catch (err) {
      // the 'error' event has already set the status; this covers errors without one
      if (this.status.state !== 'error') {
        this.set({ state: 'error', message: readableError(err instanceof Error ? err.message : String(err)) });
      }
    }
    return this.status;
  }

  /** Restarts the app and installs the downloaded update */
  installNow(): void {
    this.options.updater.quitAndInstall(true, true);
  }
}
