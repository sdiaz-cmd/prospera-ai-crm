import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getRules, createRule, updateRule, deleteRule,
  getRecords, createRecord, updateRecordStatus, deleteRecord, getSummary,
} from './commissions.controller';

const router = Router();
router.use(authenticate);

// Rules (commission % per user/category)
router.get('/rules',        getRules);
router.post('/rules',       createRule);
router.patch('/rules/:id',  updateRule);
router.delete('/rules/:id', deleteRule);

// Records (actual commission entries)
router.get('/summary',      getSummary);
router.get('/',             getRecords);
router.post('/',            createRecord);
router.patch('/:id/status', updateRecordStatus);
router.delete('/:id',       deleteRecord);

export default router;
