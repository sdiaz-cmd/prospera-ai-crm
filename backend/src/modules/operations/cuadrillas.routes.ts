import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  listCuadrillas, getCuadrilla, createCuadrilla, updateCuadrilla, deleteCuadrilla,
  getMembers, addMember, removeMember,
} from './cuadrillas.controller';

const router = Router();
router.use(authenticate);

router.get('/',    listCuadrillas);
router.post('/',   createCuadrilla);
router.get('/:id', getCuadrilla);
router.patch('/:id', updateCuadrilla);
router.delete('/:id', deleteCuadrilla);

router.get('/:id/members',           getMembers);
router.post('/:id/members',          addMember);
router.delete('/:id/members/:userId', removeMember);

export default router;
