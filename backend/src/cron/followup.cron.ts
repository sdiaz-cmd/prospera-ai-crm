import cron from 'node-cron';
import { all, get } from '../database/db';
import { notificationsService } from '../modules/notifications/notifications.service';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@prospera.ai';
const INACTIVITY_DAYS = parseInt(process.env.FOLLOWUP_DAYS || '7', 10);

interface StaleRecord {
  id: string;
  name: string;
  email: string | null;
  type: 'contact' | 'lead';
  assignee_id: string | null;
  company_id: string;
  last_activity: string | null;
}

interface AssigneeRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_id: string;
}

async function runFollowupCheck() {
  console.log('[followup-cron] Running follow-up check...');

  // Find stale contacts (no email or activity in last N days)
  const staleContacts = all<StaleRecord>(`
    SELECT c.id, (c.first_name || ' ' || COALESCE(c.last_name, '')) as name, c.email,
           'contact' as type, c.assignee_id, c.company_id,
           MAX(COALESCE(ce.created_at, a.created_at)) as last_activity
    FROM contacts c
    LEFT JOIN contact_emails ce ON ce.contact_id = c.id
    LEFT JOIN activities a ON a.contact_id = c.id
    WHERE c.status NOT IN ('inactive', 'closed')
    GROUP BY c.id
    HAVING (last_activity IS NULL OR last_activity < datetime('now', '-${INACTIVITY_DAYS} days'))
  `, []);

  // Find stale leads
  const staleLeads = all<StaleRecord>(`
    SELECT l.id, (l.first_name || ' ' || COALESCE(l.last_name, '')) as name, l.email,
           'lead' as type, l.assignee_id, l.company_id,
           MAX(COALESCE(ce.created_at, a.created_at)) as last_activity
    FROM leads l
    LEFT JOIN contact_emails ce ON ce.lead_id = l.id
    LEFT JOIN activities a ON a.lead_id = l.id
    WHERE l.status NOT IN ('converted', 'lost', 'closed')
    GROUP BY l.id
    HAVING (last_activity IS NULL OR last_activity < datetime('now', '-${INACTIVITY_DAYS} days'))
  `, []);

  const stale = [...staleContacts, ...staleLeads];
  if (stale.length === 0) { console.log('[followup-cron] No stale records.'); return; }

  // Group by assignee
  const byAssignee: Record<string, { assignee: AssigneeRow; records: StaleRecord[] }> = {};

  for (const record of stale) {
    if (!record.assignee_id) continue;

    const assignee = get<AssigneeRow>(
      'SELECT id, email, first_name, last_name, (SELECT company_id FROM user_companies WHERE user_id = id LIMIT 1) as company_id FROM users WHERE id = ?',
      [record.assignee_id]
    );
    if (!assignee) continue;

    if (!byAssignee[assignee.id]) byAssignee[assignee.id] = { assignee, records: [] };
    byAssignee[assignee.id].records.push(record);
  }

  // For each assignee: create in-app notifications + send email digest
  for (const { assignee, records } of Object.values(byAssignee)) {
    // Get company_id from record (assignee may serve multiple companies)
    const companyGroups: Record<string, StaleRecord[]> = {};
    for (const r of records) {
      if (!companyGroups[r.company_id]) companyGroups[r.company_id] = [];
      companyGroups[r.company_id].push(r);
    }

    for (const [companyId, companyRecords] of Object.entries(companyGroups)) {
      // Create in-app notification
      notificationsService.create({
        companyId,
        userId: assignee.id,
        type: 'followup',
        title: `${companyRecords.length} cliente${companyRecords.length > 1 ? 's' : ''} sin actividad hace +${INACTIVITY_DAYS} días`,
        message: companyRecords.slice(0, 3).map(r => r.name.trim()).join(', ') +
          (companyRecords.length > 3 ? ` y ${companyRecords.length - 3} más` : ''),
        link: '/crm/contacts',
      });
    }

    // Send email digest via Resend
    if (process.env.RESEND_API_KEY && assignee.email) {
      const rows = records.map(r => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${r.name.trim()}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${r.type === 'contact' ? 'Contacto' : 'Lead'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${r.last_activity ? new Date(r.last_activity).toLocaleDateString('es-CL') : 'Sin actividad'}</td>
        </tr>
      `).join('');

      const assigneeName = `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() || assignee.email;

      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#3B82F6;padding:24px;border-radius:8px 8px 0 0">
            <h1 style="color:white;margin:0;font-size:20px">⏰ Resumen de seguimiento — PROSPERA.AI</h1>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <p>Hola <strong>${assigneeName}</strong>,</p>
            <p>Los siguientes clientes llevan <strong>más de ${INACTIVITY_DAYS} días sin actividad</strong> y necesitan seguimiento:</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <thead>
                <tr style="background:#f9fafb">
                  <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280">Nombre</th>
                  <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280">Tipo</th>
                  <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280">Última actividad</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="margin-top:24px">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/crm/contacts"
                 style="background:#3B82F6;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
                Ver en PROSPERA.AI →
              </a>
            </p>
          </div>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px">Este email fue enviado automáticamente por el bot de seguimiento de PROSPERA.AI</p>
        </div>
      `;

      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: [assignee.email],
          subject: `⏰ ${records.length} cliente${records.length > 1 ? 's' : ''} sin actividad — Resumen PROSPERA.AI`,
          html,
        });
        console.log(`[followup-cron] Digest sent to ${assignee.email} (${records.length} records)`);
      } catch (err) {
        console.error('[followup-cron] Failed to send digest:', err);
      }
    }
  }
}

export function startFollowupCron() {
  // Run daily at 8:00 AM server time
  cron.schedule('0 8 * * *', runFollowupCheck, { timezone: 'America/Santiago' });
  console.log('[followup-cron] Scheduled daily at 08:00 America/Santiago');
}
