import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getOverview } from './dashboard.controller';

const router = Router();

router.use(authenticate);
router.get('/overview', getOverview);

export default router;
