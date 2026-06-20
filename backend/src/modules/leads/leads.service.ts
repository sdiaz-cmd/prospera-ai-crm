import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';
import { buildPaginationMeta } from '../../utils/response';

export class LeadsService {
  async findAll(companyId: string, params: {
    page?: number; limit?: number; search?: string;
    status?: string; source?: string; assigneeId?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['l.company_id = ?'];
    const values: unknown[] = [companyId];

    if (params.search) {
      conditions.push('(l.first_name LIKE ? OR l.last_name LIKE ? OR l.email LIKE ? OR l.company LIKE ?)');
      const s = `%${params.search}%`;
      values.push(s, s, s, s);
    }
    if (params.status) { conditions.push('l.status = ?'); values.push(params.status); }
    if (params.source) { conditions.push('l.source = ?'); values.push(params.source); }
    if (params.assigneeId) { conditions.push('l.assignee_id = ?'); values.push(params.assigneeId); }

    const where = conditions.join(' AND ');

    const sql = `
      SELECT l.*, u.first_name as assignee_first, u.last_name as assignee_last
      FROM leads l
      LEFT JOIN users u ON l.assignee_id = u.id
      WHERE ${where}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const countSql = `SELECT COUNT(*) as c FROM leads l WHERE ${where}`;

    const leads = all<Record<string, unknown>>(sql, [...values, limit, offset]);
    const totalRow = get<{ c: number }>(countSql, values);
    const total = Number(totalRow?.c || 0);

    return {
      leads: leads.map(this.format),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findById(id: string, companyId: string) {
    const row = get<Record<string, unknown>>(`
      SELECT l.*, u.first_name as assignee_first, u.last_name as assignee_last, u.email as assignee_email
      FROM leads l LEFT JOIN users u ON l.assignee_id = u.id
      WHERE l.id = ? AND l.company_id = ?
    `, [id, companyId]);
    if (!row) throw new Error('Lead no encontrado');

    const activities = all<Record<string, unknown>>(`
      SELECT a.*, u.first_name, u.last_name FROM activities a
      JOIN users u ON a.owner_id = u.id
      WHERE a.lead_id = ? ORDER BY a.created_at DESC LIMIT 10
    `, [id]);
    const tasks = all<Record<string, unknown>>(`
      SELECT t.*, u.first_name, u.last_name FROM crm_tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.lead_id = ? ORDER BY t.due_date ASC
    `, [id]);

    return { ...this.format(row), activities, tasks };
  }

  async create(companyId: string, data: Record<string, unknown>) {
    const id = uuid();
    run(`INSERT INTO leads (id, company_id, assignee_id, first_name, last_name, email, phone, company, position, source, status, score, notes, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, data.assigneeId || null, data.firstName, data.lastName || null,
        data.email || null, data.phone || null, data.company || null, data.position || null,
        data.source || null, data.status || 'new', data.score || 0, data.notes || null,
        data.tags ? JSON.stringify(data.tags) : null]);
    return this.findById(id, companyId);
  }

  async update(id: string, companyId: string, data: Record<string, unknown>) {
    this.assertExists(id, companyId);
    const fields = ['first_name', 'last_name', 'email', 'phone', 'company', 'position',
      'source', 'status', 'score', 'notes', 'assignee_id'];
    const dataMap: Record<string, string> = {
      firstName: 'first_name', lastName: 'last_name', email: 'email', phone: 'phone',
      company: 'company', position: 'position', source: 'source', status: 'status',
      score: 'score', notes: 'notes', assigneeId: 'assignee_id',
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];
    for (const [key, col] of Object.entries(dataMap)) {
      if (data[key] !== undefined) { setClauses.push(`${col} = ?`); values.push(data[key]); }
    }
    if (setClauses.length === 0) return this.findById(id, companyId);
    values.push(new Date().toISOString(), id);
    run(`UPDATE leads SET ${setClauses.join(', ')}, updated_at = ? WHERE id = ?`, values);
    return this.findById(id, companyId);
  }

  async convert(id: string, companyId: string) {
    this.assertExists(id, companyId);
    run('UPDATE leads SET status = ?, converted_at = ? WHERE id = ?', ['converted', new Date().toISOString(), id]);
    return this.findById(id, companyId);
  }

  async delete(id: string, companyId: string) {
    this.assertExists(id, companyId);
    run('DELETE FROM leads WHERE id = ? AND company_id = ?', [id, companyId]);
  }

