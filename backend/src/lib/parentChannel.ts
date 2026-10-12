/**
 * Messages to and from the program that started the backend (desktop app). In the installed app the backend runs as an
 * Electron utility process, which talks through `process.parentPort`; as a Node child process (`fork`, tests) it uses
 * `process.send`. Started on its own there is no channel and messages go nowhere.
 */
interface ParentPort {
  on(event: 'message', listener: (event: { data: unknown }) => void): unknown;
  postMessage(message: unknown): void;
}

const parentPort = () => (process as NodeJS.Process & { parentPort?: ParentPort }).parentPort;

/** Sends a message to the parent, e.g. `{ type: 'ready', port }` */
export function notifyParent(message: Record<string, unknown>): void {
  const port = parentPort();
  if (port) {
    port.postMessage(message);
  } else {
    process.send?.(message);
  }
}

/** Calls `listener` for every message of the parent, e.g. `{ type: 'shutdown' }` */
export function onParentMessage(listener: (message: unknown) => void): void {
  const port = parentPort();
  if (port) {
    port.on('message', (event) => listener(event.data));
  } else {
    process.on('message', listener);
  }
}
