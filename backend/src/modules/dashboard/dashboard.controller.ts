import { Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const dashboardService = new DashboardService();

export const getOverview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await dashboardService.getOverview(req.user!.companyId);
    sendSuccess(res, data);
  } catch (error) { next(error); }
};
