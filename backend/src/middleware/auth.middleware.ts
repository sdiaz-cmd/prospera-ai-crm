import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { get } from '../database/db';

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'Token de autenticación requerido', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      companyId: payload.companyId,
      email: payload.email,
    };

    // Verificar trial/plan de la empresa
    const company = get<{ plan: string; plan_status: string; trial_ends_at: string | null }>(
      'SELECT plan, plan_status, trial_ends_at FROM companies WHERE id = ?',
      [payload.companyId]
    );

    if (company && company.plan === 'trial' && company.trial_ends_at) {
      const trialEnd = new Date(company.trial_ends_at);
      if (new Date() > trialEnd) {
        res.status(402).json({ error: 'trial_expired', message: 'Tu período de prueba ha terminado.' });
        return;
      }
    }

    next();
  } catch {
    sendError(res, 'Token inválido o expirado', 401);
  }
};
