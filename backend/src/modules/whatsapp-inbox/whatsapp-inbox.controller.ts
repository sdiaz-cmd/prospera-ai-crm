import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import { whatsAppInboxService } from './whatsapp-inbox.service';
import { whatsAppSessionService } from '../whatsapp-session/whatsapp-session.service';
import { sendSuccess, sendError } from '../../utils/response';

export const getConversations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const convs = whatsAppInboxService.getConversations(req.user!.companyId);
    sendSuccess(res, convs);
  } catch (err) { next(err); }
};

export const getMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone } = req.params;
    whatsAppInboxService.markRead(req.user!.companyId, phone);
    const msgs = whatsAppInboxService.getMessages(req.user!.companyId, phone);
    sendSuccess(res, msgs);
  } catch (err) { next(err); }
};

export const sendMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone, body } = req.body;
    if (!phone || !body) { sendError(res, 'phone y body son requeridos', 400); return; }

    await whatsAppSessionService.sendMessage(req.user!.companyId, phone, body);
    whatsAppInboxService.storeMessage(req.user!.companyId, phone, 'outbound', body, false);

    sendSuccess(res, null, 'Mensaje enviado');
  } catch (err) { next(err); }
};

export const getUnreadCount = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const count = whatsAppInboxService.getUnreadCount(req.user!.companyId);
    sendSuccess(res, { count });
  } catch (err) { next(err); }
};
