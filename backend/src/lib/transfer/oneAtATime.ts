import type { Request, RequestHandler, Response } from 'express';

/** The operation that is running (null: none); shared by import, export, backup and restore */
let running: string | null = null;
/** Jobs waiting for the guard, in order */
const waiting: Array<() => void> = [];

type Work = (req: Request, res: Response) => unknown;

function release() {
  running = null;
  waiting.shift()?.();
}

/**
 * Import, export, backup and restore read or replace much of the data and keep the disk busy: only one of them runs
 * at a time. A request (download, check) is answered at once with 409 (OPERATION_IN_PROGRESS) instead of
 * interleaving its work with the running one; a job waits instead (see `exclusive`).
 *
 * With `upload` (e.g. multer) the guard is taken before the upload, so a refused request is not stored: its body is
 * read and dropped, then the 409 follows. It is released only when the work has finished and the response is closed –
 * a download holds it while it is sent.
 */
export const oneAtATime =
  (operation: string, work: Work, upload?: RequestHandler): RequestHandler =>
  (req, res, next) => {
    if (running) {
      const busy = running;
      const refuse = () => res.status(409).json({ error: `Another operation is running (${busy})`, reason: 'OPERATION_IN_PROGRESS', details: [busy] });
      if (upload && !req.complete) {
        // Read the file without keeping it, then answer: an answer in the middle of the upload breaks the connection
        req.once('end', refuse);
        req.resume();
      } else {
        refuse();
      }
      return;
    }
    running = operation;
    const closed = res.closed ? Promise.resolve() : new Promise<void>((resolve) => res.once('close', () => resolve()));
    const done = (async () => {
      if (upload) {
        const failed = await new Promise<unknown>((resolve) => upload(req, res, resolve));
        if (failed) {
          // e.g. a file above the limit or a cancelled upload: the error handler of the router answers
          next(failed);
          return;
        }
      }
      await work(req, res);
    })().catch(next);
    void Promise.all([done, closed]).then(release);
  };

/**
 * Takes the guard for a job (import, restore): waits until the running operation has finished – e.g. the download
 * of the current state that the page started just before a restore. `onWait` is called once if it has to wait;
 * `checkpoint` may throw while waiting (the user cancelled). Returns the release.
 */
export async function exclusive(operation: string, onWait?: () => void, checkpoint?: () => void): Promise<() => void> {
  if (running) {
    onWait?.();
  }
  while (running) {
    await new Promise<void>((resolve) => {
      waiting.push(resolve);
      // Look again now and then: a cancelled job must not wait for the end of a long download
      setTimeout(() => {
        const index = waiting.indexOf(resolve);
        if (index >= 0) {
          waiting.splice(index, 1);
          resolve();
        }
      }, 1000);
    });
    checkpoint?.();
  }
  running = operation;
  return release;
}
