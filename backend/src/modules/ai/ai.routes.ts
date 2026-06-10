import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getStatus, generateEmail, scoreLead, scoreAllLeads, chat } from './ai.controller';

const router = Router();
router.use(authenticate);

router.get('/status', getStatus);
router.post('/email', generateEmail);
router.post('/score/:leadId', scoreLead);
router.post('/score-all', scoreAllLeads);
router.post('/chat', chat);

export default router;
