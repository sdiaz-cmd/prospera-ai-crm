import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';
import { buildPaginationMeta } from '../../utils/response';

export class ActivitiesService {
  async findAll(companyId: string, params: {
    page?: number; limit?: number; type?: string;
    leadId?: string; contactId?: string; opportunityId?: string; ownerId?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 30, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['a.company_id = ?'];
    const values: unknown[] = [companyId];

    if (params.type) { conditions.push('a.type = ?'); values.push(params.type); }
    if (params.leadId) { conditions.push('a.lead_id = ?'); values.push(params.leadId); }
    if (params.contactId) { conditions.push('a.contact_id = ?'); values.push(params.contactId); }
    if (params.opportunityId) { conditions.push('a.opportunity_id = ?'); values.push(params.opportunityId); }
    if (params.ownerId) { conditions.push('a.owner_id = ?'); values.push(params.ownerId); }

    const where = conditions.join(' AND ');
    const sql = `
      SELECT a.*, u.first_name as owner_first, u.last_name as owner_last
      FROM activities a
      JOIN users u ON a.owner_id = u.id
      WHERE ${where}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const countSql = `SELECT COUNT(*) as c FROM activities a WHERE ${where}`;

    const activities = all<Record<string, unknown>>(sql, [...values, limit, offset]);
    const totalRow = get<{ c: number }>(countSql, values);

    return {
      activities: activities.map(this.format),
      meta: buildPaginationMeta(Number(totalRow?.c || 0), page, limit),
    };
  }

  async findById(id: string, companyId: string) {
    const row = get<Record<string, unknown>>(`
      SELECT a.*, u.first_name as owner_first, u.last_name as owner_last
      FROM activities a JOIN users u ON a.owner_id = u.id
      WHERE a.id = ? AND a.company_id = ?
    `, [id, companyId]);
    if (!row) throw new Error('Actividad no encontrada');
    return this.format(row);
  }

  async create(companyId: string, ownerId: string, data: Record<string, unknown>) {
    const id = uuid();
    run(`INSERT INTO activities (id, company_id, owner_id, lead_id, contact_id, opportunity_id, type, subject, body, outcome, scheduled_at, completed_at, duration_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, ownerId,
        data.leadId || null, data.contactId || null, data.opportunityId || null,
        data.type || 'note', data.subject || null, data.body || null,
        data.outcome || null, data.scheduledAt || null,
        data.completedAt || null, data.durationMinutes || null]);
    return this.findById(id, companyId);
  }

  async update(id: string, companyId: string, data: Record<string, unknown>) {
    this.assertExists(id, companyId);
    const dataMap: Record<string, string> = {
      type: 'type', subject: 'subject', body: 'body', outcome: 'outcome',
      scheduledAt: 'scheduled_at', completedAt: 'completed_at',
      durationMinutes: 'duration_minutes',
    };
    const setClauses: string[] = [];
    const values: unknown[] = [];
    for (const [key, col] of Object.entries(dataMap)) {
      if (data[key] !== undefined) { setClauses.push(`${col} = ?`); values.push(data[key]); }
    }
    if (setClauses.length === 0) return this.findById(id, companyId);
    values.push(id);
    run(`UPDATE activities SET ${setClauses.join(', ')} WHERE id = ?`, values);
    return this.findById(id, companyId);
  }

  async delete(id: string, companyId: string) {
    this.assertExists(id, companyId);
    run('DELETE FROM activities WHERE id = ? AND company_id = ?', [id, companyId]);
  }

  private assertExists(id: string, companyId: string) {
    if (!get('SELECT id FROM activities WHERE id = ? AND company_id = ?', [id, companyId]))
      throw new Error('Actividad no encontrada');
  }

  private format(a: Record<string, unknown>) {
    return {
      id: a.id, type: a.type, subject: a.subject, body: a.body, outcome: a.outcome,
      scheduledAt: a.scheduled_at, completedAt: a.completed_at,
      durationMinutes: a.duration_minutes,
      leadId: a.lead_id, contactId: a.contact_id, opportunityId: a.opportunity_id,
      createdAt: a.created_at,
      owner: { id: a.owner_id, firstName: a.owner_first, lastName: a.owner_last },
    };
  }
}
