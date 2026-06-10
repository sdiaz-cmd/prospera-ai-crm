import { Response } from 'express';
import { TasksService } from './tasks.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const svc = new TasksService();

export async function getTasks(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.findAll(req.user!.companyId, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 30,
      status: req.query.status as string,
      priority: req.query.priority as string,
      assigneeId: req.query.assigneeId as string,
      leadId: req.query.leadId as string,
      contactId: req.query.contactId as string,
      opportunityId: req.query.opportunityId as string,
    }));
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function getTask(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.findById(req.params.id, req.user!.companyId));
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}

export async function createTask(req: AuthenticatedRequest, res: Response) {
  if (!req.body.title) { sendError(res, 'El título es requerido', 400); return; }
  try {
    sendSuccess(res, await svc.create(req.user!.companyId, req.user!.userId, req.body), 'Tarea creada', 201);
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function updateTask(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.update(req.params.id, req.user!.companyId, req.body), 'Tarea actualizada');
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}

export async function deleteTask(req: AuthenticatedRequest, res: Response) {
  try {
    await svc.delete(req.params.id, req.user!.companyId);
    sendSuccess(res, null, 'Tarea eliminada');
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrada') ? 404 : 500);
  }
}
