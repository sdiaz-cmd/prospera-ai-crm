import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import { whatsAppAgentService } from './whatsapp-agent.service';
import { sendSuccess, sendError } from '../../utils/response';

export const getConfig = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const config = whatsAppAgentService.getConfig(req.user!.companyId);
    sendSuccess(res, config || {
      isActive: false, agentName: 'Asistente', businessDescription: '',
      businessHours: '', tone: 'amigable', mainGoal: 'capturar_lead',
      greeting: '', qualificationQuestions: [], knowledgeBase: [], specialAnnouncement: '',
    });
  } catch (err) { next(err); }
};

export const saveConfig = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const config = whatsAppAgentService.upsertConfig(req.user!.companyId, req.body);
    sendSuccess(res, config, 'Configuración guardada');
  } catch (err) { next(err); }
};
