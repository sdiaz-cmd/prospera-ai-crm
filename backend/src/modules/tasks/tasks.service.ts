import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';
import { buildPaginationMeta } from '../../utils/response';

export class TasksService {
  async findAll(companyId: string, params: {
    page?: number; limit?: number; status?: string; priority?: string;
    assigneeId?: string; leadId?: string; contactId?: string; opportunityId?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 30, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['t.company_id = ?'];
    const values: unknown[] = [companyId];

    if (params.status) { conditions.push('t.status = ?'); values.push(params.status); }
    if (params.priority) { conditions.push('t.priority = ?'); values.push(params.priority); }
    if (params.assigneeId) { conditions.push('t.assignee_id = ?'); values.push(params.assigneeId); }
    if (params.leadId) { conditions.push('t.lead_id = ?'); values.push(params.leadId); }
    if (params.contactId) { conditions.push('t.contact_id = ?'); values.push(params.contactId); }
    if (params.opportunityId) { conditions.push('t.opportunity_id = ?'); values.push(params.opportunityId); }

    const where = conditions.join(' AND ');
    const sql = `
      SELECT t.*, u.first_name as assignee_first, u.last_name as assignee_last
      FROM crm_tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE ${where}
      ORDER BY t.due_date ASC, t.priority DESC
      LIMIT ? OFFSET ?
    `;
    const countSql = `SELECT COUNT(*) as c FROM crm_tasks t WHERE ${where}`;

    const tasks = all<Record<string, unknown>>(sql, [...values, limit, offset]);
    const totalRow = get<{ c: number }>(countSql, values);

    return {
      tasks: tasks.map(this.format),
      meta: buildPaginationMeta(Number(totalRow?.c || 0), page, limit),
    };
  }

  async findById(id: string, companyId: string) {
    const row = get<Record<string, unknown>>(`
      SELECT t.*, u.first_name as assignee_first, u.last_name as assignee_last
      FROM crm_tasks t LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ? AND t.company_id = ?
    `, [id, companyId]);
    if (!row) throw new Error('Tarea no encontrada');
    return this.format(row);
  }

  async create(companyId: string, createdBy: string, data: Record<string, unknown>) {
    const id = uuid();
    run(`INSERT INTO crm_tasks (id, company_id, assignee_id, lead_id, contact_id, opportunity_id, created_by, title, description, status, priority, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, data.assigneeId || createdBy,
        data.leadId || null, data.contactId || null, data.opportunityId || null,
        createdBy, data.title, data.description || null,
        data.status || 'pending', data.priority || 'medium',
        data.dueDate || null]);
    return this.findById(id, companyId);
  }

  async update(id: string, companyId: string, data: Record<string, unknown>) {
    this.assertExists(id, companyId);
    const dataMap: Record<string, string> = {
      title: 'title', description: 'description', status: 'status',
      priority: 'priority', dueDate: 'due_date', assigneeId: 'assignee_id',
    };
    const setClauses: string[] = [];
    const values: unknown[] = [];
    for (const [key, col] of Object.entries(dataMap)) {
      if (data[key] !== undefined) { setClauses.push(`${col} = ?`); values.push(data[key]); }
    }
    if (data.status === 'completed' && data.completedAt === undefined) {
      setClauses.push('completed_at = ?'); values.push(new Date().toISOString());
    }
    if (setClauses.length === 0) return this.findById(id, companyId);
    values.push(new Date().toISOString(), id);
    run(`UPDATE crm_tasks SET ${setClauses.join(', ')}, updated_at = ? WHERE id = ?`, values);
    return this.findById(id, companyId);
  }

  async delete(id: string, companyId: string) {
    this.assertExists(id, companyId);
    run('DELETE FROM crm_tasks WHERE id = ? AND company_id = ?', [id, companyId]);
  }

  private assertExists(id: string, companyId: string) {
    if (!get('SELECT id FROM crm_tasks WHERE id = ? AND company_id = ?', [id, companyId]))
      throw new Error('Tarea no encontrada');
  }

  private format(t: Record<string, unknown>) {
    return {
      id: t.id, title: t.title, description: t.description,
      status: t.status, priority: t.priority, dueDate: t.due_date,
      completedAt: t.completed_at,
      leadId: t.lead_id, contactId: t.contact_id, opportunityId: t.opportunity_id,
      createdAt: t.created_at, updatedAt: t.updated_at,
      assignee: t.assignee_id ? {
        id: t.assignee_id, firstName: t.assignee_first, lastName: t.assignee_last,
      } : null,
    };
  }
}
