import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getUsers, getUserById, inviteUser, updateUser, deleteUser, transferOwnership } from './users.controller';

const router = Router();

router.use(authenticate);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', inviteUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/transfer-owner', transferOwnership);

export default router;
