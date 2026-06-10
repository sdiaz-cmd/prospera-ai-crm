import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getQuotes, getQuote, createQuote, updateQuote, changeQuoteStatus, deleteQuote, getQuoteStats,
  validateCreate, validateUpdate,
} from './quotes.controller';

const router = Router();
router.use(authenticate);

router.get('/stats', getQuoteStats);
router.get('/', getQuotes);
router.get('/:id', getQuote);
router.post('/', validateCreate, createQuote);
router.put('/:id', validateUpdate, updateQuote);
router.patch('/:id/status', changeQuoteStatus);
router.delete('/:id', deleteQuote);

export default router;
