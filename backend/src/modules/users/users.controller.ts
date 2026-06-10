import { Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const usersService = new UsersService();

export const getUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, search } = req.query;
    const result = await usersService.findAll(req.user!.companyId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search: search as string,
    });
    sendSuccess(res, result.users, 'Usuarios obtenidos', 200, result.meta);
  } catch (error) { next(error); }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await usersService.findById(req.params.id, req.user!.companyId);
    sendSuccess(res, user);
  } catch (error) {
    if (error instanceof Error) sendError(res, error.message, 404);
    else next(error);
  }
};

export const inviteUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await usersService.invite(req.user!.companyId, req.body);
    sendSuccess(res, user, 'Usuario creado exitosamente', 201);
  } catch (error) {
    if (error instanceof Error) sendError(res, error.message, 400);
    else next(error);
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await usersService.update(req.params.id, req.user!.companyId, req.body);
    sendSuccess(res, user, 'Usuario actualizado');
  } catch (error) {
    if (error instanceof Error) sendError(res, error.message, 400);
    else next(error);
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await usersService.remove(req.params.id, req.user!.companyId, req.user!.userId);
    sendSuccess(res, null, 'Usuario eliminado de la empresa');
  } catch (error) {
    if (error instanceof Error) sendError(res, error.message, 400);
    else next(error);
  }
};
