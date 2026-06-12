import { v4 as uuid } from 'uuid';
import { run, get, all } from '../../database/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WaConversation {
  id: string;
  companyId: string;
  phone: string;
  contactId: string | null;
  leadId: string | null;
  contactName: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface WaMessage {
  id: string;
  companyId: string;
  phone: string;
  direction: 'inbound' | 'outbound';
  body: string;
  isBot: boolean;
  createdAt: string;
}

interface ConvRow {
  id: string; company_id: string; phone: string;
  contact_id: string | null; lead_id: string | null;
  contact_name: string; unread_count: number;
  last_message: string; last_message_at: string; created_at: string;
}

interface MsgRow {
  id: string; company_id: string; phone: string;
  direction: string; body: string; is_bot: number; created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalize phone: strip +, spaces, dashes → last 9 digits for matching */
function normPhone(phone: string): string {
  return phone.replace(/[\s\-\+]/g, '');
}

function mapConv(row: ConvRow): WaConversation {
  return {
    id: row.id, companyId: row.company_id, phone: row.phone,
    contactId: row.contact_id, leadId: row.lead_id,
    contactName: row.contact_name || row.phone,
    unreadCount: row.unread_count,
    lastMessage: row.last_message, lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
  };
}

function mapMsg(row: MsgRow): WaMessage {
  return {
    id: row.id, companyId: row.company_id, phone: row.phone,
    direction: row.direction as 'inbound' | 'outbound',
    body: row.body, isBot: !!row.is_bot, createdAt: row.created_at,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class WhatsAppInboxService {

  // ── Conversations ──────────────────────────────────────────────────

  getConversations(companyId: string): WaConversation[] {
    const rows = all<ConvRow>(
      `SELECT * FROM whatsapp_conversations WHERE company_id = ?
       ORDER BY last_message_at DESC`,
      [companyId]
    );
    return rows.map(mapConv);
  }

  getConversation(companyId: string, phone: string): WaConversation | null {
    const row = get<ConvRow>(
      'SELECT * FROM whatsapp_conversations WHERE company_id = ? AND phone = ?',
      [companyId, phone]
    );
    return row ? mapConv(row) : null;
  }

  getUnreadCount(companyId: string): number {
    const row = get<{ total: number }>(
      'SELECT COALESCE(SUM(unread_count),0) as total FROM whatsapp_conversations WHERE company_id = ?',
      [companyId]
    );
    return row?.total || 0;
  }

  markRead(companyId: string, phone: string): void {
    run(
      'UPDATE whatsapp_conversations SET unread_count = 0 WHERE company_id = ? AND phone = ?',
      [companyId, phone]
    );
  }

  // ── Messages ───────────────────────────────────────────────────────

  getMessages(companyId: string, phone: string, limit = 50): WaMessage[] {
    const rows = all<MsgRow>(
      `SELECT * FROM whatsapp_messages
       WHERE company_id = ? AND phone = ?
       ORDER BY created_at ASC
       LIMIT ?`,
      [companyId, phone, limit]
    );
    return rows.map(mapMsg);
  }

  storeMessage(companyId: string, phone: string, direction: 'inbound' | 'outbound', body: string, isBot = false): WaMessage {
    const id = uuid();
    run(
      `INSERT INTO whatsapp_messages (id, company_id, phone, direction, body, is_bot)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, companyId, phone, direction, body, isBot ? 1 : 0]
    );
    // Update conversation
    run(
      `UPDATE whatsapp_conversations
       SET last_message = ?, last_message_at = datetime('now'),
           unread_count = CASE WHEN ? = 'inbound' THEN unread_count + 1 ELSE unread_count END
       WHERE company_id = ? AND phone = ?`,
      [body.slice(0, 100), direction, companyId, phone]
    );
    return { id, companyId, phone, direction, body, isBot, createdAt: new Date().toISOString() };
  }

  // ── Process incoming (CRM integration) ────────────────────────────

  processIncoming(companyId: string, phone: string, body: string): void {
    const normalized = normPhone(phone);

    // 1. Find or create conversation
    let conv = this.getConversation(companyId, phone);
    if (!conv) {
      // Try to find matching contact by phone
      const contact = get<{ id: string; first_name: string; last_name: string }>(
        `SELECT id, first_name, last_name FROM contacts
         WHERE company_id = ? AND REPLACE(REPLACE(REPLACE(phone,' ',''),'+',''),'-','') LIKE ?`,
        [companyId, `%${normalized.slice(-9)}`]
      );

      // If no contact, try leads
      const lead = !contact ? get<{ id: string; first_name: string; last_name: string }>(
        `SELECT id, first_name, last_name FROM leads
         WHERE company_id = ? AND REPLACE(REPLACE(REPLACE(phone,' ',''),'+',''),'-','') LIKE ?`,
        [companyId, `%${normalized.slice(-9)}`]
      ) : null;

      const contactName = contact
        ? `${contact.first_name} ${contact.last_name}`.trim()
        : lead
          ? `${lead.first_name} ${lead.last_name}`.trim()
          : phone;

      run(
        `INSERT INTO whatsapp_conversations
         (id, company_id, phone, contact_id, lead_id, contact_name, unread_count, last_message, last_message_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, '', datetime('now'))`,
        [uuid(), companyId, phone,
          contact?.id || null,
          lead?.id || null,
          contactName]
      );
      conv = this.getConversation(companyId, phone)!;

      // If unknown: create lead
      if (!contact && !lead) {
        const leadId = uuid();
        run(
          `INSERT INTO leads
           (id, company_id, first_name, last_name, phone, status, source, created_at)
           VALUES (?, ?, 'WhatsApp', ?, ?, 'new', 'whatsapp', datetime('now'))`,
          [leadId, companyId, phone, phone]
        );
        run('UPDATE whatsapp_conversations SET lead_id = ? WHERE company_id = ? AND phone = ?',
          [leadId, companyId, phone]);
      }
    }

    // 2. Store the message
    this.storeMessage(companyId, phone, 'inbound', body, false);

    // 3. If linked to a known contact, log CRM activity
    if (conv?.contactId) {
      run(
        `INSERT INTO activities
         (id, company_id, contact_id, type, subject, notes, status, created_at)
         VALUES (?, ?, ?, 'whatsapp', 'Mensaje WhatsApp recibido', ?, 'completed', datetime('now'))`,
        [uuid(), companyId, conv.contactId, body.slice(0, 500)]
      );
    }
  }

  // ── Send message (via Baileys) ─────────────────────────────────────

  async sendMessage(companyId: string, phone: string, body: string): Promise<void> {
    // Ensure conversation exists
    if (!this.getConversation(companyId, phone)) {
      run(
        `INSERT OR IGNORE INTO whatsapp_conversations
         (id, company_id, phone, contact_name, unread_count, last_message, last_message_at)
         VALUES (?, ?, ?, ?, 0, '', datetime('now'))`,
        [uuid(), companyId, phone, phone]
      );
    }

    // Send via Baileys
    const { whatsAppSessionService } = require('../whatsapp-session/whatsapp-session.service');
    const status = whatsAppSessionService.getStatus(companyId);
    if (status.status !== 'connected') {
      throw new Error('WhatsApp no está conectado');
    }

    const sessions = (whatsAppSessionService as any).getSessions?.() || null;
    // Use internal socket via session service
    await whatsAppSessionService.sendMessage(companyId, phone, body);

    // Store outbound message
    this.storeMessage(companyId, phone, 'outbound', body, false);
  }
}

export const whatsAppInboxService = new WhatsAppInboxService();
