import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';
import { buildPaginationMeta } from '../../utils/response';
import { commissionsService } from '../commissions/commissions.service';

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  sortOrder?: number;
}

function calcTotals(items: QuoteItem[], discountType: string, discountValue: number, taxRate: number) {
  const subtotal = items.reduce((sum, i) => {
    const lineDisc = 1 - (i.discount || 0) / 100;
    return sum + i.quantity * i.unitPrice * lineDisc;
  }, 0);
  const discountAmount = discountType === 'fixed' ? discountValue : subtotal * discountValue / 100;
  const taxable = subtotal - discountAmount;
  const taxAmount = taxable * taxRate / 100;
  const total = taxable + taxAmount;
  return { subtotal, taxAmount, total };
}

function nextNumber(companyId: string): string {
  const row = get<{ c: number }>('SELECT COUNT(*) as c FROM quotes WHERE company_id = ?', [companyId]);
  const n = Number(row?.c || 0) + 1;
  return `Q-${String(n).padStart(4, '0')}`;
}

export class QuotesService {
  async findAll(companyId: string, params: {
    page?: number; limit?: number; search?: string; status?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['q.company_id = ?'];
    const values: unknown[] = [companyId];

    if (params.search) {
      conditions.push('(q.title LIKE ? OR q.number LIKE ?)');
      const s = `%${params.search}%`;
      values.push(s, s);
    }
    if (params.status) { conditions.push('q.status = ?'); values.push(params.status); }

    const where = conditions.join(' AND ');
    const sql = `
      SELECT q.*,
        a.name as account_name,
        u.first_name as assignee_first, u.last_name as assignee_last,
        (SELECT COUNT(*) FROM quote_items qi WHERE qi.quote_id = q.id) as item_count
      FROM quotes q
      LEFT JOIN accounts a ON q.account_id = a.id
      LEFT JOIN users u ON q.assignee_id = u.id
      WHERE ${where}
      ORDER BY q.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const countSql = `SELECT COUNT(*) as c FROM quotes q WHERE ${where}`;

    const quotes = all<Record<string, unknown>>(sql, [...values, limit, offset]);
    const totalRow = get<{ c: number }>(countSql, values);

    return {
      quotes: quotes.map(this.format),
      meta: buildPaginationMeta(Number(totalRow?.c || 0), page, limit),
    };
  }

  async findById(id: string, companyId: string) {
    const row = get<Record<string, unknown>>(`
      SELECT q.*,
        a.name as account_name,
        u.first_name as assignee_first, u.last_name as assignee_last, u.email as assignee_email
      FROM quotes q
      LEFT JOIN accounts a ON q.account_id = a.id
      LEFT JOIN users u ON q.assignee_id = u.id
      WHERE q.id = ? AND q.company_id = ?
    `, [id, companyId]);
    if (!row) throw new Error('Cotización no encontrada');

    const items = all<Record<string, unknown>>(
      'SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order',
      [id]
    );

    return {
      ...this.format(row),
      items: items.map(this.formatItem),
    };
  }

  async create(companyId: string, data: Record<string, unknown>) {
    const id = uuid();
    const number = nextNumber(companyId);
    const items: QuoteItem[] = (data.items as QuoteItem[]) || [];
    const discountType = (data.discountType as string) || 'percent';
    const discountValue = Number(data.discountValue || 0);
    const taxRate = Number(data.taxRate || 0);
    const { subtotal, taxAmount, total } = calcTotals(items, discountType, discountValue, taxRate);

    run(`INSERT INTO quotes (id, company_id, opportunity_id, contact_id, account_id, assignee_id,
         number, title, status, subtotal, discount_type, discount_value, tax_rate, tax_amount, total,
         currency, valid_until, notes, terms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, data.opportunityId || null, data.contactId || null,
        data.accountId || null, data.assigneeId || null,
        number, data.title, data.status || 'draft',
        subtotal, discountType, discountValue, taxRate, taxAmount, total,
        data.currency || 'MXN', data.validUntil || null, data.notes || null, data.terms || null]);

    this.upsertItems(id, items);
    return this.findById(id, companyId);
  }

