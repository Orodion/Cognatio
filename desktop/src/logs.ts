import fs from 'node:fs';

/**
 * The last error entry of the JSON-lines log of the backend (e.g. "Migration … failed"), for the error dialog.
 * Reads only the end of the file; returns null if there is none. `since` is the size of the file at the start of
 * the attempt: older entries (from an earlier run) are not shown as the reason of this one.
 */
export function lastError(logFile: string, tailBytes = 64 * 1024, since = 0): string | null {
  if (!fs.existsSync(logFile)) {
    return null;
  }
  const size = fs.statSync(logFile).size;
  const fd = fs.openSync(logFile, 'r');
  try {
    // A smaller file than at the start was rotated or cleared: everything in it is new
    const length = Math.min(size - (since <= size ? since : 0), tailBytes);
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, size - length);
    const lines = buffer.toString('utf8').split('\n').reverse();
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as { level?: string; msg?: string; err?: { message?: string } };
        if (entry.level === 'error') {
          return describeEntry(entry);
        }
      } catch {
        // incomplete first line of the tail or no JSON
      }
    }
    return null;
  } finally {
    fs.closeSync(fd);
  }
}

/** Size of the log file (0 without one): where the entries of the current attempt begin */
export function logSize(logFile: string): number {
  try {
    return fs.statSync(logFile).size;
  } catch {
    return 0;
  }
}

type Entry = { level?: string; msg?: string; err?: { message?: string } };

const describeEntry = (entry: Entry) => [entry.msg, entry.err?.message].filter(Boolean).join(': ');

/**
 * The most telling line of the error output of the backend, for the error dialog. The backend writes its log
 * entries there as JSON lines too: the last error entry is shown like in the log; otherwise the last line that names
 * an error (not a stack frame), otherwise the last line. Null if there is no output.
 */
export function errorSummary(stderr: string, maxLength = 300): string | null {
  const lines = stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reverse();
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as Entry;
      if (entry.level === 'error' && entry.msg) {
        return describeEntry(entry).slice(0, maxLength);
      }
    } catch {
      // no JSON line
    }
  }
  const line = lines.find((l) => /error|cannot find module|EADDRINUSE|ENOENT/i.test(l) && !l.startsWith('at ')) ?? lines[0];
  return line ? line.slice(0, maxLength) : null;
}
