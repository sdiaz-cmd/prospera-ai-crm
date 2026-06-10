import { Response, NextFunction } from 'express';
import { CompaniesService } from './companies.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const companiesService = new CompaniesService();

export const getCompanySettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const company = await companiesService.getSettings(req.user!.companyId);
    sendSuccess(res, company);
  } catch (error) { next(error); }
};

export const updateCompanySettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const company = await companiesService.updateSettings(req.user!.companyId, req.body);
    sendSuccess(res, company, 'Configuración actualizada');
  } catch (error) {
    if (error instanceof Error) sendError(res, error.message, 400);
    else next(error);
  }
};

export const getCompanyStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await companiesService.getStats(req.user!.companyId);
    sendSuccess(res, stats);
  } catch (error) { next(error); }
};
