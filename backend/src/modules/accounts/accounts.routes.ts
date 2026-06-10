import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getAccounts, getAccount, createAccount, updateAccount, deleteAccount, validateCreate } from './accounts.controller';

const router = Router();
router.use(authenticate);

router.get('/', getAccounts);
router.get('/:id', getAccount);
router.post('/', validateCreate, createAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);

export default router;
