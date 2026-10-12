import { fork, type Serializable } from 'node:child_process';
import crypto from 'node:crypto';

/** The part of a child process the shell uses: an Electron utility process in the app, a Node child process in the tests */
export interface BackendProcess {
  /** Messages of the backend, e.g. `{type:'ready', port}` */
  onMessage(listener: (message: unknown) => void): void;
  /** Sends a message to the backend; false if the process cannot receive any more */
  send(message: Serializable): boolean;
  kill(): void;
  /** Error output of the backend (null if it is not piped) */
  stderr: NodeJS.ReadableStream | null;
  /** Resolves with the exit code when the process ends (null: killed) */
  exited: Promise<number | null>;
}

/** Starts the entry file of the backend as a child process with exactly this environment */
export type SpawnBackend = (entry: string, options: { cwd: string; env: NodeJS.ProcessEnv }) => BackendProcess;

/** The backend as a Node child process (tests; the app uses an Electron utility process, see utilityBackend.ts) */
export const forkWithNode =
  (execPath = process.execPath): SpawnBackend =>
  (entry, { cwd, env }) => {
    const child = fork(entry, [], {
      cwd,
      execPath,
      // Options of the parent itself (e.g. --inspect) are not passed on
      execArgv: [],
      env,
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    });
    return {
      onMessage: (listener) => void child.on('message', listener),
      send: (message) => child.connected && child.send(message),
      kill: () => void child.kill(),
      stderr: child.stderr,
      exited: new Promise((resolve) => child.once('exit', (code) => resolve(code))),
    };
  };

export interface BackendOptions {
  entry: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  /** How the backend process is started (default: a Node child process) */
  spawn?: SpawnBackend;
  /** The port to listen on; if it is taken, the backend takes a free one (default: a free one) */
  port?: number;
  /** How long to wait for the backend to report its port (first start: creating the database) */
  startTimeoutMs?: number;
  /** How long to wait for a clean shutdown before the process is killed */
  stopTimeoutMs?: number;
}

export interface BackendHandle {
  port: number;
  token: string;
  origin: string;
  /** Resolves with the exit code (null: killed) when the process ends – whether asked to or not */
  exited: Promise<number | null>;
  /** Asks the backend to shut down (it stops the database), kills it after the timeout; resolves with the exit code */
  stop(): Promise<number | null>;
  /** The end of what the backend wrote to its error output (crashes before the logger exists end up there) */
  stderr(): string;
}

/** The backend ended or did not report in time while starting; `stderr` is the end of its error output */
export class BackendStartError extends Error {
  constructor(
    message: string,
    public stderr = '',
  ) {
    super(message);
    this.name = 'BackendStartError';
  }
}

const STDERR_TAIL = 4000;

/** A random access token for this start; the backend refuses every request without it */
export const newToken = () => crypto.randomBytes(32).toString('hex');

/**
 * A port for the first start, kept from then on: below the ranges the system hands out for outgoing connections
 * (Windows from 49152, Linux from 32768), so it is rarely taken at a later start
 */
export const newPort = () => 20_000 + crypto.randomInt(12_000);

/**
 * Starts the backend as a child process on the given or a free port, only reachable from this machine, protected by
 * a random token. Resolves when the backend reports `{type:'ready', port}`; rejects if it ends before or takes too long.
 */
export function startBackend(options: BackendOptions): Promise<BackendHandle> {
  const token = newToken();
  const spawn = options.spawn ?? forkWithNode();
  const child = spawn(options.entry, {
    cwd: options.cwd,
    env: {
      ...process.env,
      ...options.env,
      PORT: String(options.port ?? 0),
      COGNATIO_PORT_FALLBACK: options.port ? '1' : '0',
      HOST: '127.0.0.1',
      COGNATIO_ACCESS_TOKEN: token,
      NODE_ENV: 'production',
    },
  });
  let stderrTail = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    stderrTail = (stderrTail + chunk.toString('utf8')).slice(-STDERR_TAIL);
  });
  let ended = false;
  const exited = child.exited.then((code) => {
    ended = true;
    return code;
  });
  const stopTimeoutMs = options.stopTimeoutMs ?? 45_000;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new BackendStartError('The backend did not start in time', stderrTail));
    }, options.startTimeoutMs ?? 120_000);
    child.onMessage((message) => {
      const m = message as { type?: string; port?: number } | null;
      if (m?.type === 'ready' && typeof m.port === 'number') {
        clearTimeout(timer);
        const port = m.port;
        resolve({
          port,
          token,
          origin: `http://127.0.0.1:${port}`,
          exited,
          stderr: () => stderrTail,
          async stop() {
            if (ended) {
              return exited;
            }
            if (!child.send({ type: 'shutdown' })) {
              child.kill();
            }
            const killer = setTimeout(() => child.kill(), stopTimeoutMs);
            const code = await exited;
            clearTimeout(killer);
            return code;
          },
        });
      }
    });
    void exited.then((code) => {
      clearTimeout(timer);
      reject(new BackendStartError(`The backend ended during start (exit code ${code})`, stderrTail));
    });
  });
}
