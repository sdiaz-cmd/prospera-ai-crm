import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { LandingService } from './landing.service';

const svc = new LandingService();

// ─── Protected ────────────────────────────────────────────────────────────────

export function getStats(req: AuthenticatedRequest, res: Response) {
  res.json(svc.getStats(req.user!.companyId));
}

export function getAll(req: AuthenticatedRequest, res: Response) {
  res.json({ data: svc.findAll(req.user!.companyId) });
}

export function getOne(req: AuthenticatedRequest, res: Response) {
  const p = svc.findById(req.params.id, req.user!.companyId);
  if (!p) return res.status(404).json({ error: 'Página no encontrada' });
  res.json(p);
}

export function create(req: AuthenticatedRequest, res: Response) {
  try {
    const p = svc.create(req.user!.companyId, req.user!.userId, req.body);
    res.status(201).json(p);
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : 'Error' }); }
}

export function update(req: AuthenticatedRequest, res: Response) {
  try {
    const p = svc.update(req.params.id, req.user!.companyId, req.body);
    res.json(p);
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : 'Error' }); }
}

export function getSubmissions(req: AuthenticatedRequest, res: Response) {
  try {
    const subs = svc.getSubmissions(req.params.id, req.user!.companyId);
    res.json({ data: subs });
  } catch (e: unknown) { res.status(404).json({ error: e instanceof Error ? e.message : 'Error' }); }
}

export function remove(req: AuthenticatedRequest, res: Response) {
  try {
    svc.delete(req.params.id, req.user!.companyId);
    res.json({ success: true });
  } catch (e: unknown) { res.status(404).json({ error: e instanceof Error ? e.message : 'Error' }); }
}

// ─── Public ───────────────────────────────────────────────────────────────────

export function publicGetPage(req: Request, res: Response) {
  const p = svc.findBySlug(req.params.slug);
  if (!p) return res.status(404).json({ error: 'Página no encontrada' });
  res.json(p);
}

export function publicSubmit(req: Request, res: Response) {
  try {
    const ip = req.ip || req.socket.remoteAddress;
    const result = svc.submit(req.params.slug, { ...req.body, ip });
    res.json(result);
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : 'Error' }); }
}
