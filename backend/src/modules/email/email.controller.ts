import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import { emailService } from './email.service';
import { sendSuccess, sendError } from '../../utils/response';
import { get as dbGet } from '../../database/db';

function userName(req: AuthenticatedRequest): string {
  const u = dbGet<{ first_name: string | null; last_name: string | null }>(
    'SELECT first_name, last_name FROM users WHERE id = ?', [req.user!.userId]
  );
  return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || req.user!.email : req.user!.email;
}

export const sendContactEmail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { toEmail, subject, bodyHtml } = req.body as { toEmail?: string; subject?: string; bodyHtml?: string };
    if (!toEmail?.trim() || !subject?.trim() || !bodyHtml?.trim()) {
      sendError(res, 'toEmail, subject y bodyHtml son requeridos', 400); return;
    }
    const email = await emailService.send({
      companyId: req.user!.companyId,
      contactId: req.params.contactId,
      toEmail, subject, bodyHtml,
      sentBy: req.user!.userId,
      sentByName: userName(req),
    });
    sendSuccess(res, email, 'Email enviado', 201);
  } catch (err) { next(err); }
};

export const sendLeadEmail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { toEmail, subject, bodyHtml } = req.body as { toEmail?: string; subject?: string; bodyHtml?: string };
    if (!toEmail?.trim() || !subject?.trim() || !bodyHtml?.trim()) {
      sendError(res, 'toEmail, subject y bodyHtml son requeridos', 400); return;
    }
    const email = await emailService.send({
      companyId: req.user!.companyId,
      leadId: req.params.leadId,
      toEmail, subject, bodyHtml,
      sentBy: req.user!.userId,
      sentByName: userName(req),
    });
    sendSuccess(res, email, 'Email enviado', 201);
  } catch (err) { next(err); }
};

export const listContactEmails = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const emails = emailService.listByContact(req.params.contactId);
    sendSuccess(res, emails);
  } catch (err) { next(err); }
};

export const listLeadEmails = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const emails = emailService.listByLead(req.params.leadId);
    sendSuccess(res, emails);
  } catch (err) { next(err); }
};

// ── Tracking pixel (no auth required) ─────────────────────────────────────────
export const trackOpen = (req: Request, res: Response): void => {
  const { id } = req.params;
  emailService.markOpened(id);
  // Return 1x1 transparent GIF
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  res.set({ 'Content-Type': 'image/gif', 'Content-Length': String(pixel.length), 'Cache-Control': 'no-cache, no-store' });
  res.end(pixel);
};
