import fs from 'node:fs';
import path from 'node:path';
import type { UpdateChannel } from './feeds.js';

/** Settings of the shell (not of the web app), in `desktop.json` in the data folder */
export interface DesktopSettings {
  updates: { check: boolean; channel: UpdateChannel };
  /**
   * Port of the backend at the last start. The page keeps its settings (language, colour scheme, tree, views) in the
   * local storage of its origin – with a new port on every start they would be gone every time.
   */
  port?: number;
}

const DEFAULTS: DesktopSettings = { updates: { check: true, channel: 'stable' } };

const validPort = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1024 && (value as number) <= 65535;

export function readSettings(dataDir: string): DesktopSettings {
  try {
    const stored = JSON.parse(fs.readFileSync(path.join(dataDir, 'desktop.json'), 'utf8')) as {
      updates?: { check?: unknown; channel?: unknown };
      port?: unknown;
    };
    const settings: DesktopSettings = {
      updates: { check: stored.updates?.check !== false, channel: stored.updates?.channel === 'beta' ? 'beta' : 'stable' },
    };
    if (validPort(stored.port)) {
      settings.port = stored.port;
    }
    return settings;
  } catch {
    // missing or damaged file: the defaults apply, the app must start anyway
    return structuredClone(DEFAULTS);
  }
}

export function writeSettings(dataDir: string, settings: DesktopSettings): void {
  // Readable by the user only, like the backend creates it (see backend/src/lib/files/dataDir.ts)
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(dataDir, 'desktop.json'), JSON.stringify(settings, null, 2));
}
