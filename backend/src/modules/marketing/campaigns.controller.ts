import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { CampaignsService } from './campaigns.service';

const svc = new CampaignsService();

export function getStats(req: AuthenticatedRequest, res: Response) {
  res.json(svc.getStats(req.user!.companyId));
}

export function getAll(req: AuthenticatedRequest, res: Response) {
  res.json({ data: svc.findAll(req.user!.companyId) });
}

export function getOne(req: AuthenticatedRequest, res: Response) {
  const c = svc.findById(req.params.id, req.user!.companyId);
  if (!c) return res.status(404).json({ error: 'Campaña no encontrada' });
  res.json(c);
}

export function create(req: AuthenticatedRequest, res: Response) {
  try {
    const c = svc.create(req.user!.companyId, req.user!.userId, req.body);
    res.status(201).json(c);
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : 'Error' }); }
}

export function update(req: AuthenticatedRequest, res: Response) {
  try {
    const c = svc.update(req.params.id, req.user!.companyId, req.body);
    res.json(c);
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : 'Error' }); }
}

export function send(req: AuthenticatedRequest, res: Response) {
  try {
    const c = svc.send(req.params.id, req.user!.companyId);
    res.json(c);
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : 'Error' }); }
}

export function duplicate(req: AuthenticatedRequest, res: Response) {
  try {
    const c = svc.duplicate(req.params.id, req.user!.companyId, req.user!.userId);
    res.status(201).json(c);
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : 'Error' }); }
}

export function remove(req: AuthenticatedRequest, res: Response) {
  try {
    svc.delete(req.params.id, req.user!.companyId);
    res.json({ success: true });
  } catch (e: unknown) { res.status(404).json({ error: e instanceof Error ? e.message : 'Error' }); }
}
