import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { WhatsAppWebhookService } from './whatsapp.service';
import { get } from '../../database/db';

const svc = new WhatsAppWebhookService();

// ─── Public webhook (called by WhatsApp agent) ────────────────────────────────

export function receiveWebhook(req: Request, res: Response) {
  // Authenticate by API key in header or query param
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedKey = process.env.WEBHOOK_SECRET;

  if (!expectedKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'API key inválida' });
  }

  // companyId can come from header, query, or body
  const companyId =
    (req.headers['x-company-id'] as string) ||
    (req.query.companyId as string) ||
    req.body.companyId;

  if (!companyId) {
    return res.status(400).json({ error: 'companyId requerido' });
  }

  const { phone, name, email, company, message, direction, botResponse, extraNotes } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'phone requerido' });
  }

  try {
    const result = svc.process(companyId, {
      phone, name, email, company, message, direction, botResponse, extraNotes,
    });
    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error procesando webhook' });
  }
}

// ─── Protected: for the CRM settings UI ──────────────────────────────────────

export function getWebhookInfo(req: AuthenticatedRequest, res: Response) {
  const secret = process.env.WEBHOOK_SECRET || '';
  const baseUrl = process.env.PUBLIC_URL || `http://localhost:4000`;
  res.json({
    url: `${baseUrl}/api/webhook/whatsapp`,
    apiKey: secret,
    companyId: req.user!.companyId,
    instructions: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': secret,
        'X-Company-Id': req.user!.companyId,
      },
      body: {
        phone: '+52 55 1234 5678',
        name: 'Nombre del lead',
        email: 'email@opcional.com',
        company: 'Empresa (opcional)',
        message: 'Mensaje que escribio el lead',
        botResponse: 'Respuesta que dio el bot (opcional)',
        direction: 'inbound',
      },
    },
  });
}

export function getEvents(req: AuthenticatedRequest, res: Response) {
  const events = svc.getRecentEvents(req.user!.companyId);
  res.json({ data: events });
}

export function getWebhookStats(req: AuthenticatedRequest, res: Response) {
  res.json(svc.getStats(req.user!.companyId));
}
