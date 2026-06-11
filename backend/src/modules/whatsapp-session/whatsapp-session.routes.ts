import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getStatus, connect, disconnect, qrStream } from './whatsapp-session.controller';

const router = Router();

router.get('/status',      authenticate, getStatus);
router.post('/connect',    authenticate, connect);
router.post('/disconnect', authenticate, disconnect);
router.get('/stream',      qrStream);   // SSE — handles own auth via ?token= query param

export default router;
