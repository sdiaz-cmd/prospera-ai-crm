import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getConversations, getMessages, sendMessage, getUnreadCount, deleteConversation } from './whatsapp-inbox.controller';

const router = Router();

router.get('/conversations', authenticate, getConversations);
router.get('/conversations/:phone', authenticate, getMessages);
router.post('/send', authenticate, sendMessage);
router.get('/unread-count', authenticate, getUnreadCount);
router.delete('/conversations/:phone', authenticate, deleteConversation);

export default router;
