import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getLeads, getLead, createLead, updateLead, convertLead, deleteLead, getLeadStats,
  validateCreate, validateUpdate,
} from './leads.controller';

const router = Router();
router.use(authenticate);

router.get('/stats', getLeadStats);
router.get('/', getLeads);
router.get('/:id', getLead);
router.post('/', validateCreate, createLead);
router.put('/:id', validateUpdate, updateLead);
router.patch('/:id/convert', convertLead);
router.delete('/:id', deleteLead);

export default router;
