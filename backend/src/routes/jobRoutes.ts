import express from 'express';
import { cancelJob, jobStatus, runningJobs } from '../lib/transfer/jobs.js';

/** Progress and result of long operations (import, restore, export and backup downloads), and cancelling them */
const router = express.Router();

/** The jobs that are running – the page shows them again after it was reloaded */
router.get('/jobs', (_req, res) => {
  res.json(runningJobs());
});

router.get('/jobs/:id', (req, res) => {
  const status = jobStatus(req.params.id);
  if (!status) {
    return res.status(404).json({ error: 'Job not found', reason: 'JOB_NOT_FOUND' });
  }
  return res.json(status);
});

/** Cancels a job before it changes the database; 409 if it is too late (or already finished) */
router.delete('/jobs/:id', (req, res) => {
  if (!jobStatus(req.params.id)) {
    return res.status(404).json({ error: 'Job not found', reason: 'JOB_NOT_FOUND' });
  }
  if (!cancelJob(req.params.id)) {
    return res.status(409).json({ error: 'Job can no longer be cancelled', reason: 'JOB_NOT_CANCELLABLE' });
  }
  return res.status(202).json({ cancelling: true });
});

export default router;
