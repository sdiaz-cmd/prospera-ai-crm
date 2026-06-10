import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getContacts, getContact, createContact, updateContact, deleteContact, validateCreate } from './contacts.controller';

const router = Router();
router.use(authenticate);

router.get('/', getContacts);
router.get('/:id', getContact);
router.post('/', validateCreate, createContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);

export default router;
