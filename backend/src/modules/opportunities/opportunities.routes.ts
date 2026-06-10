import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getOpportunities, getKanban, getOpportunity, createOpportunity,
  updateOpportunity, moveStage, deleteOpportunity, getOppStats, validateCreate,
} from './opportunities.controller';

const router = Router();
router.use(authenticate);

router.get('/stats', getOppStats);
router.get('/kanban', getKanban);
router.get('/', getOpportunities);
router.get('/:id', getOpportunity);
router.post('/', validateCreate, createOpportunity);
router.put('/:id', updateOpportunity);
router.patch('/:id/stage', moveStage);
router.delete('/:id', deleteOpportunity);

export default router;
