import { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { QuotesService } from './quotes.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const svc = new QuotesService();

const validate = (req: AuthenticatedRequest, res: Response): boolean => {
  const e = validationResult(req);
  if (!e.isEmpty()) { sendError(res, 'Datos inválidos', 400, e.array() as unknown as Record<string, string[]>); return false; }
  return true;
};

export const validateCreate = [
  body('title').notEmpty().withMessage('El título es requerido'),
  body('status').optional().isIn(['draft', 'sent', 'accepted', 'rejected', 'expired']),
  body('taxRate').optional().isNumeric(),
  body('discountValue').optional().isNumeric(),
  body('items').optional().isArray(),
];

export const validateUpdate = [
  param('id').isUUID(),
  body('title').optional().notEmpty(),
  body('status').optional().isIn(['draft', 'sent', 'accepted', 'rejected', 'expired']),
  body('items').optional().isArray(),
];

export async function getQuotes(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await svc.findAll(req.user!.companyId, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      search: req.query.search as string,
      status: req.query.status as string,
    });
    sendSuccess(res, result);
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function getQuote(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.findById(req.params.id, req.user!.companyId));
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}

export async function createQuote(req: AuthenticatedRequest, res: Response) {
  if (!validate(req, res)) return;
  try {
    sendSuccess(res, await svc.create(req.user!.companyId, req.body), 'Cotización creada', 201);
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function updateQuote(req: AuthenticatedRequest, res: Response) {
  if (!validate(req, res)) return;
  try {
    sendSuccess(res, await svc.update(req.params.id, req.user!.companyId, req.body), 'Cotización actualizada');
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}

export async function changeQuoteStatus(req: AuthenticatedRequest, res: Response) {
  const { status } = req.body;
  if (!['draft', 'sent', 'accepted', 'rejected', 'expired'].includes(status)) {
    return sendError(res, 'Estado inválido', 400);
  }
  try {
    sendSuccess(res, await svc.changeStatus(req.params.id, req.user!.companyId, status), `Cotización ${status}`);
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}

export async function deleteQuote(req: AuthenticatedRequest, res: Response) {
  try {
    await svc.delete(req.params.id, req.user!.companyId);
    sendSuccess(res, null, 'Cotización eliminada');
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}

export async function getQuoteStats(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.getStats(req.user!.companyId));
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}
