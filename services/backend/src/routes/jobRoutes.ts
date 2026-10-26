import { Router } from 'express';
import { getJobStatus } from '../controllers/jobController';

const router = Router();

router.get('/:id', getJobStatus);

export default router;
