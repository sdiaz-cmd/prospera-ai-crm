import express from 'express';
import { googleAuth, googleCallback, googleConnect, googleStatus, googleDisconnect } from './google.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = express.Router();

router.get('/',            googleAuth);
router.get('/connect',     googleConnect);
router.get('/callback',    googleCallback);
router.get('/status',      authenticate, googleStatus);
router.delete('/disconnect', authenticate, googleDisconnect);

export default router;
