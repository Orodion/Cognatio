import type { Request, Response } from 'express';
import { sendDownload, type ZipOutput } from '../files/zipWriter.js';
import { TransferError } from './format.js';
import { startJob, type JobAnswer } from './jobs.js';

/**
 * Sends a download (export, backup) as a job, so the page shows its progress – the bytes sent – and can cancel it.
 * The browser does not tell the page about a download it saves, so the page names the job: `?activity=<uuid>`.
 * Resolves when the download has ended; true if everything was sent. `result` goes into the answer of the job. A file
 * that cannot be read before the first byte rejects, so the route can still answer with an error.
 */
export async function sendAsJob(
  req: Request,
  res: Response,
  operation: 'export' | 'backup',
  filename: string,
  output: ZipOutput,
  options: { contentType?: string; result?: Record<string, unknown>; failed: (error: unknown) => JobAnswer },
): Promise<boolean> {
  // Before the job: a file that cannot be read is answered as an error, the client still waits for an answer
  const size = await output.size;
  let sent = false;
  const job = startJob(
    operation,
    async (control) => {
      control.phase('download', size);
      sent = await sendDownload(res, output, filename, options.contentType, control);
      if (!sent) {
        // Cancelled on the page, by the client or a file could not be read: the client has a broken download
        throw control.cancelled() ?? new TransferError('DOWNLOAD_FAILED');
      }
      return { filename, size, ...options.result };
    },
    (outcome) => ('result' in outcome ? { status: 200, body: outcome.result } : options.failed(outcome.error)),
    { id: req.query.activity, label: filename },
  );
  await job.finished;
  return sent;
}
