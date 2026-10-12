import fs from 'node:fs';
import path from 'node:path';
import { dataDirPath } from './dataDir.js';

/**
 * Settings of this installation that the server itself needs (e.g. the size limits of files, which depend on the
 * memory of the computer): `settings.json` in COGNATIO_DATA_DIR, otherwise in the working folder of the backend.
 * SETTINGS_FILE overrides the location. Settings of the browser (appearance, language) are not kept here.
 */
export const settingsFile = () => process.env.SETTINGS_FILE ?? dataDirPath(process.env, 'settings.json') ?? path.join(process.cwd(), 'settings.json');

/** The saved settings; an empty object if the file is missing or damaged */
export function readAppSettings(): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Saves the given settings, the others stay as they are; the file is replaced in one step so it is never half written */
export function writeAppSettings(values: Record<string, unknown>) {
  const file = settingsFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify({ ...readAppSettings(), ...values }, null, 2));
  fs.renameSync(temporary, file);
}
