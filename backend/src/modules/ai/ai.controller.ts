import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { AIService } from './ai.service';

const svc = new AIService();

export async function getStatus(req: AuthenticatedRequest, res: Response) {
  res.json(svc.getStatus());
}

export async function generateEmail(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await svc.generateEmail(req.body);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error generando correo' });
  }
}

export async function scoreLead(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await svc.scoreLead(req.params.leadId, req.user!.companyId);
    res.json(result);
  } catch (err: unknown) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Error' });
  }
}

export async function scoreAllLeads(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await svc.scoreAllLeads(req.user!.companyId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
}

export async function chat(req: AuthenticatedRequest, res: Response) {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question requerido' });
    const result = await svc.chat(question, req.user!.companyId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
}
