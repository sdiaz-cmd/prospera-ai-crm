import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import { cuadrillasService } from './cuadrillas.service';
import { sendSuccess, sendError } from '../../utils/response';
import { get as dbGet } from '../../database/db';

function isAdmin(req: AuthenticatedRequest): boolean {
  const uc = dbGet<{ is_owner: number; role_name: string }>(
    `SELECT uc.is_owner, r.name as role_name
     FROM user_companies uc JOIN roles r ON uc.role_id = r.id
     WHERE uc.user_id = ? AND uc.company_id = ?`,
    [req.user!.userId, req.user!.companyId]
  );
  return !!(uc?.is_owner ||
    uc?.role_name === 'Administrador' ||
    uc?.role_name === 'Gerente' ||
    uc?.role_name === 'CEO / Gerencia' ||
    uc?.role_name === 'Jefe de Servicio Técnico');
}

export const listCuadrillas = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, cuadrillasService.findAll(req.user!.companyId));
  } catch (err) { next(err); }
};

export const getCuadrilla = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, cuadrillasService.findById(req.params.id, req.user!.companyId));
  } catch (err) { next(err); }
};

export const createCuadrilla = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    const { name } = req.body as { name?: string };
    if (!name?.trim()) { sendError(res, 'name es requerido', 400); return; }
    const cuadrilla = cuadrillasService.create(req.user!.companyId, req.body);
    sendSuccess(res, cuadrilla, 'Cuadrilla creada', 201);
  } catch (err) { next(err); }
};

export const updateCuadrilla = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    const cuadrilla = cuadrillasService.update(req.params.id, req.user!.companyId, req.body);
    sendSuccess(res, cuadrilla, 'Cuadrilla actualizada');
  } catch (err) { next(err); }
};

export const deleteCuadrilla = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    cuadrillasService.delete(req.params.id, req.user!.companyId);
    sendSuccess(res, null, 'Cuadrilla eliminada');
  } catch (err) { next(err); }
};

export const getMembers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Verify cuadrilla belongs to company
    cuadrillasService.findById(req.params.id, req.user!.companyId);
    sendSuccess(res, cuadrillasService.getMembers(req.params.id));
  } catch (err) { next(err); }
};

export const addMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    const { userId } = req.body as { userId?: string };
    if (!userId) { sendError(res, 'userId es requerido', 400); return; }
    cuadrillasService.findById(req.params.id, req.user!.companyId);
    cuadrillasService.addMember(req.params.id, userId);
    sendSuccess(res, cuadrillasService.getMembers(req.params.id), 'Miembro agregado', 201);
  } catch (err) { next(err); }
};

export const removeMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    cuadrillasService.removeMember(req.params.id, req.params.userId);
    sendSuccess(res, null, 'Miembro removido');
  } catch (err) { next(err); }
};
