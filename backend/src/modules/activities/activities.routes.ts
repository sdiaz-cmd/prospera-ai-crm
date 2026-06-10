import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getActivities, getActivity, createActivity, updateActivity, deleteActivity } from './activities.controller';

const router = Router();
router.use(authenticate);

router.get('/', getActivities);
router.get('/:id', getActivity);
router.post('/', createActivity);
router.put('/:id', updateActivity);
router.delete('/:id', deleteActivity);

export default router;
