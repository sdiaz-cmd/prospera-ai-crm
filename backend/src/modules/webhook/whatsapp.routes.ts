import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { receiveWebhook, getWebhookInfo, getEvents, getWebhookStats } from './whatsapp.controller';

const router = Router();

// Public — called by the WhatsApp agent
router.post('/whatsapp', receiveWebhook);

// Protected — for the Settings UI
router.get('/info', authenticate, getWebhookInfo);
router.get('/events', authenticate, getEvents);
router.get('/stats', authenticate, getWebhookStats);

export default router;
