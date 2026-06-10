import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';
import { buildPaginationMeta } from '../../utils/response';

interface InvItem { description: string; quantity: number; unitPrice: number; discount?: number; productId?: string; sortOrder?: number; }

function calcTotals(items: InvItem[], discType: string, discVal: number, taxRate: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice * (1 - (i.discount || 0) / 100), 0);
  const discAmt = discType === 'fixed' ? discVal : subtotal * discVal / 100;
  const taxable = subtotal - discAmt;
  return { subtotal, taxAmount: taxable * taxRate / 100, total: taxable + taxable * taxRate / 100 };
}

function nextNumber(companyId: string) {
  const r = get<{ c: number }>('SELECT COUNT(*) as c FROM invoices WHERE company_id = ?', [companyId]);
  return `INV-${String(Number(r?.c || 0) + 1).padStart(4, '0')}`;
}

export class InvoicesService {
  async findAll(companyId: string, params: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conds: string[] = ['i.company_id = ?']; const vals: unknown[] = [companyId];
    if (params.search) { conds.push('(i.number LIKE ? OR a.name LIKE ?)'); const q = `%${params.search}%`; vals.push(q, q); }
    if (params.status) { conds.push('i.status = ?'); vals.push(params.status); }
    const where = conds.join(' AND ');
    const sql = `SELECT i.*, a.name as account_name, u.first_name as assignee_first, u.last_name as assignee_last,
      (SELECT COUNT(*) FROM invoice_items ii WHERE ii.invoice_id = i.id) as item_count
      FROM invoices i LEFT JOIN accounts a ON i.account_id = a.id LEFT JOIN users u ON i.assignee_id = u.id
      WHERE ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`;
    const invoices = all<Record<string, unknown>>(sql, [...vals, limit, offset]);
    const total = Number(get<{ c: number }>(`SELECT COUNT(*) as c FROM invoices i LEFT JOIN accounts a ON i.account_id = a.id WHERE ${where}`, vals)?.c || 0);
    return { invoices: invoices.map(this.format), meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string, companyId: string) {
    const row = get<Record<string, unknown>>(`SELECT i.*, a.name as account_name, u.first_name as assignee_first, u.last_name as assignee_last, u.email as assignee_email
      FROM invoices i LEFT JOIN accounts a ON i.account_id = a.id LEFT JOIN users u ON i.assignee_id = u.id
      WHERE i.id = ? AND i.company_id = ?`, [id, companyId]);
    if (!row) throw new Error('Factura no encontrada');
    const items = all<Record<string, unknown>>('SELECT ii.*, p.name as product_name FROM invoice_items ii LEFT JOIN products p ON ii.product_id = p.id WHERE ii.invoice_id = ? ORDER BY ii.sort_order', [id]);
    return { ...this.format(row), items: items.map(this.formatItem) };
  }

  async create(companyId: string, data: Record<string, unknown>) {
    const id = uuid();
    const number = nextNumber(companyId);
    const items: InvItem[] = (data.items as InvItem[]) || [];
    const discType = (data.discountType as string) || 'percent';
    const discVal = Number(data.discountValue || 0);
    const taxRate = Number(data.taxRate ?? 16);
    const { subtotal, taxAmount, total } = calcTotals(items, discType, discVal, taxRate);
    run(`INSERT INTO invoices (id, company_id, contact_id, account_id, opportunity_id, quote_id, assignee_id, number, status, subtotal, discount_type, discount_value, tax_rate, tax_amount, total, currency, issue_date, due_date, notes, terms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, data.contactId || null, data.accountId || null, data.opportunityId || null,
        data.quoteId || null, data.assigneeId || null, number, data.status || 'draft',
        subtotal, discType, discVal, taxRate, taxAmount, total, data.currency || 'MXN',
        data.issueDate || new Date().toISOString(), data.dueDate || null, data.notes || null, data.terms || null]);
    this.upsertItems(id, items);
    return this.findById(id, companyId);
  }

  async update(id: string, companyId: string, data: Record<string, unknown>) {
    this.assertExists(id, companyId);
    const items = data.items as InvItem[] | undefined;
    const map: Record<string, string> = {
      status: 'status', discountType: 'discount_type', discountValue: 'discount_value',
      taxRate: 'tax_rate', currency: 'currency', issueDate: 'issue_date', dueDate: 'due_date',
      notes: 'notes', terms: 'terms', accountId: 'account_id', assigneeId: 'assignee_id',
    };
    const sets: string[] = []; const vals: unknown[] = [];
    for (const [k, col] of Object.entries(map)) { if (data[k] !== undefined) { sets.push(`${col} = ?`); vals.push(data[k]); } }
    if (items) {
      const discType = (data.discountType as string) || 'percent';
      const { subtotal, taxAmount, total } = calcTotals(items, discType, Number(data.discountValue || 0), Number(data.taxRate ?? 16));
      sets.push('subtotal = ?', 'tax_amount = ?', 'total = ?'); vals.push(subtotal, taxAmount, total);
      this.upsertItems(id, items);
    }
    if (sets.length > 0) { vals.push(new Date().toISOString(), id); run(`UPDATE invoices SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, vals); }
    return this.findById(id, companyId);
  }

