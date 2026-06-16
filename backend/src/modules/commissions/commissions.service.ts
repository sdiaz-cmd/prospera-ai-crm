import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommissionRule {
  id: string; companyId: string; userId: string;
  categoryName: string; percentage: number;
  createdAt: string; updatedAt: string;
  // joined fields
  userName?: string; userEmail?: string;
}

export interface CommissionRecord {
  id: string; companyId: string; userId: string; ruleId: string | null;
  sourceType: 'quote' | 'opportunity' | 'manual';
  sourceId: string | null; sourceDescription: string;
  baseAmount: number; percentage: number; commissionAmount: number;
  status: 'pendiente' | 'pagado';
  notes: string | null; paidAt: string | null; createdAt: string;
  // joined
  userName?: string; userEmail?: string;
}

interface RuleRow {
  id: string; company_id: string; user_id: string;
  category_name: string; percentage: number;
  created_at: string; updated_at: string;
  user_first?: string; user_last?: string; user_email?: string;
}

interface RecordRow {
  id: string; company_id: string; user_id: string; rule_id: string | null;
  source_type: string; source_id: string | null; source_description: string;
  base_amount: number; percentage: number; commission_amount: number;
  status: string; notes: string | null; paid_at: string | null; created_at: string;
  user_first?: string; user_last?: string; user_email?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapRule(r: RuleRow): CommissionRule {
  return {
    id: r.id, companyId: r.company_id, userId: r.user_id,
    categoryName: r.category_name, percentage: r.percentage,
    createdAt: r.created_at, updatedAt: r.updated_at,
    userName: r.user_first ? `${r.user_first} ${r.user_last}`.trim() : undefined,
    userEmail: r.user_email,
  };
}

function mapRecord(r: RecordRow): CommissionRecord {
  return {
    id: r.id, companyId: r.company_id, userId: r.user_id, ruleId: r.rule_id,
    sourceType: r.source_type as CommissionRecord['sourceType'],
    sourceId: r.source_id, sourceDescription: r.source_description,
    baseAmount: r.base_amount, percentage: r.percentage,
    commissionAmount: r.commission_amount,
    status: r.status as CommissionRecord['status'],
    notes: r.notes, paidAt: r.paid_at, createdAt: r.created_at,
    userName: r.user_first ? `${r.user_first} ${r.user_last}`.trim() : undefined,
    userEmail: r.user_email,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class CommissionsService {

  // ── Rules ────────────────────────────────────────────────────────

  getRules(companyId: string, userId?: string): CommissionRule[] {
    const where = userId
      ? 'cr.company_id = ? AND cr.user_id = ?'
      : 'cr.company_id = ?';
    const params = userId ? [companyId, userId] : [companyId];

    const rows = all<RuleRow>(
      `SELECT cr.*, u.first_name as user_first, u.last_name as user_last, u.email as user_email
       FROM commission_rules cr
       JOIN users u ON cr.user_id = u.id
       WHERE ${where}
       ORDER BY u.first_name, cr.category_name`,
      params
    );
    return rows.map(mapRule);
  }

  createRule(data: { companyId: string; userId: string; categoryName: string; percentage: number }): CommissionRule {
    const id = uuid();
    run(
      `INSERT INTO commission_rules (id, company_id, user_id, category_name, percentage)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.companyId, data.userId, data.categoryName, data.percentage]
    );
    const row = get<RuleRow>(
      `SELECT cr.*, u.first_name as user_first, u.last_name as user_last, u.email as user_email
       FROM commission_rules cr JOIN users u ON cr.user_id = u.id WHERE cr.id = ?`, [id]
    );
    return mapRule(row!);
  }

  updateRule(id: string, companyId: string, data: { categoryName?: string; percentage?: number }): CommissionRule | null {
    const sets: string[] = ['updated_at = datetime(\'now\')'];
    const vals: unknown[] = [];
    if (data.categoryName !== undefined) { sets.push('category_name = ?'); vals.push(data.categoryName); }
    if (data.percentage !== undefined)   { sets.push('percentage = ?');    vals.push(data.percentage); }
    vals.push(id, companyId);
    run(`UPDATE commission_rules SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`, vals);
    const row = get<RuleRow>(
      `SELECT cr.*, u.first_name as user_first, u.last_name as user_last, u.email as user_email
       FROM commission_rules cr JOIN users u ON cr.user_id = u.id WHERE cr.id = ?`, [id]
    );
    return row ? mapRule(row) : null;
  }

  deleteRule(id: string, companyId: string): void {
    run('DELETE FROM commission_rules WHERE id = ? AND company_id = ?', [id, companyId]);
  }

  // ── Records ──────────────────────────────────────────────────────

  getRecords(companyId: string, userId?: string, filters: { status?: string } = {}): CommissionRecord[] {
    const conditions: string[] = ['cr.company_id = ?'];
    const vals: unknown[] = [companyId];
    if (userId)         { conditions.push('cr.user_id = ?'); vals.push(userId); }
    if (filters.status) { conditions.push('cr.status = ?');  vals.push(filters.status); }

    const rows = all<RecordRow>(
      `SELECT cr.*, u.first_name as user_first, u.last_name as user_last, u.email as user_email
       FROM commission_records cr
       JOIN users u ON cr.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY cr.created_at DESC`,
      vals
    );
    return rows.map(mapRecord);
  }

  createRecord(data: {
    companyId: string; userId: string; ruleId?: string;
    sourceType: 'quote' | 'opportunity' | 'manual';
    sourceId?: string; sourceDescription: string;
    baseAmount: number; percentage: number; notes?: string;
  }): CommissionRecord {
    const id = uuid();
    const commissionAmount = Math.round(data.baseAmount * (data.percentage / 100) * 100) / 100;
    run(
      `INSERT INTO commission_records
       (id, company_id, user_id, rule_id, source_type, source_id, source_description,
        base_amount, percentage, commission_amount, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
      [id, data.companyId, data.userId, data.ruleId || null, data.sourceType,
       data.sourceId || null, data.sourceDescription,
       data.baseAmount, data.percentage, commissionAmount, data.notes || null]
    );
    const row = get<RecordRow>(
      `SELECT cr.*, u.first_name as user_first, u.last_name as user_last, u.email as user_email
       FROM commission_records cr JOIN users u ON cr.user_id = u.id WHERE cr.id = ?`, [id]
    );
    return mapRecord(row!);
  }

  updateRecordStatus(id: string, companyId: string, status: 'pendiente' | 'pagado'): CommissionRecord | null {
    const paidAt = status === 'pagado' ? `datetime('now')` : 'NULL';
    run(
      `UPDATE commission_records SET status = ?, paid_at = ${paidAt} WHERE id = ? AND company_id = ?`,
      [status, id, companyId]
    );
    const row = get<RecordRow>(
      `SELECT cr.*, u.first_name as user_first, u.last_name as user_last, u.email as user_email
       FROM commission_records cr JOIN users u ON cr.user_id = u.id WHERE cr.id = ?`, [id]
    );
    return row ? mapRecord(row) : null;
  }

  deleteRecord(id: string, companyId: string): void {
    run('DELETE FROM commission_records WHERE id = ? AND company_id = ?', [id, companyId]);
  }

  // ── Summary ──────────────────────────────────────────────────────

  getSummary(companyId: string, userId?: string) {
    const where = userId ? 'company_id = ? AND user_id = ?' : 'company_id = ?';
    const vals = userId ? [companyId, userId] : [companyId];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const total = get<{ pendiente: number; pagado: number }>(
      `SELECT
        COALESCE(SUM(CASE WHEN status='pendiente' THEN commission_amount ELSE 0 END),0) as pendiente,
        COALESCE(SUM(CASE WHEN status='pagado' THEN commission_amount ELSE 0 END),0) as pagado
       FROM commission_records WHERE ${where}`, vals
    );

    const month = get<{ amount: number }>(
      `SELECT COALESCE(SUM(commission_amount),0) as amount
       FROM commission_records WHERE ${where} AND created_at >= ?`,
      [...vals, monthStart]
    );

    const count = get<{ total: number; pendiente: number }>(
      `SELECT COUNT(*) as total,
        SUM(CASE WHEN status='pendiente' THEN 1 ELSE 0 END) as pendiente
       FROM commission_records WHERE ${where}`, vals
    );

    return {
      totalPendiente: total?.pendiente || 0,
      totalPagado:    total?.pagado || 0,
      totalGeneral:   (total?.pendiente || 0) + (total?.pagado || 0),
      esteMes:        month?.amount || 0,
      registros:      count?.total || 0,
      registrosPendientes: count?.pendiente || 0,
    };
  }

  // ── Self-register (executive, locked to rule percentage) ──────────

  selfRegister(data: {
    companyId: string; userId: string; ruleId: string;
    sourceDescription: string; baseAmount: number; notes?: string;
  }): CommissionRecord {
    const rule = get<RuleRow>(
      'SELECT * FROM commission_rules WHERE id = ? AND company_id = ? AND user_id = ?',
      [data.ruleId, data.companyId, data.userId]
    );
    if (!rule) throw new Error('Regla no válida para este usuario');

    return this.createRecord({
      companyId: data.companyId, userId: data.userId, ruleId: data.ruleId,
      sourceType: 'manual', sourceDescription: data.sourceDescription,
      baseAmount: data.baseAmount, percentage: rule.percentage, notes: data.notes,
    });
  }

  // ── Auto-register from quote ──────────────────────────────────────

  autoRegisterFromQuote(companyId: string, quoteId: string, assigneeId: string, total: number, quoteNumber: string): void {
    const rules = this.getRules(companyId, assigneeId);
    if (rules.length === 0) return;

    // Use first rule as default (can be improved later)
    const rule = rules[0];
    this.createRecord({
      companyId, userId: assigneeId, ruleId: rule.id,
      sourceType: 'quote', sourceId: quoteId,
      sourceDescription: `Cotización ${quoteNumber} aceptada`,
      baseAmount: total, percentage: rule.percentage,
    });
  }
}

export const commissionsService = new CommissionsService();
