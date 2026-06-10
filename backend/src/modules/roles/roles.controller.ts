import { Response, NextFunction } from 'express';
import { RolesService } from './roles.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const rolesService = new RolesService();

export const getRoles = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roles = await rolesService.findAll(req.user!.companyId);
    sendSuccess(res, roles);
  } catch (error) { next(error); }
};

export const getRoleById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = await rolesService.findById(req.params.id, req.user!.companyId);
    sendSuccess(res, role);
  } catch (error) {
    if (error instanceof Error) sendError(res, error.message, 404);
    else next(error);
  }
};

export const createRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = await rolesService.create(req.user!.companyId, req.body);
    sendSuccess(res, role, 'Rol creado exitosamente', 201);
  } catch (error) {
    if (error instanceof Error) sendError(res, error.message, 400);
    else next(error);
  }
};

export const updateRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = await rolesService.update(req.params.id, req.user!.companyId, req.body);
    sendSuccess(res, role, 'Rol actualizado');
  } catch (error) {
    if (error instanceof Error) sendError(res, error.message, 400);
    else next(error);
  }
};

export const deleteRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await rolesService.delete(req.params.id, req.user!.companyId);
    sendSuccess(res, null, 'Rol eliminado');
  } catch (error) {
    if (error instanceof Error) sendError(res, error.message, 400);
    else next(error);
  }
};

export const getPermissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const permissions = await rolesService.getAllPermissions();
    sendSuccess(res, permissions);
  } catch (error) { next(error); }
};
