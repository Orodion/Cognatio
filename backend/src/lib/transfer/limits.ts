import { readAppSettings } from '../files/appSettings.js';
import { TransferError } from './format.js';

const MB = 1024 * 1024;

/** Default of the size limits and the range the user may choose from (megabytes) */
export const DEFAULT_LIMIT_MB = 2048;
export const MIN_LIMIT_MB = 64;
export const MAX_LIMIT_MB = 1024 * 1024;

/** A positive number or undefined */
const positive = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined);

/** Environment variable in megabytes (a missing or invalid value counts as not set) */
const fromEnv = (name: string) => positive(Number(process.env[name] || undefined));

/** Limit chosen by the user in the settings (settings.json) */
const fromSettings = (key: 'importMb' | 'backupMb') => positive((readAppSettings().limits as Record<string, unknown> | undefined)?.[key]);

const importMb = () => fromSettings('importMb') ?? fromEnv('IMPORT_MAX_MB') ?? DEFAULT_LIMIT_MB;
const backupMb = () => fromSettings('backupMb') ?? fromEnv('BACKUP_MAX_MB') ?? DEFAULT_LIMIT_MB;

/**
 * Size limits of files that are held in memory completely while they are read or written. Export and import use
 * the same limit, so what the app exports it can also import again. Backup and restore likewise. The user can raise
 * them in the settings (a computer with much memory); without that IMPORT_MAX_MB and BACKUP_MAX_MB apply, then 2 GB.
 * The unpacked limits protect against "zip bombs": twice the limit, or IMPORT_MAX_UNPACKED_MB / BACKUP_MAX_UNPACKED_MB.
 */
export const importMaxBytes = () => importMb() * MB;
export const importMaxUnpackedBytes = () => (fromEnv('IMPORT_MAX_UNPACKED_MB') ?? 2 * importMb()) * MB;
export const backupMaxBytes = () => backupMb() * MB;
export const backupMaxUnpackedBytes = () => (fromEnv('BACKUP_MAX_UNPACKED_MB') ?? 2 * backupMb()) * MB;

/** The limits in megabytes with the default and the range, for the settings page */
export const currentLimits = () => ({
  importMb: importMb(),
  backupMb: backupMb(),
  defaultMb: DEFAULT_LIMIT_MB,
  minMb: MIN_LIMIT_MB,
  maxMb: MAX_LIMIT_MB,
});

/** Megabytes for a message, rounded up so a size above the limit never reads as equal to it */
export const toMb = (bytes: number) => Math.ceil(bytes / MB);

/** Refuses to build a file that is larger than the limit – before any file is read into memory */
export function assertFitsLimit(bytes: number, maxBytes: number, reason: 'EXPORT_TOO_LARGE') {
  if (bytes > maxBytes) {
    throw new TransferError(reason, [`${bytes} bytes, limit ${maxBytes} bytes`], { sizeMb: toMb(bytes), limitMb: toMb(maxBytes) });
  }
}