  async getStats(companyId: string) {
    const statuses = ['new', 'contacted', 'qualified', 'unqualified', 'converted'];
    const stats: Record<string, number> = {};
    for (const s of statuses) {
      const r = get<{ c: number }>('SELECT COUNT(*) as c FROM leads WHERE company_id = ? AND status = ?', [companyId, s]);
      stats[s] = Number(r?.c || 0);
    }
    const total = get<{ c: number }>('SELECT COUNT(*) as c FROM leads WHERE company_id = ?', [companyId]);
    return { ...stats, total: Number(total?.c || 0) };
  }

  private parseCsv(content: string): Record<string, string>[] {
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) return [];

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { inQuotes = !inQuotes; continue; }
        if (line[i] === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
        current += line[i];
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]).map(h => h.toLowerCase().trim());
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = parseRow(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      rows.push(row);
    }
    return rows;
  }

  async importBulk(companyId: string, csvContent: string, assigneeId?: string): Promise<{ imported: number; duplicates: number; errors: { row: number; message: string }[] }> {
    const rows = this.parseCsv(csvContent);

    const map = (row: Record<string, string>, ...keys: string[]): string => {
      for (const k of keys) { if (row[k] !== undefined && row[k] !== '') return row[k]; }
      return '';
    };

    const validStatuses = ['new', 'contacted', 'qualified', 'unqualified', 'converted'];

    let imported = 0, duplicates = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const firstName = map(row, 'nombre', 'firstname', 'first_name', 'nombre*');
      if (!firstName) { errors.push({ row: rowNum, message: 'Nombre requerido' }); continue; }

      const email = map(row, 'email', 'correo', 'e-mail');

      if (email) {
        const existing = get('SELECT id FROM leads WHERE email = ? AND company_id = ?', [email, companyId]);
        if (existing) { duplicates++; continue; }
      }

      try {
        const id = uuid();
        const rawStatus = map(row, 'estado', 'status');
        const status = validStatuses.includes(rawStatus) ? rawStatus : 'new';
        const rawScore = map(row, 'puntuacion', 'puntuación', 'score');
        const score = rawScore ? Math.min(100, Math.max(0, Number(rawScore) || 0)) : 0;

        run(`INSERT INTO leads (id, company_id, assignee_id, first_name, last_name, email, phone, company, position, source, status, score, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, companyId, assigneeId || null, firstName,
            map(row, 'apellido', 'lastname', 'last_name') || null,
            email || null,
            map(row, 'telefono', 'teléfono', 'phone', 'tel') || null,
            map(row, 'empresa', 'company', 'organization') || null,
            map(row, 'cargo', 'position', 'puesto') || null,
            map(row, 'fuente', 'source', 'origen') || 'other',
            status,
            score,
            map(row, 'notas', 'notes', 'nota') || null,
          ]);
        imported++;
      } catch (e) {
        errors.push({ row: rowNum, message: (e as Error).message });
      }
    }

    return { imported, duplicates, errors };
  }

  exportCsv(companyId: string): string {
    const leads = all<Record<string, unknown>>(`
      SELECT l.first_name, l.last_name, l.email, l.phone, l.company,
             l.position, l.source, l.status, l.score, l.notes,
             u.first_name as assignee_first, u.last_name as assignee_last
      FROM leads l
      LEFT JOIN users u ON l.assignee_id = u.id
      WHERE l.company_id = ?
      ORDER BY l.created_at DESC
    `, [companyId]);

    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const header = 'nombre,apellido,email,telefono,empresa,cargo,fuente,estado,puntuacion,notas,ejecutivo';
    const rows = leads.map(l =>
      [l.first_name, l.last_name, l.email, l.phone, l.company,
       l.position, l.source, l.status, l.score, l.notes,
       l.assignee_first ? `${l.assignee_first} ${l.assignee_last}` : '']
      .map(esc).join(',')
    );

    return [header, ...rows].join('\n');
  }

  private assertExists(id: string, companyId: string) {
    const ex = get('SELECT id FROM leads WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!ex) throw new Error('Lead no encontrado');
  }

  private format(l: Record<string, unknown>) {
    return {
      id: l.id, firstName: l.first_name, lastName: l.last_name,
      email: l.email, phone: l.phone, company: l.company, position: l.position,
      source: l.source, status: l.status, score: l.score, notes: l.notes,
      tags: l.tags ? JSON.parse(l.tags as string) : [],
      convertedAt: l.converted_at, createdAt: l.created_at, updatedAt: l.updated_at,
      assignee: l.assignee_id ? { id: l.assignee_id, firstName: l.assignee_first, lastName: l.assignee_last, email: l.assignee_email } : null,
    };
  }
}
