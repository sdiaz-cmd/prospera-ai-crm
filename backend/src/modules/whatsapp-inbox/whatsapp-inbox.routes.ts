import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getConversations, getMessages, sendMessage, getUnreadCount } from './whatsapp-inbox.controller';

const router = Router();

router.get('/conversations', authenticate, getConversations);
router.get('/conversations/:phone', authenticate, getMessages);
router.post('/send', authenticate, sendMessage);
router.get('/unread-count', authenticate, getUnreadCount);

export default router;
