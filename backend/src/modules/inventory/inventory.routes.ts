import { Router, Request, Response, NextFunction } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const multer = require('multer');
import { authenticate } from '../../middleware/auth.middleware';
import { getStock, getSummary, getMovements, addMovement, analyzeExcel, importExcel } from './inventory.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

router.get('/stock', getStock as (req: Request, res: Response, next: NextFunction) => void);
router.get('/summary', getSummary as (req: Request, res: Response, next: NextFunction) => void);
router.get('/movements', getMovements as (req: Request, res: Response, next: NextFunction) => void);
router.post('/movements', addMovement as (req: Request, res: Response, next: NextFunction) => void);
router.post('/analyze-excel', upload.single('file'), analyzeExcel as (req: Request, res: Response, next: NextFunction) => void);
router.post('/import', importExcel as (req: Request, res: Response, next: NextFunction) => void);

export default router;
