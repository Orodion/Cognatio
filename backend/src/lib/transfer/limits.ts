import { readAppSettings } from '../files/appSettings.js';
import { TransferError } from './format.js';

const MB = 1024 * 1024;

/** Range of a limit the user may choose (megabytes); without a choice there is no limit */
export const MIN_LIMIT_MB = 64;
export const MAX_LIMIT_MB = 16 * 1024 * 1024;

/** A positive number or undefined */
const positive = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined);

/** Environment variable in megabytes (a missing or invalid value counts as not set) */
const fromEnv = (name: string) => positive(Number(process.env[name] || undefined));

/** Limit chosen by the user in the settings (settings.json) */
const fromSettings = (key: 'importMb' | 'backupMb') => positive((readAppSettings().limits as Record<string, unknown> | undefined)?.[key]);

const importMb = () => fromSettings('importMb') ?? fromEnv('IMPORT_MAX_MB') ?? null;
const backupMb = () => fromSettings('backupMb') ?? fromEnv('BACKUP_MAX_MB') ?? null;

const bytes = (mb: number | null) => (mb === null ? Infinity : mb * MB);

/**
 * Optional upper limits of the files of export/import and of backup/restore. The files are read and written piece by
 * piece, so they are not needed for the memory; by default only the free disk space counts. The user can set them in
 * the settings, a server operator with IMPORT_MAX_MB and BACKUP_MAX_MB. Export and import share one limit, so what
 * the app exports it can also import again; backup and restore likewise. The unpacked limits protect against "zip
 * bombs": twice the limit, or IMPORT_MAX_UNPACKED_MB / BACKUP_MAX_UNPACKED_MB; without a limit the unpacked data must
 * fit on the disk (see `assertFreeSpace` in lib/files/freeSpace.ts).
 */
export const importMaxBytes = () => bytes(importMb());
export const importMaxUnpackedBytes = () => (fromEnv('IMPORT_MAX_UNPACKED_MB') ?? 2 * (importMb() ?? Infinity)) * MB;
export const backupMaxBytes = () => bytes(backupMb());
export const backupMaxUnpackedBytes = () => (fromEnv('BACKUP_MAX_UNPACKED_MB') ?? 2 * (backupMb() ?? Infinity)) * MB;

/** The limits in megabytes (null: none) with the range, for the settings page */
export const currentLimits = () => ({
  importMb: importMb(),
  backupMb: backupMb(),
  minMb: MIN_LIMIT_MB,
  maxMb: MAX_LIMIT_MB,
});

/** Megabytes for a message, rounded up so a size above the limit never reads as equal to it */
export const toMb = (value: number) => Math.ceil(value / MB);

/** Refuses to build a file that is larger than the limit – before anything is written */
export function assertFitsLimit(size: number, maxBytes: number, reason: 'EXPORT_TOO_LARGE') {
  if (size > maxBytes) {
    throw new TransferError(reason, [`${size} bytes, limit ${maxBytes} bytes`], { sizeMb: toMb(size), limitMb: toMb(maxBytes) });
  }
}
