import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getSettings, saveSettings, searchProspects, importContacts, checkPermission } from './apollo.controller';

const router = Router();
router.use(authenticate);

router.get('/can-search', checkPermission);
router.get('/settings', getSettings);
router.put('/settings', saveSettings);
router.post('/search', searchProspects);
router.post('/import', importContacts);

export default router;
