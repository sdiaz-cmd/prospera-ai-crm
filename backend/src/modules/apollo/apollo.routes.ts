import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getSettings, saveSettings, searchProspects, importContacts, checkPermission,
  getSavedSearches, createSearch, updateSearch, deleteSearch, runSearch,
  quickImport, getImportLogs,
} from './apollo.controller';

const router = Router();
router.use(authenticate);

router.get('/can-search', checkPermission);
router.get('/settings', getSettings);
router.put('/settings', saveSettings);
router.post('/search', searchProspects);
router.post('/import', importContacts);

// Saved searches
router.get('/saved-searches', getSavedSearches);
router.post('/saved-searches', createSearch);
router.put('/saved-searches/:id', updateSearch);
router.delete('/saved-searches/:id', deleteSearch);
router.post('/saved-searches/:id/run', runSearch);

// Quick import + history
router.post('/quick-import', quickImport);
router.get('/import-logs', getImportLogs);

export default router;
