import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AccountsService } from './accounts.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const svc = new AccountsService();

export const validateCreate = [
  body('name').notEmpty().withMessage('El nombre de la cuenta es requerido'),
  body('email').optional().isEmail(),
];

export async function getAccounts(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.findAll(req.user!.companyId, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      search: req.query.search as string,
      industry: req.query.industry as string,
      assigneeId: req.query.assigneeId as string,
    }));
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function getAccount(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.findById(req.params.id, req.user!.companyId));
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}

export async function createAccount(req: AuthenticatedRequest, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { sendError(res, 'Datos inválidos', 400, errors.array() as unknown as Record<string, string[]>); return; }
  try {
    sendSuccess(res, await svc.create(req.user!.companyId, req.body), 'Cuenta creada', 201);
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function updateAccount(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.update(req.params.id, req.user!.companyId, req.body), 'Cuenta actualizada');
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}

export async function deleteAccount(req: AuthenticatedRequest, res: Response) {
  try {
    await svc.delete(req.params.id, req.user!.companyId);
    sendSuccess(res, null, 'Cuenta eliminada');
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}
