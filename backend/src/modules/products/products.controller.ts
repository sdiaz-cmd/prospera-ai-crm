import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ProductsService } from './products.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const svc = new ProductsService();
const validate = (req: AuthenticatedRequest, res: Response) => {
  const e = validationResult(req);
  if (!e.isEmpty()) { sendError(res, 'Datos inválidos', 400, e.array() as unknown as Record<string, string[]>); return false; }
  return true;
};

export const validateCreate = [
  body('name').notEmpty().withMessage('El nombre es requerido'),
  body('salePrice').optional().isNumeric(),
  body('costPrice').optional().isNumeric(),
  body('stock').optional().isNumeric(),
];
export const validateUpdate = [body('name').optional().notEmpty(), body('salePrice').optional().isNumeric()];

export async function getProducts(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.findAll(req.user!.companyId, {
      page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20,
      search: req.query.search as string, category: req.query.category as string,
      lowStock: req.query.lowStock === 'true',
    }));
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function getProduct(req: AuthenticatedRequest, res: Response) {
  try { sendSuccess(res, await svc.findById(req.params.id, req.user!.companyId)); }
  catch (e: unknown) { const m = (e as Error).message; sendError(res, m, m.includes('encontrado') ? 404 : 500); }
}

export async function createProduct(req: AuthenticatedRequest, res: Response) {
  if (!validate(req, res)) return;
  try { sendSuccess(res, await svc.create(req.user!.companyId, { ...req.body, createdBy: req.user!.userId }), 'Producto creado', 201); }
  catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response) {
  if (!validate(req, res)) return;
  try { sendSuccess(res, await svc.update(req.params.id, req.user!.companyId, req.body), 'Producto actualizado'); }
  catch (e: unknown) { const m = (e as Error).message; sendError(res, m, m.includes('encontrado') ? 404 : 500); }
}

export async function adjustStock(req: AuthenticatedRequest, res: Response) {
  const { type, quantity, reference, notes } = req.body;
  if (!['in', 'out', 'adjustment'].includes(type)) return sendError(res, 'Tipo de movimiento inválido', 400);
  if (!quantity || isNaN(Number(quantity))) return sendError(res, 'Cantidad inválida', 400);
  try {
    sendSuccess(res, await svc.adjustStock(req.params.id, req.user!.companyId, type, Number(quantity), reference, notes, req.user!.userId), 'Inventario ajustado');
  } catch (e: unknown) { const m = (e as Error).message; sendError(res, m, m.includes('encontrado') ? 404 : 500); }
}

export async function getProductStats(req: AuthenticatedRequest, res: Response) {
  try { sendSuccess(res, await svc.getStats(req.user!.companyId)); }
  catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function deleteProduct(req: AuthenticatedRequest, res: Response) {
  try { await svc.delete(req.params.id, req.user!.companyId); sendSuccess(res, null, 'Producto desactivado'); }
  catch (e: unknown) { const m = (e as Error).message; sendError(res, m, m.includes('encontrado') ? 404 : 500); }
}
