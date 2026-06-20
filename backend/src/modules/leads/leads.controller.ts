import { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { LeadsService } from './leads.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const svc = new LeadsService();

const validate = (req: AuthenticatedRequest, res: Response): boolean => {
  const e = validationResult(req);
  if (!e.isEmpty()) { sendError(res, 'Datos inválidos', 400, e.array() as unknown as Record<string, string[]>); return false; }
  return true;
};

export const validateCreate = [
  body('firstName').notEmpty().withMessage('El nombre es requerido'),
  body('email').optional().isEmail(),
  body('score').optional().isInt({ min: 0, max: 100 }),
  body('status').optional().isIn(['new', 'contacted', 'qualified', 'unqualified', 'converted']),
];

export const validateUpdate = [
  param('id').isUUID(),
  body('email').optional().isEmail(),
  body('score').optional().isInt({ min: 0, max: 100 }),
  body('status').optional().isIn(['new', 'contacted', 'qualified', 'unqualified', 'converted']),
];

export async function getLeads(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await svc.findAll(req.user!.companyId, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      search: req.query.search as string,
      status: req.query.status as string,
      source: req.query.source as string,
      assigneeId: req.query.assigneeId as string,
    });
    sendSuccess(res, result);
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function getLead(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.findById(req.params.id, req.user!.companyId));
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrado') ? 404 : 500);
  }
}

export async function createLead(req: AuthenticatedRequest, res: Response) {
  if (!validate(req, res)) return;
  try {
    sendSuccess(res, await svc.create(req.user!.companyId, req.body), 'Lead creado', 201);
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function updateLead(req: AuthenticatedRequest, res: Response) {
  if (!validate(req, res)) return;
  try {
    sendSuccess(res, await svc.update(req.params.id, req.user!.companyId, req.body), 'Lead actualizado');
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrado') ? 404 : 500);
  }
}

export async function convertLead(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.convert(req.params.id, req.user!.companyId), 'Lead convertido');
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrado') ? 404 : 500);
  }
}

export async function deleteLead(req: AuthenticatedRequest, res: Response) {
  try {
    await svc.delete(req.params.id, req.user!.companyId);
    sendSuccess(res, null, 'Lead eliminado');
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrado') ? 404 : 500);
  }
}

export async function getLeadStats(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.getStats(req.user!.companyId));
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function importLeads(req: AuthenticatedRequest, res: Response) {
  try {
    const { csvContent, assigneeId } = req.body;
    if (!csvContent) { sendError(res, 'csvContent requerido', 400); return; }
    const result = await svc.importBulk(req.user!.companyId, csvContent, assigneeId);
    sendSuccess(res, result, `${result.imported} leads importados`, 200);
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function exportLeads(req: AuthenticatedRequest, res: Response) {
  try {
    const csv = svc.exportCsv(req.user!.companyId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send('﻿' + csv); // BOM for Excel
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}
