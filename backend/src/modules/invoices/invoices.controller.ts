import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { InvoicesService } from './invoices.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const svc = new InvoicesService();
const validate = (req: AuthenticatedRequest, res: Response) => {
  const e = validationResult(req);
  if (!e.isEmpty()) { sendError(res, 'Datos inválidos', 400, e.array() as unknown as Record<string, string[]>); return false; }
  return true;
};

export const validateCreate = [body('items').optional().isArray()];
export const validateUpdate = [body('items').optional().isArray()];

export async function getInvoices(req: AuthenticatedRequest, res: Response) {
  try { sendSuccess(res, await svc.findAll(req.user!.companyId, { page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20, search: req.query.search as string, status: req.query.status as string })); }
  catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}
export async function getInvoice(req: AuthenticatedRequest, res: Response) {
  try { sendSuccess(res, await svc.findById(req.params.id, req.user!.companyId)); }
  catch (e: unknown) { const m = (e as Error).message; sendError(res, m, m.includes('encontrada') ? 404 : 500); }
}
export async function createInvoice(req: AuthenticatedRequest, res: Response) {
  if (!validate(req, res)) return;
  try { sendSuccess(res, await svc.create(req.user!.companyId, req.body), 'Factura creada', 201); }
  catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}
export async function updateInvoice(req: AuthenticatedRequest, res: Response) {
  if (!validate(req, res)) return;
  try { sendSuccess(res, await svc.update(req.params.id, req.user!.companyId, req.body), 'Factura actualizada'); }
  catch (e: unknown) { const m = (e as Error).message; sendError(res, m, m.includes('encontrada') ? 404 : 500); }
}
export async function changeInvoiceStatus(req: AuthenticatedRequest, res: Response) {
  const { status } = req.body;
  if (!['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(status)) return sendError(res, 'Estado inválido', 400);
  try { sendSuccess(res, await svc.changeStatus(req.params.id, req.user!.companyId, status)); }
  catch (e: unknown) { const m = (e as Error).message; sendError(res, m, m.includes('encontrada') ? 404 : 500); }
}
export async function deleteInvoice(req: AuthenticatedRequest, res: Response) {
  try { await svc.delete(req.params.id, req.user!.companyId); sendSuccess(res, null, 'Factura eliminada'); }
  catch (e: unknown) { const m = (e as Error).message; sendError(res, m, m.includes('encontrada') ? 404 : 500); }
}
export async function getInvoiceStats(req: AuthenticatedRequest, res: Response) {
  try { sendSuccess(res, await svc.getStats(req.user!.companyId)); }
  catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}
