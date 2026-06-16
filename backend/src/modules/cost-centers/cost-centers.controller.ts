import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import { costCentersService } from './cost-centers.service';
import { sendSuccess, sendError } from '../../utils/response';
import { get as dbGet } from '../../database/db';

function isAdmin(req: AuthenticatedRequest): boolean {
  const uc = dbGet<{ is_owner: number; role_name: string }>(
    `SELECT uc.is_owner, r.name as role_name
     FROM user_companies uc JOIN roles r ON uc.role_id = r.id
     WHERE uc.user_id = ? AND uc.company_id = ?`,
    [req.user!.userId, req.user!.companyId]
  );
  return !!(uc?.is_owner || ['Administrador', 'Gerente', 'Finanzas'].includes(uc?.role_name || ''));
}

// ── Cost Centers ──────────────────────────────────────────────────────────────

export const getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, search } = req.query as Record<string, string>;
    sendSuccess(res, costCentersService.findAll(req.user!.companyId, { status, search }));
  } catch (err) { next(err); }
};

export const getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, costCentersService.findById(req.params.id, req.user!.companyId));
  } catch (err) { next(err); }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    if (!req.body.name?.trim()) { sendError(res, 'El nombre es requerido', 400); return; }
    sendSuccess(res, costCentersService.create(req.user!.companyId, req.body), 'Centro creado', 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    sendSuccess(res, costCentersService.update(req.params.id, req.user!.companyId, req.body));
  } catch (err) { next(err); }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    costCentersService.delete(req.params.id, req.user!.companyId);
    sendSuccess(res, null, 'Centro eliminado');
  } catch (err) { next(err); }
};

export const getSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, costCentersService.getSummary(req.user!.companyId));
  } catch (err) { next(err); }
};

// ── Entries ───────────────────────────────────────────────────────────────────

export const getEntries = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type } = req.query as { type?: string };
    sendSuccess(res, costCentersService.getEntries(req.params.id, req.user!.companyId, type));
  } catch (err) { next(err); }
};

export const createEntry = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    const { type, category, description, amount, date, notes } = req.body as {
      type?: string; category?: string; description?: string;
      amount?: number; date?: string; notes?: string;
    };
    if (!type || !description?.trim() || amount === undefined || !date) {
      sendError(res, 'type, description, amount y date son requeridos', 400); return;
    }
    if (type !== 'ingreso' && type !== 'gasto') {
      sendError(res, 'type debe ser ingreso o gasto', 400); return;
    }
    sendSuccess(res, costCentersService.createEntry({
      costCenterId: req.params.id, companyId: req.user!.companyId,
      type, category: category?.trim() || 'General',
      description: description.trim(), amount: Number(amount), date, notes,
    }), 'Movimiento registrado', 201);
  } catch (err) { next(err); }
};

export const deleteEntry = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    costCentersService.deleteEntry(req.params.entryId, req.user!.companyId);
    sendSuccess(res, null, 'Movimiento eliminado');
  } catch (err) { next(err); }
};
