import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getRoles, getRoleById, createRole, updateRole, deleteRole, getPermissions } from './roles.controller';

const router = Router();

router.use(authenticate);

router.get('/permissions', getPermissions);
router.get('/', getRoles);
router.get('/:id', getRoleById);
router.post('/', createRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;
