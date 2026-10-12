import type { Request, RequestHandler, Response } from 'express';

/** The operation that is running (null: none); shared by import, export, backup and restore */
let running: string | null = null;

type Work = (req: Request, res: Response) => unknown;

/**
 * Import, export, backup and restore hold whole files in memory and read or replace much of the data: only one of
 * them runs at a time. Another one is answered at once with 409 (OPERATION_IN_PROGRESS) instead of doubling the memory
 * or interleaving its changes with the running one.
 *
 * The guard is taken before the upload (`upload`, e.g. multer), so a refused request is not read into memory: its
 * body is read and dropped, then the 409 follows. It is released only when the work has finished and
 * the response is closed – a client that cancels does not stop an import that is still writing, and a large
 * response is still held in memory while it is sent.
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
    void Promise.all([done, closed]).then(() => {
      running = null;
    });
  };
