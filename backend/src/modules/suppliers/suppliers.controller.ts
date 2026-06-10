import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { SuppliersService } from './suppliers.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const svc = new SuppliersService();
const validate = (req: AuthenticatedRequest, res: Response) => {
  const e = validationResult(req);
  if (!e.isEmpty()) { sendError(res, 'Datos inválidos', 400, e.array() as unknown as Record<string, string[]>); return false; }
  return true;
};

export const validateCreate = [body('name').notEmpty().withMessage('El nombre es requerido')];
export const validateUpdate = [body('name').optional().notEmpty()];

export async function getSuppliers(req: AuthenticatedRequest, res: Response) {
  try { sendSuccess(res, await svc.findAll(req.user!.companyId, { page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20, search: req.query.search as string })); }
  catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}
export async function getSupplier(req: AuthenticatedRequest, res: Response) {
  try { sendSuccess(res, await svc.findById(req.params.id, req.user!.companyId)); }
  catch (e: unknown) { const m = (e as Error).message; sendError(res, m, m.includes('encontrado') ? 404 : 500); }
}
export async function createSupplier(req: AuthenticatedRequest, res: Response) {
  if (!validate(req, res)) return;
  try { sendSuccess(res, await svc.create(req.user!.companyId, req.body), 'Proveedor creado', 201); }
  catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}
export async function updateSupplier(req: AuthenticatedRequest, res: Response) {
  if (!validate(req, res)) return;
  try { sendSuccess(res, await svc.update(req.params.id, req.user!.companyId, req.body), 'Proveedor actualizado'); }
  catch (e: unknown) { const m = (e as Error).message; sendError(res, m, m.includes('encontrado') ? 404 : 500); }
}
export async function deleteSupplier(req: AuthenticatedRequest, res: Response) {
  try { await svc.delete(req.params.id, req.user!.companyId); sendSuccess(res, null, 'Proveedor eliminado'); }
  catch (e: unknown) { const m = (e as Error).message; sendError(res, m, m.includes('encontrado') ? 404 : 500); }
}
