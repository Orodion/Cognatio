import express from 'express';
import path from 'node:path';
import { logger } from '../lib/logger.js';
import { createLogExport, logExportName, readLogTail } from '../lib/logFiles.js';

/** Log of the server for the settings page: the newest lines, an export for the error analysis and deleting the log */
const router = express.Router();
const log = logger.child({ component: 'logs' });

const DEFAULT_LINES = 500;
const MAX_LINES = 5000;

router.get('/logs', (req, res) => {
  const requested = Number(req.query.lines);
  const lines = Number.isInteger(requested) && requested > 0 ? Math.min(requested, MAX_LINES) : DEFAULT_LINES;
  const file = logger.file;
  res.json({
    // Only the file name – the path on the server is nobody's business
    file: file ? path.basename(file) : null,
    level: logger.level,
    lines: file ? readLogTail(file, lines) : [],
  });
});

router.delete('/logs', (_req, res) => {
  try {
    logger.clearFiles();
    // The first entry of the new file
    log.warn('Logs cleared');
    res.json({ cleared: true });
  } catch (err) {
    log.error('Clearing the logs failed', { err });
    res.status(500).json({ error: 'Clearing the logs failed', reason: 'LOG_CLEAR_FAILED' });
  }
});

router.get('/logs/export', (_req, res) => {
  try {
    const now = new Date();
    const zip = createLogExport(logger.file, logger.level, now);
    log.info('Log export created', { bytes: zip.length });
    res
      .setHeader('Content-Type', 'application/zip')
      .setHeader('Content-Disposition', `attachment; filename="${logExportName(now)}"`)
      .setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
      .send(Buffer.from(zip));
  } catch (err) {
    log.error('Log export failed', { err });
    res.status(500).json({ error: 'Log export failed', reason: 'LOG_EXPORT_FAILED' });
  }
});

export default router;
