import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';
import { buildPaginationMeta } from '../../utils/response';

export class OpportunitiesService {
  async findAll(companyId: string, params: {
    page?: number; limit?: number; search?: string;
    stageId?: string; assigneeId?: string; accountId?: string;
    minAmount?: number; maxAmount?: number;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 200);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['o.company_id = ?'];
    const values: unknown[] = [companyId];

    if (params.search) {
      conditions.push('(o.name LIKE ? OR a.name LIKE ?)');
      const s = `%${params.search}%`;
      values.push(s, s);
    }
    if (params.stageId) { conditions.push('o.stage_id = ?'); values.push(params.stageId); }
    if (params.assigneeId) { conditions.push('o.assignee_id = ?'); values.push(params.assigneeId); }
    if (params.accountId) { conditions.push('o.account_id = ?'); values.push(params.accountId); }
    if (params.minAmount) { conditions.push('o.amount >= ?'); values.push(params.minAmount); }
    if (params.maxAmount) { conditions.push('o.amount <= ?'); values.push(params.maxAmount); }

    const where = conditions.join(' AND ');
    const sql = `
      SELECT o.*,
             ps.name as stage_name, ps.order_index as stage_order, ps.color as stage_color,
             u.first_name as assignee_first, u.last_name as assignee_last,
             a.name as account_name
      FROM opportunities o
      LEFT JOIN pipeline_stages ps ON o.stage_id = ps.id
      LEFT JOIN users u ON o.assignee_id = u.id
      LEFT JOIN accounts a ON o.account_id = a.id
      WHERE ${where}
      ORDER BY ps.order_index ASC, o.amount DESC
      LIMIT ? OFFSET ?
    `;
    const countSql = `
      SELECT COUNT(*) as c FROM opportunities o
      LEFT JOIN accounts a ON o.account_id = a.id
      WHERE ${where}
    `;

    const opps = all<Record<string, unknown>>(sql, [...values, limit, offset]);
    const totalRow = get<{ c: number }>(countSql, values);

    return {
      opportunities: opps.map(this.format),
      meta: buildPaginationMeta(Number(totalRow?.c || 0), page, limit),
    };
  }

