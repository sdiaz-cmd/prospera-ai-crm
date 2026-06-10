import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';
import { buildPaginationMeta } from '../../utils/response';

export class AccountsService {
  async findAll(companyId: string, params: {
    page?: number; limit?: number; search?: string; industry?: string; assigneeId?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['a.company_id = ?'];
    const values: unknown[] = [companyId];

    if (params.search) {
      conditions.push('(a.name LIKE ? OR a.email LIKE ? OR a.website LIKE ?)');
      const s = `%${params.search}%`;
      values.push(s, s, s);
    }
    if (params.industry) { conditions.push('a.industry = ?'); values.push(params.industry); }
    if (params.assigneeId) { conditions.push('a.assignee_id = ?'); values.push(params.assigneeId); }

    const where = conditions.join(' AND ');
    const sql = `
      SELECT a.*, u.first_name as assignee_first, u.last_name as assignee_last,
             (SELECT COUNT(*) FROM contacts c WHERE c.account_id = a.id) as contact_count,
             (SELECT COUNT(*) FROM opportunities o WHERE o.account_id = a.id) as opp_count
      FROM accounts a
      LEFT JOIN users u ON a.assignee_id = u.id
      WHERE ${where}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const countSql = `SELECT COUNT(*) as c FROM accounts a WHERE ${where}`;

    const accounts = all<Record<string, unknown>>(sql, [...values, limit, offset]);
    const totalRow = get<{ c: number }>(countSql, values);

    return {
      accounts: accounts.map(this.format),
      meta: buildPaginationMeta(Number(totalRow?.c || 0), page, limit),
    };
  }

  async findById(id: string, companyId: string) {
    const row = get<Record<string, unknown>>(`
      SELECT a.*, u.first_name as assignee_first, u.last_name as assignee_last, u.email as assignee_email
      FROM accounts a LEFT JOIN users u ON a.assignee_id = u.id
      WHERE a.id = ? AND a.company_id = ?
    `, [id, companyId]);
    if (!row) throw new Error('Cuenta no encontrada');

    const contacts = all<Record<string, unknown>>(
      'SELECT id, first_name, last_name, email, position FROM contacts WHERE account_id = ? LIMIT 20',
      [id]
    );
    const opportunities = all<Record<string, unknown>>(
      'SELECT id, name, amount, stage, close_date FROM opportunities WHERE account_id = ? ORDER BY created_at DESC LIMIT 10',
      [id]
    );

    return { ...this.format(row), contacts, opportunities };
  }

  async create(companyId: string, data: Record<string, unknown>) {
    const id = uuid();
    run(`INSERT INTO accounts (id, company_id, assignee_id, name, email, phone, website, industry, company_size, annual_revenue, country, city, address, notes, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, data.assigneeId || null, data.name,
        data.email || null, data.phone || null, data.website || null,
        data.industry || null, data.companySize || null,
        data.annualRevenue || null, data.country || null,
        data.city || null, data.address || null, data.notes || null,
        data.tags ? JSON.stringify(data.tags) : null]);
    return this.findById(id, companyId);
  }

  async update(id: string, companyId: string, data: Record<string, unknown>) {
    this.assertExists(id, companyId);
    const dataMap: Record<string, string> = {
      name: 'name', email: 'email', phone: 'phone', website: 'website',
      industry: 'industry', companySize: 'company_size', annualRevenue: 'annual_revenue',
      country: 'country', city: 'city', address: 'address',
      notes: 'notes', assigneeId: 'assignee_id',
    };
    const setClauses: string[] = [];
    const values: unknown[] = [];
    for (const [key, col] of Object.entries(dataMap)) {
      if (data[key] !== undefined) { setClauses.push(`${col} = ?`); values.push(data[key]); }
    }
    if (data.tags !== undefined) { setClauses.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (setClauses.length === 0) return this.findById(id, companyId);
    values.push(new Date().toISOString(), id);
    run(`UPDATE accounts SET ${setClauses.join(', ')}, updated_at = ? WHERE id = ?`, values);
    return this.findById(id, companyId);
  }

  async delete(id: string, companyId: string) {
    this.assertExists(id, companyId);
    run('DELETE FROM accounts WHERE id = ? AND company_id = ?', [id, companyId]);
  }

  private assertExists(id: string, companyId: string) {
    if (!get('SELECT id FROM accounts WHERE id = ? AND company_id = ?', [id, companyId]))
      throw new Error('Cuenta no encontrada');
  }

  private format(a: Record<string, unknown>) {
    return {
      id: a.id, name: a.name, email: a.email, phone: a.phone, website: a.website,
      industry: a.industry, companySize: a.company_size, annualRevenue: a.annual_revenue,
      country: a.country, city: a.city, address: a.address, notes: a.notes,
      tags: a.tags ? JSON.parse(a.tags as string) : [],
      contactCount: Number(a.contact_count || 0),
      oppCount: Number(a.opp_count || 0),
      createdAt: a.created_at, updatedAt: a.updated_at,
      assignee: a.assignee_id ? {
        id: a.assignee_id, firstName: a.assignee_first,
        lastName: a.assignee_last, email: a.assignee_email,
      } : null,
    };
  }
}
