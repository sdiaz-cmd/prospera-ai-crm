import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';
import { buildPaginationMeta } from '../../utils/response';

export class ContactsService {
  async findAll(companyId: string, params: {
    page?: number; limit?: number; search?: string; accountId?: string; assigneeId?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['c.company_id = ?'];
    const values: unknown[] = [companyId];

    if (params.search) {
      conditions.push('(c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.account_name LIKE ?)');
      const s = `%${params.search}%`;
      values.push(s, s, s, s);
    }
    if (params.accountId) { conditions.push('c.account_id = ?'); values.push(params.accountId); }
    if (params.assigneeId) { conditions.push('c.assignee_id = ?'); values.push(params.assigneeId); }

    const where = conditions.join(' AND ');
    const sql = `
      SELECT c.*, u.first_name as assignee_first, u.last_name as assignee_last,
             a.name as account_name_ref
      FROM contacts c
      LEFT JOIN users u ON c.assignee_id = u.id
      LEFT JOIN accounts a ON c.account_id = a.id
      WHERE ${where}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const countSql = `SELECT COUNT(*) as c FROM contacts c WHERE ${where}`;

    const contacts = all<Record<string, unknown>>(sql, [...values, limit, offset]);
    const totalRow = get<{ c: number }>(countSql, values);
    const total = Number(totalRow?.c || 0);

    return {
      contacts: contacts.map(this.format),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findById(id: string, companyId: string) {
    const row = get<Record<string, unknown>>(`
      SELECT c.*, u.first_name as assignee_first, u.last_name as assignee_last,
             u.email as assignee_email, a.name as account_name_ref
      FROM contacts c
      LEFT JOIN users u ON c.assignee_id = u.id
      LEFT JOIN accounts a ON c.account_id = a.id
      WHERE c.id = ? AND c.company_id = ?
    `, [id, companyId]);
    if (!row) throw new Error('Contacto no encontrado');

    const activities = all<Record<string, unknown>>(`
      SELECT a.*, u.first_name, u.last_name FROM activities a
      JOIN users u ON a.owner_id = u.id
      WHERE a.contact_id = ? ORDER BY a.created_at DESC LIMIT 10
    `, [id]);

    return { ...this.format(row), activities };
  }

  async create(companyId: string, data: Record<string, unknown>) {
    const id = uuid();
    run(`INSERT INTO contacts (id, company_id, account_id, assignee_id, first_name, last_name, email, phone, mobile, position, department, source, status, lead_score, notes, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, data.accountId || null, data.assigneeId || null,
        data.firstName, data.lastName || null, data.email || null,
        data.phone || null, data.mobile || null, data.position || null,
        data.department || null, data.source || null, data.status || 'active',
        data.leadScore || 0, data.notes || null,
        data.tags ? JSON.stringify(data.tags) : null]);
    return this.findById(id, companyId);
  }

  async update(id: string, companyId: string, data: Record<string, unknown>) {
    this.assertExists(id, companyId);
    const dataMap: Record<string, string> = {
      firstName: 'first_name', lastName: 'last_name', email: 'email', phone: 'phone',
      mobile: 'mobile', position: 'position', department: 'department',
      source: 'source', status: 'status', leadScore: 'lead_score',
      notes: 'notes', accountId: 'account_id', assigneeId: 'assignee_id',
    };
    const setClauses: string[] = [];
    const values: unknown[] = [];
    for (const [key, col] of Object.entries(dataMap)) {
      if (data[key] !== undefined) { setClauses.push(`${col} = ?`); values.push(data[key]); }
    }
    if (data.tags !== undefined) { setClauses.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (setClauses.length === 0) return this.findById(id, companyId);
    values.push(new Date().toISOString(), id);
    run(`UPDATE contacts SET ${setClauses.join(', ')}, updated_at = ? WHERE id = ?`, values);
    return this.findById(id, companyId);
  }

  async delete(id: string, companyId: string) {
    this.assertExists(id, companyId);
    run('DELETE FROM contacts WHERE id = ? AND company_id = ?', [id, companyId]);
  }

  private assertExists(id: string, companyId: string) {
    const ex = get('SELECT id FROM contacts WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!ex) throw new Error('Contacto no encontrado');
  }

  private format(c: Record<string, unknown>) {
    return {
      id: c.id, firstName: c.first_name, lastName: c.last_name,
      email: c.email, phone: c.phone, mobile: c.mobile,
      position: c.position, department: c.department,
      source: c.source, status: c.status, leadScore: c.lead_score,
      notes: c.notes,
      tags: c.tags ? JSON.parse(c.tags as string) : [],
      accountId: c.account_id,
      accountName: c.account_name_ref || null,
      createdAt: c.created_at, updatedAt: c.updated_at,
      assignee: c.assignee_id ? {
        id: c.assignee_id, firstName: c.assignee_first,
        lastName: c.assignee_last, email: c.assignee_email,
      } : null,
    };
  }
}
