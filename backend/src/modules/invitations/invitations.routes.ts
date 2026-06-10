import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { invite, getInvitation, acceptInvitation, listPending, revokeInvitation } from './invitations.controller';

const router = Router();

// Rutas públicas (sin autenticación)
router.get('/:token', getInvitation);
router.post('/:token/accept', acceptInvitation);

// Rutas protegidas
router.use(authenticate);
router.post('/', invite);
router.get('/', listPending);
router.delete('/:id', revokeInvitation);

export default router;
