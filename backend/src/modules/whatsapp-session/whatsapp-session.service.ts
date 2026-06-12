import path from 'path';
import fs from 'fs';
import qrcode from 'qrcode';
import { EventEmitter } from 'events';

// Session storage: companyId → state
const SESSIONS_DIR = process.env.SESSIONS_DIR || '/data/whatsapp';

export type WaStatus = 'disconnected' | 'qr' | 'connecting' | 'connected';

interface SessionState {
  status: WaStatus;
  qrDataUrl?: string;       // base64 PNG of QR
  phone?: string;           // connected phone number
  socket?: any;
  emitter: EventEmitter;
}

const sessions = new Map<string, SessionState>();

// ─── Lazy ESM loader (optional dep — won't crash if not installed) ───────────
let _baileys: any = null;
let _baileysError: string | null = null;
async function getBaileys() {
  if (_baileysError) throw new Error(_baileysError);
  if (!_baileys) {
    try {
      _baileys = await import('@whiskeysockets/baileys');
    } catch (e) {
      _baileysError = `Baileys no disponible: ${(e as Error).message}`;
      throw new Error(_baileysError);
    }
  }
  return _baileys;
}

// ─── Minimal silent logger ────────────────────────────────────────────────────
const silentLogger: any = {
  level: 'silent',
  trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {},
  child() { return silentLogger; },
};

// ─── Service ──────────────────────────────────────────────────────────────────
export class WhatsAppSessionService {

  private getOrCreate(companyId: string): SessionState {
    if (!sessions.has(companyId)) {
      sessions.set(companyId, { status: 'disconnected', emitter: new EventEmitter() });
    }
    return sessions.get(companyId)!;
  }

  async connect(companyId: string): Promise<void> {
    const session = this.getOrCreate(companyId);
    if (session.status === 'connected' || session.status === 'connecting' || session.status === 'qr') return;

    session.status = 'connecting';

    const sessionDir = path.join(SESSIONS_DIR, companyId);
    fs.mkdirSync(sessionDir, { recursive: true });

    const {
      default: makeWASocket,
      useMultiFileAuthState,
      DisconnectReason,
      fetchLatestBaileysVersion,
    } = await getBaileys();

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: silentLogger,
      browser: ['PROSPERA.AI', 'Chrome', '1.0.0'],
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
    });

    session.socket = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await qrcode.toDataURL(qr);
          session.status = 'qr';
          session.qrDataUrl = qrDataUrl;
          session.emitter.emit('update', { type: 'qr', qr: qrDataUrl });
        } catch (err) {
          console.error('[WA] Error generando QR:', err);
        }
      }

      if (connection === 'open') {
        session.status = 'connected';
        session.qrDataUrl = undefined;
        session.phone = sock.user?.id?.split(':')[0] || sock.user?.id || undefined;
        session.emitter.emit('update', { type: 'connected', phone: session.phone });
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        session.status = 'disconnected';
        session.socket = undefined;
        session.qrDataUrl = undefined;
        session.emitter.emit('update', { type: 'disconnected' });

        if (!loggedOut) {
          // Reconnect after 3s unless logged out
          setTimeout(() => this.connect(companyId), 3000);
        } else {
          // Clean up saved session so next connect shows QR again
          this.clearSessionFiles(companyId);
        }
      }
    });

    sock.ev.on('messages.upsert', async (upsert: any) => {
      if (upsert.type !== 'notify') return;
      for (const msg of upsert.messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const jid = msg.key.remoteJid || '';
        if (jid.endsWith('@g.us')) continue; // skip groups

        const phone = jid.replace('@s.whatsapp.net', '').replace('@lid', '');
        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          '';

        if (phone && text) {
          this.handleIncoming(companyId, phone, text).catch(console.error);
        }
      }
    });
  }

  private async handleIncoming(companyId: string, phone: string, message: string) {
    console.log(`[WA] Mensaje entrante — empresa:${companyId} phone:${phone} msg:"${message.slice(0,50)}"`);
    try {
      // 1. Process via inbox service (store message + CRM deduplication)
      const { whatsAppInboxService } = require('../whatsapp-inbox/whatsapp-inbox.service');
      whatsAppInboxService.processIncoming(companyId, phone, message);
      console.log('[WA] processIncoming OK');

      // 2. Generate AI reply if agent is active (MODO IA)
      const { get } = require('../../database/db');
      const company = get('SELECT name FROM companies WHERE id = ?', [companyId]) as { name: string } | null;
      const companyName = company?.name || 'la empresa';

      const { whatsAppAgentService } = require('../whatsapp-agent/whatsapp-agent.service');
      console.log('[WA] Llamando generateReply...');
      const botReply: string | null = await whatsAppAgentService.generateReply(
        companyId, companyName, phone, message
      );
      console.log(`[WA] generateReply result: ${botReply ? `"${botReply.slice(0,60)}..."` : 'null'}`);

      // 3. Send and store bot reply if any
      if (botReply) {
        const session = sessions.get(companyId);
        console.log(`[WA] Sesión para envío: status=${session?.status}`);
        if (session?.socket && session.status === 'connected') {
          const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
          await session.socket.sendMessage(jid, { text: botReply });
          whatsAppInboxService.storeMessage(companyId, phone, 'outbound', botReply, true);
          console.log('[WA] Respuesta enviada OK');
        } else {
          console.warn('[WA] No se pudo enviar: sesión no conectada');
        }
      }
    } catch (err) {
      console.error('[WA] Error procesando mensaje entrante:', (err as Error).message, (err as Error).stack?.split('\n')[1]);
    }
  }

  disconnect(companyId: string): void {
    const session = sessions.get(companyId);
    if (session?.socket) {
      try { session.socket.logout(); } catch {}
    }
    this.clearSessionFiles(companyId);
    sessions.delete(companyId);
  }

  private clearSessionFiles(companyId: string) {
    const sessionDir = path.join(SESSIONS_DIR, companyId);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  }

  getStatus(companyId: string) {
    const session = sessions.get(companyId);
    return {
      status: (session?.status || 'disconnected') as WaStatus,
      phone: session?.phone,
      qr: session?.qrDataUrl,
    };
  }

  /** Send a message to a phone number */
  async sendMessage(companyId: string, phone: string, body: string): Promise<void> {
    const session = sessions.get(companyId);
    if (!session?.socket || session.status !== 'connected') {
      throw new Error('WhatsApp no conectado');
    }
    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
    await session.socket.sendMessage(jid, { text: body });
  }

  /** Subscribe to live events for a company. Returns an unsubscribe function. */
  subscribe(companyId: string, listener: (event: any) => void): () => void {
    const session = this.getOrCreate(companyId);
    session.emitter.on('update', listener);
    return () => session.emitter.off('update', listener);
  }

  /** On server startup, reconnect any companies that have saved sessions */
  async reconnectSaved(): Promise<void> {
    if (!fs.existsSync(SESSIONS_DIR)) return;
    const dirs = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const companyId of dirs) {
      const credsFile = path.join(SESSIONS_DIR, companyId, 'creds.json');
      if (fs.existsSync(credsFile)) {
        console.log(`[WA] Reconectando empresa ${companyId}...`);
        this.connect(companyId).catch(err =>
          console.error(`[WA] Error reconectando ${companyId}:`, err.message)
        );
      }
    }
  }
}

export const whatsAppSessionService = new WhatsAppSessionService();
