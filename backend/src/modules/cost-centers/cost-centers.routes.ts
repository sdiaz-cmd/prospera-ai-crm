import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getAll, getById, create, update, remove, getSummary,
  getEntries, createEntry, deleteEntry,
} from './cost-centers.controller';

const router = Router();
router.use(authenticate);

router.get('/summary',                   getSummary);
router.get('/',                          getAll);
router.post('/',                         create);
router.get('/:id',                       getById);
router.patch('/:id',                     update);
router.delete('/:id',                    remove);
router.get('/:id/entries',               getEntries);
router.post('/:id/entries',              createEntry);
router.delete('/:id/entries/:entryId',   deleteEntry);

export default router;
