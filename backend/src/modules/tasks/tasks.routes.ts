import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getTasks, getTask, createTask, updateTask, deleteTask } from './tasks.controller';

const router = Router();
router.use(authenticate);

router.get('/', getTasks);
router.get('/:id', getTask);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