  async getKanban(companyId: string) {
    // Get pipeline stages for this company
    const pipelineRow = get<{ id: string }>('SELECT id FROM pipelines WHERE company_id = ? LIMIT 1', [companyId]);
    if (!pipelineRow) return { stages: [] };

    const stages = all<Record<string, unknown>>(
      'SELECT * FROM pipeline_stages WHERE pipeline_id = ? ORDER BY order_index ASC',
      [pipelineRow.id]
    );

    const opportunities = all<Record<string, unknown>>(`
      SELECT o.*, u.first_name as assignee_first, u.last_name as assignee_last,
             a.name as account_name, ps.name as stage_name, ps.color as stage_color
      FROM opportunities o
      LEFT JOIN users u ON o.assignee_id = u.id
      LEFT JOIN accounts a ON o.account_id = a.id
      LEFT JOIN pipeline_stages ps ON o.stage_id = ps.id
      WHERE o.company_id = ? AND o.status = 'open'
      ORDER BY o.amount DESC
    `, [companyId]);

    const stagesWithOpps = stages.map(stage => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      order: stage.order_index,
      probability: stage.probability,
      opportunities: opportunities
        .filter(o => o.stage_id === stage.id)
        .map(this.format),
    }));

    const totalValue = opportunities.reduce((sum, o) => sum + Number(o.amount || 0), 0);
    return { stages: stagesWithOpps, totalValue };
  }

  async findById(id: string, companyId: string) {
    const row = get<Record<string, unknown>>(`
      SELECT o.*, ps.name as stage_name, ps.color as stage_color,
             u.first_name as assignee_first, u.last_name as assignee_last, u.email as assignee_email,
             a.name as account_name
      FROM opportunities o
      LEFT JOIN pipeline_stages ps ON o.stage_id = ps.id
      LEFT JOIN users u ON o.assignee_id = u.id
      LEFT JOIN accounts a ON o.account_id = a.id
      WHERE o.id = ? AND o.company_id = ?
    `, [id, companyId]);
    if (!row) throw new Error('Oportunidad no encontrada');

    const activities = all<Record<string, unknown>>(`
      SELECT a.*, u.first_name, u.last_name FROM activities a
      JOIN users u ON a.owner_id = u.id
      WHERE a.opportunity_id = ? ORDER BY a.created_at DESC LIMIT 10
    `, [id]);
    const tasks = all<Record<string, unknown>>(`
      SELECT t.*, u.first_name, u.last_name FROM crm_tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.opportunity_id = ? ORDER BY t.due_date ASC
    `, [id]);

    return { ...this.format(row), activities, tasks };
  }

  async create(companyId: string, data: Record<string, unknown>) {
    const id = uuid();
    // Get default first stage if no stageId provided
    let stageId = data.stageId;
    if (!stageId) {
      const pipeline = get<{ id: string }>('SELECT id FROM pipelines WHERE company_id = ? LIMIT 1', [companyId]);
      if (pipeline) {
        const firstStage = get<{ id: string }>(
          'SELECT id FROM pipeline_stages WHERE pipeline_id = ? ORDER BY order_index ASC LIMIT 1',
          [pipeline.id]
        );
        stageId = firstStage?.id || null;
      }
    }
    run(`INSERT INTO opportunities (id, company_id, account_id, contact_id, assignee_id, stage_id, name, amount, currency, probability, close_date, status, source, notes, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, data.accountId || null, data.contactId || null,
        data.assigneeId || null, stageId || null,
        data.name, data.amount || 0, data.currency || 'USD',
        data.probability || 50, data.closeDate || null,
        data.status || 'open', data.source || null,
        data.notes || null, data.tags ? JSON.stringify(data.tags) : null]);
    return this.findById(id, companyId);
  }

  async update(id: string, companyId: string, data: Record<string, unknown>) {
    this.assertExists(id, companyId);
    const dataMap: Record<string, string> = {
      name: 'name', amount: 'amount', currency: 'currency', probability: 'probability',
      closeDate: 'close_date', status: 'status', source: 'source', notes: 'notes',
      stageId: 'stage_id', accountId: 'account_id', contactId: 'contact_id', assigneeId: 'assignee_id',
    };
    const setClauses: string[] = [];
    const values: unknown[] = [];
    for (const [key, col] of Object.entries(dataMap)) {
      if (data[key] !== undefined) { setClauses.push(`${col} = ?`); values.push(data[key]); }
    }
    if (data.tags !== undefined) { setClauses.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    // Mark won/lost date
    if (data.status === 'won' || data.status === 'lost') {
      setClauses.push('closed_at = ?'); values.push(new Date().toISOString());
    }
    if (setClauses.length === 0) return this.findById(id, companyId);
    values.push(new Date().toISOString(), id);
    run(`UPDATE opportunities SET ${setClauses.join(', ')}, updated_at = ? WHERE id = ?`, values);
    return this.findById(id, companyId);
  }

  async moveStage(id: string, companyId: string, stageId: string) {
    this.assertExists(id, companyId);
    run('UPDATE opportunities SET stage_id = ?, updated_at = ? WHERE id = ?',
      [stageId, new Date().toISOString(), id]);
    return this.findById(id, companyId);
  }

  async delete(id: string, companyId: string) {
    this.assertExists(id, companyId);
    run('DELETE FROM opportunities WHERE id = ? AND company_id = ?', [id, companyId]);
  }

  async getStats(companyId: string) {
    const total = get<{ c: number; v: number }>(
      'SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as v FROM opportunities WHERE company_id = ? AND status = ?',
      [companyId, 'open']
    );
    const won = get<{ c: number; v: number }>(
      'SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as v FROM opportunities WHERE company_id = ? AND status = ?',
      [companyId, 'won']
    );
    const lost = get<{ c: number }>(
      'SELECT COUNT(*) as c FROM opportunities WHERE company_id = ? AND status = ?',
      [companyId, 'lost']
    );
    return {
      open: { count: Number(total?.c || 0), value: Number(total?.v || 0) },
      won: { count: Number(won?.c || 0), value: Number(won?.v || 0) },
      lost: { count: Number(lost?.c || 0) },
    };
  }

  private assertExists(id: string, companyId: string) {
    if (!get('SELECT id FROM opportunities WHERE id = ? AND company_id = ?', [id, companyId]))
      throw new Error('Oportunidad no encontrada');
  }

  private format(o: Record<string, unknown>) {
    return {
      id: o.id, name: o.name, amount: Number(o.amount || 0),
      currency: o.currency, probability: o.probability,
      closeDate: o.close_date, closedAt: o.closed_at,
      status: o.status, source: o.source, notes: o.notes,
      tags: o.tags ? JSON.parse(o.tags as string) : [],
      accountId: o.account_id, accountName: o.account_name || null,
      contactId: o.contact_id,
      stageId: o.stage_id,
      stage: o.stage_id ? { id: o.stage_id, name: o.stage_name, color: o.stage_color } : null,
      createdAt: o.created_at, updatedAt: o.updated_at,
      assignee: o.assignee_id ? {
        id: o.assignee_id, firstName: o.assignee_first,
        lastName: o.assignee_last, email: o.assignee_email,
      } : null,
    };
  }
}
