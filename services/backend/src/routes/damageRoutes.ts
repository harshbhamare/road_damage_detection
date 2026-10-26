import { Router } from 'express';
import { getSpatialDamages, getDamageById, verifyDamage } from '../controllers/damageController';

const router = Router();

router.get('/spatial', getSpatialDamages);
router.get('/:id', getDamageById);
router.patch('/:id/verify', verifyDamage);

export default router;
