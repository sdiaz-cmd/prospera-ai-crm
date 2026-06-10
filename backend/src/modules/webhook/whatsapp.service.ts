import { get, all, run } from '../../database/db';
import { v4 as uuid } from 'uuid';

interface WhatsAppPayload {
  phone: string;
  name?: string;
  email?: string;
  company?: string;
  message?: string;
  direction?: 'inbound' | 'outbound';
  botResponse?: string;   // optional: what the bot replied
  extraNotes?: string;
}

// ─── Round-robin assignment ───────────────────────────────────────────────────

function getNextExecutive(companyId: string): string | null {
  // Get all active sales users for this company
  const users = all<{ id: string; first_name: string; last_name: string }>(
    `SELECT u.id, u.first_name, u.last_name
     FROM users u
     JOIN user_companies uc ON uc.user_id = u.id
     JOIN roles r ON uc.role_id = r.id
     WHERE uc.company_id = ? AND uc.is_active = 1 AND u.is_active = 1
     ORDER BY u.first_name`,
    [companyId]
  );

  if (!users.length) return null;

  // Get last assigned
  const state = get<{ last_assigned_user_id: string }>(
    'SELECT last_assigned_user_id FROM assignment_state WHERE company_id = ?',
    [companyId]
  );

  let nextUser: { id: string } = users[0];

  if (state?.last_assigned_user_id) {
    const lastIdx = users.findIndex(u => u.id === state.last_assigned_user_id);
    nextUser = users[(lastIdx + 1) % users.length];
  }

  // Update state
  const existing = get('SELECT id FROM assignment_state WHERE company_id = ?', [companyId]);
  if (existing) {
    run('UPDATE assignment_state SET last_assigned_user_id = ?, updated_at = datetime(\'now\') WHERE company_id = ?',
      [nextUser.id, companyId]);
  } else {
    run('INSERT INTO assignment_state (id, company_id, last_assigned_user_id) VALUES (?, ?, ?)',
      [uuid(), companyId, nextUser.id]);
  }

  return nextUser.id;
}

// ─── Main service ─────────────────────────────────────────────────────────────

export class WhatsAppWebhookService {

  process(companyId: string, payload: WhatsAppPayload) {
    const {
      phone, name, email, company, message,
      direction = 'inbound', botResponse, extraNotes,
    } = payload;

    // 1. Find company to validate it exists
    const comp = get('SELECT id FROM companies WHERE id = ?', [companyId]);
    if (!comp) throw new Error('Empresa no encontrada');

    // 2. Normalize phone
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[^+\d]/g, '');

    // 3. Find existing lead by phone
    let lead = get<{
      id: string; first_name: string; last_name: string; assignee_id: string; status: string;
    }>('SELECT id, first_name, last_name, assignee_id, status FROM leads WHERE company_id = ? AND phone = ?',
      [companyId, cleanPhone]);

    let isNew = false;
    let assigneeId: string | null = null;

    if (!lead) {
      // 4a. Create new lead
      isNew = true;
      assigneeId = getNextExecutive(companyId);

      const firstName = name ? name.split(' ')[0] : 'Lead';
      const lastName  = name ? name.split(' ').slice(1).join(' ') : 'WhatsApp';
      const leadId    = uuid();

      run(`INSERT INTO leads
        (id, company_id, assignee_id, first_name, last_name, email, phone, company,
         source, status, score, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'whatsapp', 'new', 60, ?, datetime('now'), datetime('now'))`,
        [leadId, companyId, assigneeId, firstName, lastName,
          email || null, cleanPhone, company || null,
          `Lead captado via WhatsApp.${extraNotes ? ' ' + extraNotes : ''}`]);

      lead = get('SELECT id, first_name, last_name, assignee_id, status FROM leads WHERE id = ?', [leadId]) as typeof lead;
    } else {
      // 4b. Update existing lead if we have new data
      assigneeId = lead.assignee_id;
      const updates: string[] = [];
      const params: unknown[] = [];

      if (email && !get('SELECT id FROM leads WHERE id = ? AND email IS NOT NULL', [lead.id])) {
        updates.push('email = ?'); params.push(email);
      }
      if (company) { updates.push('company = ?'); params.push(company); }
      if (name) {
        updates.push('first_name = ?'); params.push(name.split(' ')[0]);
        updates.push('last_name = ?');  params.push(name.split(' ').slice(1).join(' ') || '');
      }
      updates.push('updated_at = datetime(\'now\')');
      params.push(lead.id, companyId);

      if (updates.length > 1) {
        run(`UPDATE leads SET ${updates.join(', ')} WHERE id = ? AND company_id = ?`, params);
      }
    }

