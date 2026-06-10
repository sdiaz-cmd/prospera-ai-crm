import { Response } from 'express';
import { ActivitiesService } from './activities.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const svc = new ActivitiesService();

export async function getActivities(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.findAll(req.user!.companyId, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 30,
      type: req.query.type as string,
      leadId: req.query.leadId as string,
      contactId: req.query.contactId as string,
      opportunityId: req.query.opportunityId as string,
      ownerId: req.query.ownerId as string,
    }));
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function getActivity(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.findById(req.params.id, req.user!.companyId));
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}

export async function createActivity(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.create(req.user!.companyId, req.user!.userId, req.body), 'Actividad registrada', 201);
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function updateActivity(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.update(req.params.id, req.user!.companyId, req.body), 'Actividad actualizada');
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}

export async function deleteActivity(req: AuthenticatedRequest, res: Response) {
  try {
    await svc.delete(req.params.id, req.user!.companyId);
    sendSuccess(res, null, 'Actividad eliminada');
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}
