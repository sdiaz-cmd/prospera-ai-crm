import { get, all, run } from '../../database/db';
import { v4 as uuid } from 'uuid';

interface CampaignRow {
  id: string; company_id: string; created_by: string; name: string; type: string;
  status: string; subject: string; preview_text: string; body: string;
  segment_source: string; segment_status: string;
  scheduled_at: string; sent_at: string;
  recipient_count: number; sent_count: number; open_count: number;
  click_count: number; bounce_count: number; unsubscribe_count: number;
  created_at: string; updated_at: string;
  creator_first_name?: string; creator_last_name?: string;
}

function fmt(row: CampaignRow) {
  const openRate = row.sent_count > 0 ? Math.round((row.open_count / row.sent_count) * 100) : 0;
  const clickRate = row.open_count > 0 ? Math.round((row.click_count / row.open_count) * 100) : 0;
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    subject: row.subject,
    previewText: row.preview_text,
    body: row.body,
    segmentSource: row.segment_source,
    segmentStatus: row.segment_status,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    stats: {
      recipients: Number(row.recipient_count || 0),
      sent: Number(row.sent_count || 0),
      opened: Number(row.open_count || 0),
      clicked: Number(row.click_count || 0),
      bounced: Number(row.bounce_count || 0),
      unsubscribed: Number(row.unsubscribe_count || 0),
      openRate,
      clickRate,
    },
    creator: row.creator_first_name
      ? `${row.creator_first_name} ${row.creator_last_name || ''}`.trim()
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class CampaignsService {
  findAll(companyId: string) {
    const rows = all<CampaignRow>(`
      SELECT c.*, u.first_name as creator_first_name, u.last_name as creator_last_name
      FROM campaigns c LEFT JOIN users u ON c.created_by = u.id
      WHERE c.company_id = ? ORDER BY c.created_at DESC
    `, [companyId]);
    return rows.map(fmt);
  }

  findById(id: string, companyId: string) {
    const row = get<CampaignRow>(`
      SELECT c.*, u.first_name as creator_first_name, u.last_name as creator_last_name
      FROM campaigns c LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ? AND c.company_id = ?
    `, [id, companyId]);
    if (!row) return null;
    return fmt(row);
  }

  getStats(companyId: string) {
    const total = Number((get<{ c: number }>('SELECT COUNT(*) as c FROM campaigns WHERE company_id = ?', [companyId]))?.c || 0);
    const sent = Number((get<{ c: number }>('SELECT COUNT(*) as c FROM campaigns WHERE company_id = ? AND status = ?', [companyId, 'sent']))?.c || 0);
    const draft = Number((get<{ c: number }>('SELECT COUNT(*) as c FROM campaigns WHERE company_id = ? AND status = ?', [companyId, 'draft']))?.c || 0);
    const totalSent = Number((get<{ s: number }>('SELECT COALESCE(SUM(sent_count),0) as s FROM campaigns WHERE company_id = ?', [companyId]))?.s || 0);
    const totalOpened = Number((get<{ s: number }>('SELECT COALESCE(SUM(open_count),0) as s FROM campaigns WHERE company_id = ?', [companyId]))?.s || 0);
    const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
    return { total, sent, draft, totalSent, totalOpened, avgOpenRate };
  }

  // Compute how many recipients match segment filters
  private countRecipients(companyId: string, segmentSource?: string, segmentStatus?: string): number {
    let sql = 'SELECT COUNT(*) as c FROM leads WHERE company_id = ? AND email IS NOT NULL AND email != \'\'';
    const params: unknown[] = [companyId];
    if (segmentSource) { sql += ' AND source = ?'; params.push(segmentSource); }
    if (segmentStatus) { sql += ' AND status = ?'; params.push(segmentStatus); }
    return Number((get<{ c: number }>(sql, params))?.c || 0);
  }

  create(companyId: string, userId: string, body: {
    name: string; type?: string; subject?: string; previewText?: string;
    body?: string; segmentSource?: string; segmentStatus?: string; scheduledAt?: string;
  }) {
    const id = uuid();
    const recipients = this.countRecipients(companyId, body.segmentSource, body.segmentStatus);
    run(`INSERT INTO campaigns
      (id, company_id, created_by, name, type, status, subject, preview_text, body,
       segment_source, segment_status, scheduled_at, recipient_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [id, companyId, userId, body.name, body.type || 'email',
        body.subject || null, body.previewText || null, body.body || null,
        body.segmentSource || null, body.segmentStatus || null,
        body.scheduledAt || null, recipients]);
    return this.findById(id, companyId);
  }

  update(id: string, companyId: string, body: {
    name?: string; subject?: string; previewText?: string; body?: string;
    segmentSource?: string; segmentStatus?: string; scheduledAt?: string;
  }) {
    const existing = get('SELECT id FROM campaigns WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!existing) throw new Error('Campaña no encontrada');
    const recipients = this.countRecipients(companyId, body.segmentSource, body.segmentStatus);
    run(`UPDATE campaigns SET
      name = COALESCE(?, name),
      subject = COALESCE(?, subject),
      preview_text = COALESCE(?, preview_text),
      body = COALESCE(?, body),
      segment_source = ?,
      segment_status = ?,
      scheduled_at = COALESCE(?, scheduled_at),
      recipient_count = ?,
      updated_at = datetime('now')
      WHERE id = ? AND company_id = ?`,
      [body.name || null, body.subject || null, body.previewText || null,
        body.body || null, body.segmentSource || null, body.segmentStatus || null,
        body.scheduledAt || null, recipients, id, companyId]);
    return this.findById(id, companyId);
  }

  send(id: string, companyId: string) {
    const campaign = get<{ id: string; status: string; segment_source: string; segment_status: string }>(
      'SELECT id, status, segment_source, segment_status FROM campaigns WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!campaign) throw new Error('Campaña no encontrada');
    if (campaign.status === 'sent') throw new Error('La campaña ya fue enviada');

    // Simulate sending: count leads with emails matching segment
    const recipients = this.countRecipients(companyId, campaign.segment_source, campaign.segment_status);
    const openSim = Math.round(recipients * (0.35 + Math.random() * 0.2));
    const clickSim = Math.round(openSim * (0.2 + Math.random() * 0.15));

    run(`UPDATE campaigns SET
      status = 'sent', sent_at = datetime('now'),
      recipient_count = ?, sent_count = ?, open_count = ?, click_count = ?,
      updated_at = datetime('now')
      WHERE id = ? AND company_id = ?`,
      [recipients, recipients, openSim, clickSim, id, companyId]);

    return this.findById(id, companyId);
  }

  duplicate(id: string, companyId: string, userId: string) {
    const original = get<CampaignRow>('SELECT * FROM campaigns WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!original) throw new Error('Campaña no encontrada');
    const newId = uuid();
    run(`INSERT INTO campaigns
      (id, company_id, created_by, name, type, status, subject, preview_text, body,
       segment_source, segment_status, recipient_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [newId, companyId, userId, `${original.name} (copia)`, original.type,
        original.subject, original.preview_text, original.body,
        original.segment_source, original.segment_status, original.recipient_count]);
    return this.findById(newId, companyId);
  }

  delete(id: string, companyId: string) {
    const existing = get('SELECT id FROM campaigns WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!existing) throw new Error('Campaña no encontrada');
    run('DELETE FROM campaigns WHERE id = ? AND company_id = ?', [id, companyId]);
  }
}
