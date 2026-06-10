import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getStats, getAll, getOne, create, update, send, duplicate, remove } from './campaigns.controller';

const router = Router();
router.use(authenticate);

router.get('/stats', getStats);
router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.post('/:id/send', send);
router.post('/:id/duplicate', duplicate);
router.delete('/:id', remove);

export default router;
