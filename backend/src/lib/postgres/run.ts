import { execFile, spawn } from 'node:child_process';

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Runs a program and always returns its exit code (never throws for a non-zero code); replaceable in tests.
 * `quiet` is for programs that leave a background process behind (pg_ctl start): the output is not captured,
 * otherwise the background process keeps the pipes open and the call would never return.
 */
export type Run = (file: string, args: string[], env?: NodeJS.ProcessEnv, quiet?: boolean) => Promise<RunResult>;

export const run: Run = (file, args, env, quiet) =>
  new Promise((resolve, reject) => {
    const fullEnv = { ...process.env, ...env };
    if (quiet) {
      const child = spawn(file, args, { windowsHide: true, env: fullEnv, stdio: 'ignore' });
      child.once('error', reject);
      child.once('exit', (code) => resolve({ code: code ?? 1, stdout: '', stderr: '' }));
      return;
    }
    execFile(file, args, { windowsHide: true, env: fullEnv, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      const code = (err as { code?: unknown } | null)?.code;
      if (err && typeof code !== 'number') {
        reject(err);
        return;
      }
      resolve({ code: err ? (code as number) : 0, stdout, stderr });
    });
  });