    if (!lead) throw new Error('Error al crear o encontrar el lead');

    // 5. Log the conversation as an activity
    const activityBody = [
      message ? `💬 Lead: "${message}"` : null,
      botResponse ? `🤖 Bot: "${botResponse}"` : null,
    ].filter(Boolean).join('\n');

    const activityId = uuid();
    if (activityBody || message) {
      run(`INSERT INTO activities
        (id, company_id, owner_id, lead_id, type, subject, body, completed_at, created_at)
        VALUES (?, ?, ?, ?, 'whatsapp', ?, ?, datetime('now'), datetime('now'))`,
        [activityId, companyId, assigneeId || lead.assignee_id || 'system',
          lead.id,
          direction === 'inbound' ? `WhatsApp entrante — ${cleanPhone}` : `WhatsApp saliente — ${cleanPhone}`,
          activityBody || message]);
    }

    // 6. Record webhook event
    run(`INSERT INTO webhook_events
      (id, company_id, source, phone, lead_id, direction, message, raw_payload, processed)
      VALUES (?, ?, 'whatsapp', ?, ?, ?, ?, ?, 1)`,
      [uuid(), companyId, cleanPhone, lead.id, direction,
        message || null, JSON.stringify(payload)]);

    // 7. Get assignee name
    const assignee = assigneeId
      ? get<{ first_name: string; last_name: string }>('SELECT first_name, last_name FROM users WHERE id = ?', [assigneeId])
      : null;

    return {
      success: true,
      isNew,
      leadId: lead.id,
      leadName: `${lead.first_name} ${lead.last_name || ''}`.trim(),
      phone: cleanPhone,
      assignedTo: assignee ? `${assignee.first_name} ${assignee.last_name || ''}`.trim() : null,
      assigneeId,
      activityId,
      message: isNew
        ? `Lead nuevo creado y asignado a ${assignee?.first_name || 'ejecutivo'}`
        : `Actividad registrada para lead existente`,
    };
  }

  getRecentEvents(companyId: string, limit = 20) {
    return all<Record<string, unknown>>(
      `SELECT we.*, l.first_name, l.last_name, u.first_name as exec_first, u.last_name as exec_last
       FROM webhook_events we
       LEFT JOIN leads l ON we.lead_id = l.id
       LEFT JOIN leads l2 ON we.lead_id = l2.id
       LEFT JOIN users u ON l.assignee_id = u.id
       WHERE we.company_id = ?
       ORDER BY we.created_at DESC LIMIT ?`,
      [companyId, limit]
    );
  }

  getStats(companyId: string) {
    const total     = Number((get<{ c: number }>('SELECT COUNT(*) as c FROM webhook_events WHERE company_id = ?', [companyId]))?.c || 0);
    const today     = Number((get<{ c: number }>('SELECT COUNT(*) as c FROM webhook_events WHERE company_id = ? AND date(created_at) = date(\'now\')', [companyId]))?.c || 0);
    const newLeads  = Number((get<{ c: number }>('SELECT COUNT(*) as c FROM leads WHERE company_id = ? AND source = \'whatsapp\'', [companyId]))?.c || 0);
    const inbound   = Number((get<{ c: number }>('SELECT COUNT(*) as c FROM webhook_events WHERE company_id = ? AND direction = \'inbound\'', [companyId]))?.c || 0);
    return { total, today, newLeads, inbound };
  }
}
