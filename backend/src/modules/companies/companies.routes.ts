import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getCompanySettings, updateCompanySettings, getCompanyStats } from './companies.controller';

const router = Router();

router.use(authenticate);

router.get('/settings', getCompanySettings);
router.put('/settings', updateCompanySettings);
router.get('/stats', getCompanyStats);

export default router;
