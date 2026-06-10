import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getStats, getAll, getOne, create, update, getSubmissions, remove,
  publicGetPage, publicSubmit,
} from './landing.controller';

const router = Router();

// Public (no auth)
router.get('/public/:slug', publicGetPage);
router.post('/public/:slug/submit', publicSubmit);

// Protected
router.use(authenticate);
router.get('/stats', getStats);
router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.get('/:id/submissions', getSubmissions);
router.delete('/:id', remove);

export default router;
