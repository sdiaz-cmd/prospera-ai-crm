import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.middleware';
import { getStock, getSummary, getMovements, addMovement, analyzeExcel, importExcel } from './inventory.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

router.get('/stock', getStock);
router.get('/summary', getSummary);
router.get('/movements', getMovements);
router.post('/movements', addMovement);
router.post('/analyze-excel', upload.single('file'), analyzeExcel);
router.post('/import', importExcel);

export default router;
