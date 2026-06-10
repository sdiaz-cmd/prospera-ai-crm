import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getSales, getLeads, getPipeline, getTeam } from './reports.controller';

const router = Router();
router.use(authenticate);

router.get('/sales', getSales);
router.get('/leads', getLeads);
router.get('/pipeline', getPipeline);
router.get('/team', getTeam);

export default router;
