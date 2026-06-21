import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import { notificationsService } from './notifications.service';
import { sendSuccess } from '../../utils/response';

export const listNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const items = notificationsService.list(req.user!.userId, req.user!.companyId);
    const unread = notificationsService.countUnread(req.user!.userId, req.user!.companyId);
    sendSuccess(res, { items, unread });
  } catch (err) { next(err); }
};

export const markRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    notificationsService.markRead(req.params.id, req.user!.userId);
    sendSuccess(res, null, 'Leída');
  } catch (err) { next(err); }
};

export const markAllRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    notificationsService.markAllRead(req.user!.userId, req.user!.companyId);
    sendSuccess(res, null, 'Todas leídas');
  } catch (err) { next(err); }
};
