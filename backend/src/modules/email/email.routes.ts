import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  sendContactEmail, sendLeadEmail,
  listContactEmails, listLeadEmails,
  trackOpen,
} from './email.controller';

const router = Router();

// Public tracking pixel (no auth)
router.get('/track/:id', trackOpen);

// Protected routes
router.use(authenticate);
router.get('/contact/:contactId',  listContactEmails);
router.post('/contact/:contactId', sendContactEmail);
router.get('/lead/:leadId',        listLeadEmails);
router.post('/lead/:leadId',       sendLeadEmail);

export default router;