  async update(id: string, companyId: string, data: Record<string, unknown>) {
    this.assertExists(id, companyId);
    const items: QuoteItem[] | undefined = data.items as QuoteItem[] | undefined;
    const discountType = (data.discountType as string) || 'percent';
    const discountValue = Number(data.discountValue || 0);
    const taxRate = Number(data.taxRate || 0);

    const setClauses: string[] = [];
    const values: unknown[] = [];

    const map: Record<string, string> = {
      title: 'title', status: 'status', discountType: 'discount_type',
      discountValue: 'discount_value', taxRate: 'tax_rate', currency: 'currency',
      validUntil: 'valid_until', notes: 'notes', terms: 'terms',
      opportunityId: 'opportunity_id', accountId: 'account_id', assigneeId: 'assignee_id',
    };
    for (const [k, col] of Object.entries(map)) {
      if (data[k] !== undefined) { setClauses.push(`${col} = ?`); values.push(data[k]); }
    }

    if (items) {
      const existingItems = all<Record<string, unknown>>('SELECT * FROM quote_items WHERE quote_id = ?', [id]);
      const existing = existingItems.map(this.formatItem);
      const { subtotal, taxAmount, total } = calcTotals(items, discountType, discountValue, taxRate);
      setClauses.push('subtotal = ?', 'tax_amount = ?', 'total = ?');
      values.push(subtotal, taxAmount, total);
      this.upsertItems(id, items);
      void existing;
    }

    if (setClauses.length > 0) {
      values.push(new Date().toISOString(), id);
      run(`UPDATE quotes SET ${setClauses.join(', ')}, updated_at = ? WHERE id = ?`, values);
    }
    return this.findById(id, companyId);
  }

  async changeStatus(id: string, companyId: string, status: string) {
    this.assertExists(id, companyId);
    const now = new Date().toISOString();
    const extra: string[] = [];
    const vals: unknown[] = [];
    if (status === 'sent') { extra.push('sent_at = ?'); vals.push(now); }
    if (status === 'accepted') { extra.push('accepted_at = ?'); vals.push(now); }
    if (status === 'rejected') { extra.push('rejected_at = ?'); vals.push(now); }
    const sets = [`status = ?`, ...extra, 'updated_at = ?'].join(', ');
    run(`UPDATE quotes SET ${sets} WHERE id = ?`, [status, ...vals, now, id]);

    // Auto-register commission when quote is accepted
    if (status === 'accepted') {
      const quote = get<{ assignee_id: string; total: number; number: string }>(
        'SELECT assignee_id, total, number FROM quotes WHERE id = ?', [id]
      );
      if (quote?.assignee_id && quote.total > 0) {
        try {
          commissionsService.autoRegisterFromQuote(
            companyId, id, quote.assignee_id, quote.total, quote.number
          );
        } catch (_) { /* No bloquear si falla el registro */ }
      }
    }

    return this.findById(id, companyId);
  }

  async delete(id: string, companyId: string) {
    this.assertExists(id, companyId);
    run('DELETE FROM quotes WHERE id = ? AND company_id = ?', [id, companyId]);
  }

  async getStats(companyId: string) {
    const statuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
    const stats: Record<string, { count: number; total: number }> = {};
    for (const s of statuses) {
      const r = get<{ c: number; t: number }>(
        'SELECT COUNT(*) as c, COALESCE(SUM(total), 0) as t FROM quotes WHERE company_id = ? AND status = ?',
        [companyId, s]
      );
      stats[s] = { count: Number(r?.c || 0), total: Number(r?.t || 0) };
    }
    const all_total = get<{ t: number }>('SELECT COALESCE(SUM(total), 0) as t FROM quotes WHERE company_id = ?', [companyId]);
    return { ...stats, totalValue: Number(all_total?.t || 0) };
  }

  private upsertItems(quoteId: string, items: QuoteItem[]) {
    run('DELETE FROM quote_items WHERE quote_id = ?', [quoteId]);
    items.forEach((item, i) => {
      const lineDisc = 1 - (item.discount || 0) / 100;
      const lineTotal = item.quantity * item.unitPrice * lineDisc;
      run('INSERT INTO quote_items (id, quote_id, description, quantity, unit_price, discount, total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [uuid(), quoteId, item.description, item.quantity, item.unitPrice, item.discount || 0, lineTotal, i + 1]);
    });
  }

  private assertExists(id: string, companyId: string) {
    const ex = get('SELECT id FROM quotes WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!ex) throw new Error('Cotización no encontrada');
  }

  private format(q: Record<string, unknown>) {
    return {
      id: q.id, number: q.number, title: q.title, status: q.status,
      subtotal: q.subtotal, discountType: q.discount_type, discountValue: q.discount_value,
      taxRate: q.tax_rate, taxAmount: q.tax_amount, total: q.total,
      currency: q.currency, validUntil: q.valid_until, notes: q.notes, terms: q.terms,
      itemCount: Number(q.item_count || 0),
      accountId: q.account_id, accountName: q.account_name,
      opportunityId: q.opportunity_id, contactId: q.contact_id,
      sentAt: q.sent_at, acceptedAt: q.accepted_at, rejectedAt: q.rejected_at,
      createdAt: q.created_at, updatedAt: q.updated_at,
      assignee: q.assignee_id
        ? { id: q.assignee_id, firstName: q.assignee_first, lastName: q.assignee_last, email: q.assignee_email }
        : null,
    };
  }

  private formatItem(i: Record<string, unknown>) {
    return {
      id: i.id, description: i.description, quantity: i.quantity,
      unitPrice: i.unit_price, discount: i.discount, total: i.total, sortOrder: i.sort_order,
    };
  }
}
