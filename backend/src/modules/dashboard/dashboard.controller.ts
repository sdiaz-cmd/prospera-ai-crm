import { Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const dashboardService = new DashboardService();

export const getOverview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    const startDate = (req.query.startDate as string) || defaultStart;
    const endDate = (req.query.endDate as string) || defaultEnd;

    const data = await dashboardService.getOverview(req.user!.companyId, startDate, endDate);
    sendSuccess(res, data);
  } catch (error) { next(error); }
};
