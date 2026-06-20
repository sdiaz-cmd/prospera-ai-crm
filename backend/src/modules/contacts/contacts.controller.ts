import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ContactsService } from './contacts.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const svc = new ContactsService();

export const validateCreate = [
  body('firstName').notEmpty().withMessage('El nombre es requerido'),
  body('email').optional().isEmail(),
];

export async function getContacts(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.findAll(req.user!.companyId, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      search: req.query.search as string,
      accountId: req.query.accountId as string,
      assigneeId: req.query.assigneeId as string,
    }));
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function getContact(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.findById(req.params.id, req.user!.companyId));
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrado') ? 404 : 500);
  }
}

export async function createContact(req: AuthenticatedRequest, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { sendError(res, 'Datos inválidos', 400, errors.array() as unknown as Record<string, string[]>); return; }
  try {
    sendSuccess(res, await svc.create(req.user!.companyId, req.body), 'Contacto creado', 201);
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function updateContact(req: AuthenticatedRequest, res: Response) {
  try {
    sendSuccess(res, await svc.update(req.params.id, req.user!.companyId, req.body), 'Contacto actualizado');
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrado') ? 404 : 500);
  }
}

export async function deleteContact(req: AuthenticatedRequest, res: Response) {
  try {
    await svc.delete(req.params.id, req.user!.companyId);
    sendSuccess(res, null, 'Contacto eliminado');
  } catch (e: unknown) {
    const m = (e as Error).message;
    sendError(res, m, m.includes('encontrado') ? 404 : 500);
  }
}

export async function importContacts(req: AuthenticatedRequest, res: Response) {
  try {
    const { csvContent, assigneeId } = req.body;
    if (!csvContent) { sendError(res, 'csvContent requerido', 400); return; }
    const result = await svc.importBulk(req.user!.companyId, csvContent, assigneeId);
    sendSuccess(res, result, `${result.imported} contactos importados`, 200);
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}

export async function exportContacts(req: AuthenticatedRequest, res: Response) {
  try {
    const csv = svc.exportCsv(req.user!.companyId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="contactos.csv"');
    res.send('﻿' + csv); // BOM for Excel
  } catch (e: unknown) { sendError(res, (e as Error).message, 500); }
}
