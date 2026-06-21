import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { listNotifications, markRead, markAllRead } from './notifications.controller';

const router = Router();
router.use(authenticate);

router.get('/',              listNotifications);
router.patch('/:id/read',   markRead);
router.patch('/read-all',   markAllRead);

export default router;