  async changeStatus(id: string, companyId: string, status: string) {
    this.assertExists(id, companyId);
    const now = new Date().toISOString();
    const extra: string[] = []; const vals: unknown[] = [];
    if (status === 'paid') { extra.push('paid_at = ?'); vals.push(now); }
    run(`UPDATE invoices SET status = ?, ${extra.length ? extra.join(', ') + ', ' : ''}updated_at = ? WHERE id = ?`, [status, ...vals, now, id]);
    return this.findById(id, companyId);
  }

  async delete(id: string, companyId: string) {
    this.assertExists(id, companyId);
    run('DELETE FROM invoices WHERE id = ? AND company_id = ?', [id, companyId]);
  }

  async getStats(companyId: string) {
    const statuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
    const stats: Record<string, { count: number; total: number }> = {};
    for (const s of statuses) {
      const r = get<{ c: number; t: number }>('SELECT COUNT(*) as c, COALESCE(SUM(total),0) as t FROM invoices WHERE company_id = ? AND status = ?', [companyId, s]);
      stats[s] = { count: Number(r?.c || 0), total: Number(r?.t || 0) };
    }
    const totalPaid = Number(get<{ t: number }>('SELECT COALESCE(SUM(total),0) as t FROM invoices WHERE company_id = ? AND status = ?', [companyId, 'paid'])?.t || 0);
    return { ...stats, totalPaid };
  }

  private upsertItems(invoiceId: string, items: InvItem[]) {
    run('DELETE FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
    items.forEach((item, i) => {
      const lineTotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
      run('INSERT INTO invoice_items (id, invoice_id, product_id, description, quantity, unit_price, discount, total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [uuid(), invoiceId, item.productId || null, item.description, item.quantity, item.unitPrice, item.discount || 0, lineTotal, i + 1]);
    });
  }

  private assertExists(id: string, companyId: string) {
    if (!get('SELECT id FROM invoices WHERE id = ? AND company_id = ?', [id, companyId])) throw new Error('Factura no encontrada');
  }

  private format(i: Record<string, unknown>) {
    return {
      id: i.id, number: i.number, status: i.status,
      subtotal: i.subtotal, discountType: i.discount_type, discountValue: i.discount_value,
      taxRate: i.tax_rate, taxAmount: i.tax_amount, total: i.total, currency: i.currency,
      issueDate: i.issue_date, dueDate: i.due_date, paidAt: i.paid_at,
      notes: i.notes, terms: i.terms, itemCount: Number(i.item_count || 0),
      accountId: i.account_id, accountName: i.account_name,
      opportunityId: i.opportunity_id, quoteId: i.quote_id,
      createdAt: i.created_at, updatedAt: i.updated_at,
      assignee: i.assignee_id ? { id: i.assignee_id, firstName: i.assignee_first, lastName: i.assignee_last } : null,
    };
  }

  private formatItem(i: Record<string, unknown>) {
    return { id: i.id, productId: i.product_id, productName: i.product_name, description: i.description, quantity: i.quantity, unitPrice: i.unit_price, discount: i.discount, total: i.total };
  }
}
