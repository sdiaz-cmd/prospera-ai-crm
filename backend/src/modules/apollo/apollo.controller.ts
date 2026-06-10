import { Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import {
  canUserUseApollo,
  searchApolloContacts,
  importProspects,
  getApolloSettings,
  updateApolloSettings,
  ApolloSearchParams,
} from './apollo.service';
import { get } from '../../database/db';

// ─── GET /api/apollo/settings ─────────────────────────────────────────────────

export async function getSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const settings = getApolloSettings(req.user!.companyId);
    // Mask API key: show only last 6 chars
    const maskedKey = settings.apiKey
      ? '••••••••' + settings.apiKey.slice(-6)
      : null;
    sendSuccess(res, { ...settings, apiKeyMasked: maskedKey });
  } catch (e: unknown) {
    sendError(res, (e as Error).message, 500);
  }
}

// ─── PUT /api/apollo/settings ─────────────────────────────────────────────────

export async function saveSettings(req: AuthenticatedRequest, res: Response) {
  try {
    // Only owner or admin/gerencia roles can update settings
    const uc = get<{ is_owner: number }>(
      'SELECT is_owner FROM user_companies WHERE user_id = ? AND company_id = ?',
      [req.user!.userId, req.user!.companyId],
    );
    if (!uc?.is_owner && !canUserUseApollo(req.user!.companyId, req.user!.userId)) {
      return sendError(res, 'Sin permiso para modificar la configuración de Apollo', 403);
    }

    const { apiKey, searchRoles } = req.body as { apiKey?: string; searchRoles?: string[] };
    const updated = updateApolloSettings(req.user!.companyId, { apiKey, searchRoles });
    sendSuccess(res, updated, 'Configuración de Apollo actualizada');
  } catch (e: unknown) {
    sendError(res, (e as Error).message, 500);
  }
}

// ─── POST /api/apollo/search ──────────────────────────────────────────────────

export async function searchProspects(req: AuthenticatedRequest, res: Response) {
  try {
    // 1. Permission check
    if (!canUserUseApollo(req.user!.companyId, req.user!.userId)) {
      return sendError(res, 'Tu rol no tiene permiso para buscar prospectos en Apollo', 403);
    }

    // 2. Get API key
    const settings = getApolloSettings(req.user!.companyId);
    if (!settings.apiKey) {
      return sendError(res, 'Configura tu API Key de Apollo en Ajustes → Integraciones', 400);
    }

    // 3. Call Apollo
    const params: ApolloSearchParams = {
      name: req.body.name,
      title: req.body.title,
      organization: req.body.organization,
      location: req.body.location,
      industry: req.body.industry,
      page: Number(req.body.page) || 1,
      perPage: Number(req.body.perPage) || 25,
    };

    const result = await searchApolloContacts(settings.apiKey, params);
    sendSuccess(res, result);
  } catch (e: unknown) {
    sendError(res, (e as Error).message, 500);
  }
}

// ─── POST /api/apollo/import ──────────────────────────────────────────────────

export async function importContacts(req: AuthenticatedRequest, res: Response) {
  try {
    // 1. Permission check
    if (!canUserUseApollo(req.user!.companyId, req.user!.userId)) {
      return sendError(res, 'Tu rol no tiene permiso para importar prospectos de Apollo', 403);
    }

    const { contacts } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return sendError(res, 'Debes seleccionar al menos un prospecto', 400);
    }
    if (contacts.length > 50) {
      return sendError(res, 'Máximo 50 prospectos por importación', 400);
    }

    const result = importProspects(req.user!.companyId, contacts);
    sendSuccess(res, result, `${result.imported} prospectos importados${result.skipped ? `, ${result.skipped} ya existían` : ''}`);
  } catch (e: unknown) {
    sendError(res, (e as Error).message, 500);
  }
}

// ─── GET /api/apollo/can-search ───────────────────────────────────────────────
// Lightweight endpoint so the frontend can check permissions without exposing settings

export async function checkPermission(req: AuthenticatedRequest, res: Response) {
  try {
    const allowed = canUserUseApollo(req.user!.companyId, req.user!.userId);
    const settings = getApolloSettings(req.user!.companyId);
    sendSuccess(res, { allowed, hasApiKey: !!settings.apiKey });
  } catch (e: unknown) {
    sendError(res, (e as Error).message, 500);
  }
}
