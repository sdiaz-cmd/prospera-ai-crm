import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { ReportsService } from './reports.service';

const svc = new ReportsService();

export function getSales(req: AuthenticatedRequest, res: Response) {
  res.json(svc.getSalesReport(req.user!.companyId));
}

export function getLeads(req: AuthenticatedRequest, res: Response) {
  res.json(svc.getLeadsReport(req.user!.companyId));
}

export function getPipeline(req: AuthenticatedRequest, res: Response) {
  res.json(svc.getPipelineReport(req.user!.companyId));
}

export function getTeam(req: AuthenticatedRequest, res: Response) {
  res.json(svc.getTeamReport(req.user!.companyId));
}
