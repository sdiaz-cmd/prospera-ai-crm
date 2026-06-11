import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getConfig, saveConfig } from './whatsapp-agent.controller';

const router = Router();

router.get('/',  authenticate, getConfig);
router.post('/', authenticate, saveConfig);

export default router;
