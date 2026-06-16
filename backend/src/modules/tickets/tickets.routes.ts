import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getTickets, getTicket, createTicket, updateTicket, deleteTicket, getStats } from './tickets.controller';

const router = Router();

router.use(authenticate);

router.get('/',        getTickets);
router.get('/stats',   getStats);
router.get('/:id',     getTicket);
router.post('/',       createTicket);
router.patch('/:id',   updateTicket);
router.delete('/:id',  deleteTicket);

export default router;
