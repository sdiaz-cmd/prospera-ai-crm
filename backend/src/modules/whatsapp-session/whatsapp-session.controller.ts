import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import { whatsAppSessionService } from './whatsapp-session.service';
import { verifyAccessToken } from '../../utils/jwt';

export const getStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const status = whatsAppSessionService.getStatus(companyId);
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
};

export const connect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    // Start connection in background (QR arrives via SSE stream)
    whatsAppSessionService.connect(companyId).catch(console.error);
    res.json({ success: true, message: 'Conexión iniciada. Espera el código QR.' });
  } catch (err) {
    next(err);
  }
};

export const disconnect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    whatsAppSessionService.disconnect(companyId);
    res.json({ success: true, message: 'WhatsApp desconectado' });
  } catch (err) {
    next(err);
  }
};

/**
 * SSE stream — pushes QR codes and status updates to the browser in real time.
 * EventSource doesn't support custom headers, so we accept token as query param.
 */
export const qrStream = (
  req: AuthenticatedRequest,
  res: Response
): void => {
  // Allow token via query param for EventSource compatibility
  let companyId = req.user?.companyId;
  if (!companyId) {
    const token = req.query.token as string;
    if (!token) { res.status(401).end(); return; }
    try {
      const payload = verifyAccessToken(token);
      companyId = payload.companyId;
    } catch { res.status(401).end(); return; }
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  const cid = companyId!;

  // Send current state immediately
  const current = whatsAppSessionService.getStatus(cid);
  sendSSE(res, current.status === 'qr'
    ? { type: 'qr', qr: current.qr }
    : { type: current.status, phone: current.phone });

  // Keep-alive ping every 20s
  const ping = setInterval(() => sendSSE(res, { type: 'ping' }), 20000);

  // Subscribe to live events
  const unsubscribe = whatsAppSessionService.subscribe(cid, (event) => {
    sendSSE(res, event);
  });

  req.on('close', () => {
    clearInterval(ping);
    unsubscribe();
  });
};

function sendSSE(res: Response, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}
