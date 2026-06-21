import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const API_BASE = process.env.API_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@prospera.ai';

export interface ContactEmail {
  id: string;
  companyId: string;
  contactId: string | null;
  leadId: string | null;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  resendId: string | null;
  openedAt: string | null;
  sentBy: string | null;
  sentByName: string | null;
  createdAt: string;
}

function format(row: Record<string, unknown>): ContactEmail {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    contactId: row.contact_id as string | null,
    leadId: row.lead_id as string | null,
    fromEmail: row.from_email as string,
    toEmail: row.to_email as string,
    subject: row.subject as string,
    bodyHtml: row.body_html as string,
    resendId: row.resend_id as string | null,
    openedAt: row.opened_at as string | null,
    sentBy: row.sent_by as string | null,
    sentByName: row.sent_by_name as string | null,
    createdAt: row.created_at as string,
  };
}

export const emailService = {
  async send(opts: {
    companyId: string;
    contactId?: string;
    leadId?: string;
    toEmail: string;
    subject: string;
    bodyHtml: string;
    sentBy: string;
    sentByName: string;
    fromEmail?: string;
  }): Promise<ContactEmail> {
    const id = uuid();
    const from = opts.fromEmail || FROM_EMAIL;

    // Inject tracking pixel just before </body>
    const pixel = `<img src="${API_BASE}/api/emails/track/${id}" width="1" height="1" style="display:none" alt="" />`;
    const htmlWithPixel = opts.bodyHtml.includes('</body>')
      ? opts.bodyHtml.replace('</body>', `${pixel}</body>`)
      : opts.bodyHtml + pixel;

    let resendId: string | null = null;
    if (process.env.RESEND_API_KEY) {
      try {
        const { data } = await resend.emails.send({
          from,
          to: [opts.toEmail],
          subject: opts.subject,
          html: htmlWithPixel,
        });
        resendId = data?.id ?? null;
      } catch (err) {
        console.error('[email] Resend error:', err);
      }
    }

    run(
      `INSERT INTO contact_emails (id, company_id, contact_id, lead_id, from_email, to_email, subject, body_html, resend_id, sent_by, sent_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, opts.companyId, opts.contactId || null, opts.leadId || null,
       from, opts.toEmail, opts.subject, htmlWithPixel,
       resendId, opts.sentBy, opts.sentByName]
    );

    return this.getById(id)!;
  },

  getById(id: string): ContactEmail | null {
    const row = get<Record<string, unknown>>('SELECT * FROM contact_emails WHERE id = ?', [id]);
    return row ? format(row) : null;
  },

  listByContact(contactId: string): ContactEmail[] {
    return all<Record<string, unknown>>(
      'SELECT * FROM contact_emails WHERE contact_id = ? ORDER BY created_at DESC',
      [contactId]
    ).map(format);
  },

  listByLead(leadId: string): ContactEmail[] {
    return all<Record<string, unknown>>(
      'SELECT * FROM contact_emails WHERE lead_id = ? ORDER BY created_at DESC',
      [leadId]
    ).map(format);
  },

  markOpened(id: string): void {
    run(
      `UPDATE contact_emails SET opened_at = datetime('now') WHERE id = ? AND opened_at IS NULL`,
      [id]
    );
  },
};
