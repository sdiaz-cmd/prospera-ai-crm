import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import { commissionsService } from './commissions.service';
import { sendSuccess, sendError } from '../../utils/response';
import { get as dbGet } from '../../database/db';

function isAdmin(req: AuthenticatedRequest): boolean {
  const uc = dbGet<{ is_owner: number; role_name: string }>(
    `SELECT uc.is_owner, r.name as role_name
     FROM user_companies uc JOIN roles r ON uc.role_id = r.id
     WHERE uc.user_id = ? AND uc.company_id = ?`,
    [req.user!.userId, req.user!.companyId]
  );
  return !!(uc?.is_owner || uc?.role_name === 'Administrador' || uc?.role_name === 'Gerente' || uc?.role_name === 'Finanzas');
}

// ── Rules ─────────────────────────────────────────────────────────────────────

export const getRules = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = isAdmin(req);
    // Admin gets all; user gets their own
    const userId = admin && req.query.userId ? String(req.query.userId) : (!admin ? req.user!.userId : undefined);
    sendSuccess(res, commissionsService.getRules(req.user!.companyId, userId));
  } catch (err) { next(err); }
};

export const createRule = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    const { userId, categoryName, percentage } = req.body as {
      userId?: string; categoryName?: string; percentage?: number;
    };
    if (!userId || !categoryName?.trim() || percentage === undefined) {
      sendError(res, 'userId, categoryName y percentage son requeridos', 400); return;
    }
    const rule = commissionsService.createRule({
      companyId: req.user!.companyId, userId,
      categoryName: categoryName.trim(), percentage: Number(percentage),
    });
    sendSuccess(res, rule, 'Regla creada', 201);
  } catch (err) { next(err); }
};

export const updateRule = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    const { categoryName, percentage } = req.body as { categoryName?: string; percentage?: number };
    const rule = commissionsService.updateRule(req.params.id, req.user!.companyId, { categoryName, percentage });
    if (!rule) { sendError(res, 'Regla no encontrada', 404); return; }
    sendSuccess(res, rule, 'Regla actualizada');
  } catch (err) { next(err); }
};

export const deleteRule = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    commissionsService.deleteRule(req.params.id, req.user!.companyId);
    sendSuccess(res, null, 'Regla eliminada');
  } catch (err) { next(err); }
};

// ── Records ───────────────────────────────────────────────────────────────────

export const getRecords = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = isAdmin(req);
    const userId = admin && req.query.userId ? String(req.query.userId) : (!admin ? req.user!.userId : undefined);
    const status = req.query.status as string | undefined;
    sendSuccess(res, commissionsService.getRecords(req.user!.companyId, userId, { status }));
  } catch (err) { next(err); }
};

export const createRecord = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    const { userId, ruleId, sourceDescription, baseAmount, percentage, notes } = req.body as {
      userId?: string; ruleId?: string; sourceDescription?: string;
      baseAmount?: number; percentage?: number; notes?: string;
    };
    if (!userId || !sourceDescription?.trim() || baseAmount === undefined || percentage === undefined) {
      sendError(res, 'Faltan campos requeridos', 400); return;
    }
    const record = commissionsService.createRecord({
      companyId: req.user!.companyId, userId, ruleId,
      sourceType: 'manual', sourceDescription: sourceDescription.trim(),
      baseAmount: Number(baseAmount), percentage: Number(percentage), notes,
    });
    sendSuccess(res, record, 'Comisión registrada', 201);
  } catch (err) { next(err); }
};

export const updateRecordStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    const { status } = req.body as { status?: string };
    if (status !== 'pendiente' && status !== 'pagado') { sendError(res, 'Estado inválido', 400); return; }
    const record = commissionsService.updateRecordStatus(req.params.id, req.user!.companyId, status);
    if (!record) { sendError(res, 'Registro no encontrado', 404); return; }
    sendSuccess(res, record, 'Estado actualizado');
  } catch (err) { next(err); }
};

export const deleteRecord = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    commissionsService.deleteRecord(req.params.id, req.user!.companyId);
    sendSuccess(res, null, 'Registro eliminado');
  } catch (err) { next(err); }
};

export const getSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = isAdmin(req);
    const userId = admin && req.query.userId ? String(req.query.userId) : (!admin ? req.user!.userId : undefined);
    sendSuccess(res, commissionsService.getSummary(req.user!.companyId, userId));
  } catch (err) { next(err); }
};
