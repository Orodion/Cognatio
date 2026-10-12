import fs from 'node:fs';
import path from 'node:path';
import { strToU8, zipSync, type Zippable } from 'fflate';
import { appVersion } from './systemInfo.js';
import { fileTimestamp } from './transfer/exportData.js';

/** Upper limit of what is read from the end of the file for the viewer (the newest lines are what matters) */
const TAIL_BYTES = 4 * 1024 * 1024;

/**
 * The last lines of a log file (oldest first). Only the end of the file is read, so a full 10 MB file is no problem.
 * A missing file gives no lines.
 */
export function readLogTail(file: string, maxLines: number): string[] {
  let fd: number | null = null;
  try {
    fd = fs.openSync(file, 'r');
    const { size } = fs.fstatSync(fd);
    const length = Math.min(size, TAIL_BYTES);
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, size - length);
    const lines = buffer.toString('utf8').split(/\r?\n/);
    // If the read started in the middle of the file, the first line is cut off
    if (size > length) {
      lines.shift();
    }
    return lines.filter((line) => line.trim()).slice(-maxLines);
  } catch {
    return [];
  } finally {
    if (fd !== null) {
      fs.closeSync(fd);
    }
  }
}

/** The log file and its rotated files (`name.1`, `name.2` …) that exist, newest first */
export function logFilesOf(file: string): string[] {
  const dir = path.dirname(file);
  const base = path.basename(file);
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const rotated = names
    .map((name) => ({ name, n: Number(name.match(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(\\d+)$`))?.[1]) }))
    .filter((f) => Number.isInteger(f.n))
    .sort((a, b) => a.n - b.n)
    .map((f) => f.name);
  return [...(names.includes(base) ? [base] : []), ...rotated].map((name) => path.join(dir, name));
}

/** File name of the export, e.g. "cognatio_logs_20260930_143005.zip" */
export const logExportName = (now: Date) => `cognatio_logs_${fileTimestamp(now)}.zip`;

/**
 * ZIP file for the error analysis: all log files plus a small technical description
 * (version, Node, system, level). Contains no environment variables and no data of the family trees.
 */
export function createLogExport(file: string | null, level: string, now = new Date()): Uint8Array {
  const zip: Zippable = {};
  const files = file ? logFilesOf(file) : [];
  for (const logFile of files) {
    zip[`backend/${path.basename(logFile)}`] = new Uint8Array(fs.readFileSync(logFile));
  }
  zip['system.json'] = strToU8(
    JSON.stringify(
      {
        exportedAt: now.toISOString(),
        appVersion: appVersion(),
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        uptimeSeconds: Math.round(process.uptime()),
        logLevel: level,
        logFile: file ? path.basename(file) : null,
        logFiles: files.map((f) => path.basename(f)),
      },
      null,
      2,
    ),
  );
  return zipSync(zip);
}
