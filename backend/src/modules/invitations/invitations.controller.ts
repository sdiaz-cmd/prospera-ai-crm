import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { InvitationsService } from './invitations.service';

const svc = new InvitationsService();

export async function invite(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await svc.invite(req.user!.companyId, req.user!.userId, req.body);
    res.status(201).json(result);
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Error' });
  }
}

export function getInvitation(req: AuthenticatedRequest, res: Response) {
  try {
    const result = svc.getByToken(req.params.token);
    res.json(result);
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Invitación no válida' });
  }
}

export async function acceptInvitation(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await svc.accept(req.params.token, req.body);
    res.json(result);
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Error' });
  }
}

export function listPending(req: AuthenticatedRequest, res: Response) {
  res.json({ data: svc.listPending(req.user!.companyId) });
}

export function revokeInvitation(req: AuthenticatedRequest, res: Response) {
  svc.revoke(req.params.id, req.user!.companyId);
  res.json({ success: true });
}
