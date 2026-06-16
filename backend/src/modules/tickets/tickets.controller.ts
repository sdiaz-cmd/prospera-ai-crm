import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import { ticketsService, TicketCategory, TicketPriority, TicketStatus } from './tickets.service';
import { sendSuccess, sendError } from '../../utils/response';
import { get as dbGet } from '../../database/db';

// Helper: determinar si el usuario es admin/owner de la empresa
function isAdmin(req: AuthenticatedRequest): boolean {
  const uc = dbGet<{ is_owner: number; role_name: string }>(
    `SELECT uc.is_owner, r.name as role_name
     FROM user_companies uc
     JOIN roles r ON uc.role_id = r.id
     WHERE uc.user_id = ? AND uc.company_id = ?`,
    [req.user!.userId, req.user!.companyId]
  );
  return !!(uc?.is_owner || uc?.role_name === 'Administrador');
}

// GET /api/tickets
export const getTickets = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = isAdmin(req);
    const { status, category, priority } = req.query as Record<string, string>;
    const tickets = ticketsService.findAll(
      req.user!.companyId, req.user!.userId, admin,
      { status, category, priority }
    );
    sendSuccess(res, tickets);
  } catch (err) { next(err); }
};

// GET /api/tickets/stats
export const getStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Sin permiso', 403); return; }
    sendSuccess(res, ticketsService.getStats(req.user!.companyId));
  } catch (err) { next(err); }
};

// GET /api/tickets/:id
export const getTicket = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = isAdmin(req);
    const ticket = ticketsService.findById(req.params.id, req.user!.companyId, req.user!.userId, admin);
    if (!ticket) { sendError(res, 'Ticket no encontrado', 404); return; }
    sendSuccess(res, ticket);
  } catch (err) { next(err); }
};

// POST /api/tickets
export const createTicket = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, category, priority } = req.body as {
      title?: string; description?: string;
      category?: TicketCategory; priority?: TicketPriority;
    };
    if (!title?.trim() || !description?.trim()) {
      sendError(res, 'Título y descripción son requeridos', 400); return;
    }

    // Get user name + email
    const userRow = dbGet<{ first_name: string; last_name: string; email: string }>(
      'SELECT first_name, last_name, email FROM users WHERE id = ?',
      [req.user!.userId]
    );
    const userName = userRow ? `${userRow.first_name} ${userRow.last_name}`.trim() : 'Usuario';
    const userEmail = userRow?.email || req.user!.email;

    const ticket = ticketsService.create({
      companyId: req.user!.companyId,
      userId: req.user!.userId,
      userName, userEmail,
      title: title.trim(),
      description: description.trim(),
      category: category || 'consulta',
      priority: priority || 'media',
    });
    sendSuccess(res, ticket, 'Ticket creado', 201);
  } catch (err) { next(err); }
};

// PATCH /api/tickets/:id
export const updateTicket = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Solo administradores pueden actualizar tickets', 403); return; }
    const { status, adminNotes } = req.body as { status?: TicketStatus; adminNotes?: string };
    const ticket = ticketsService.update(req.params.id, req.user!.companyId, { status, adminNotes });
    if (!ticket) { sendError(res, 'Ticket no encontrado', 404); return; }
    sendSuccess(res, ticket, 'Ticket actualizado');
  } catch (err) { next(err); }
};

// DELETE /api/tickets/:id
export const deleteTicket = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) { sendError(res, 'Solo administradores pueden eliminar tickets', 403); return; }
    ticketsService.delete(req.params.id, req.user!.companyId);
    sendSuccess(res, null, 'Ticket eliminado');
  } catch (err) { next(err); }
};
