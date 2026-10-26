import { Request, Response } from 'express';
import { ProcessingJob } from '../models/ProcessingJob';
import { DamageRecord } from '../models/DamageRecord';

/**
 * Poll processing job progress
 */
export async function getJobStatus(req: Request, res: Response): Promise<void> {
  try {
    const job = await ProcessingJob.findById(req.params.id)
      .populate('mediaId')
      .populate('modelVersionId');

    if (!job) {
      res.status(404).json({ error: 'Processing job not found' });
      return;
    }

    let detectionsCount = 0;
    if (job.status === 'COMPLETED') {
      detectionsCount = await DamageRecord.countDocuments({ mediaId: job.mediaId });
    }

    res.json({
      jobId: job._id,
      status: job.status,
      mediaId: job.mediaId,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      executionTimeMs: job.executionTimeMs,
      errorMessage: job.errorMessage,
      detectionsCount
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
