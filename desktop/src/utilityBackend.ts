import { utilityProcess } from 'electron';
import type { SpawnBackend } from './backend.js';

/**
 * The backend as an Electron utility process: it runs on the Node of Electron without the RunAsNode switch, which the
 * fuses switch off in the installed app (see electron-builder.yml). The backend talks to it through `process.parentPort`.
 */
export const forkUtilityProcess: SpawnBackend = (entry, { cwd, env }) => {
  const child = utilityProcess.fork(entry, [], {
    cwd,
    env: Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined)),
    execArgv: [],
    stdio: ['ignore', 'ignore', 'pipe'],
    serviceName: 'Cognatio backend',
  });
  let running = true;
  let killed = false;
  const exited = new Promise<number | null>((resolve) =>
    child.once('exit', (code) => {
      running = false;
      resolve(killed ? null : code);
    }),
  );
  return {
    onMessage: (listener) => void child.on('message', listener),
    send: (message) => {
      if (!running) {
        return false;
      }
      child.postMessage(message);
      return true;
    },
    kill: () => {
      if (running) {
        killed = true;
        child.kill();
      }
    },
    stderr: child.stderr,
    exited,
  };
};
