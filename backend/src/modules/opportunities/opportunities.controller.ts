import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { OpportunitiesService } from './opportunities.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const svc = new OpportunitiesService();

export const validateCreate = [
  body('name').notEmpty().withMessage('El nombre de la oportunidad es requerido'),
  body('amount').optional().isNumeric(),
  body('status').optional().isIn(['open', 'won', 'lost']),
];

export async function getOpportunities(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.findAll(req.user!.companyId, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
      search: req.query.search as string,
      stageId: req.query.stageId as string,
      assigneeId: req.query.assigneeId as string,
      accountId: req.query.accountId as string,
    }));
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function getKanban(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.getKanban(req.user!.companyId));
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function getOpportunity(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.findById(req.params.id, req.user!.companyId));
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}

export async function createOpportunity(req: AuthenticatedRequest, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { sendError(res, 'Datos inválidos', 400, errors.array() as unknown as Record<string, string[]>); return; }
  try {
    sendSuccess(res, await svc.create(req.user!.companyId, req.body), 'Oportunidad creada', 201);
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function updateOpportunity(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.update(req.params.id, req.user!.companyId, req.body), 'Oportunidad actualizada');
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}

export async function moveStage(req: AuthenticatedRequest, res: Response) {
  try {
    const { stageId } = req.body;
    if (!stageId) { sendError(res, 'stageId requerido', 400); return; }
    sendSuccess(res, await svc.moveStage(req.params.id, req.user!.companyId, stageId), 'Etapa actualizada');
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}

export async function deleteOpportunity(req: AuthenticatedRequest, res: Response) {
  try {
    await svc.delete(req.params.id, req.user!.companyId);
    sendSuccess(res, null, 'Oportunidad eliminada');
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}

export async function getOppStats(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.getStats(req.user!.companyId));
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}
