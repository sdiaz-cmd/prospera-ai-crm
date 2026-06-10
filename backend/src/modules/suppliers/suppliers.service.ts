import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';
import { buildPaginationMeta } from '../../utils/response';

export class SuppliersService {
  async findAll(companyId: string, params: { page?: number; limit?: number; search?: string }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: string[] = ['s.company_id = ?'];
    const values: unknown[] = [companyId];
    if (params.search) {
      conditions.push('(s.name LIKE ? OR s.contact_name LIKE ? OR s.email LIKE ?)');
      const q = `%${params.search}%`;
      values.push(q, q, q);
    }
    const where = conditions.join(' AND ');
    const sql = `
      SELECT s.*,
        (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.id) as product_count
      FROM suppliers s WHERE ${where}
      ORDER BY s.name ASC LIMIT ? OFFSET ?`;
    const suppliers = all<Record<string, unknown>>(sql, [...values, limit, offset]);
    const total = Number(get<{ c: number }>(`SELECT COUNT(*) as c FROM suppliers s WHERE ${where}`, values)?.c || 0);
    return { suppliers: suppliers.map(this.format), meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string, companyId: string) {
    const row = get<Record<string, unknown>>('SELECT * FROM suppliers WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!row) throw new Error('Proveedor no encontrado');
    const products = all<Record<string, unknown>>('SELECT id, sku, name, sale_price, stock FROM products WHERE supplier_id = ? AND is_active = 1', [id]);
    return { ...this.format(row), products };
  }

  async create(companyId: string, data: Record<string, unknown>) {
    const id = uuid();
    run(`INSERT INTO suppliers (id, company_id, name, contact_name, email, phone, website, address, city, country, tax_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, data.name, data.contactName || null, data.email || null, data.phone || null,
        data.website || null, data.address || null, data.city || null, data.country || null,
        data.taxId || null, data.notes || null]);
    return this.findById(id, companyId);
  }

  async update(id: string, companyId: string, data: Record<string, unknown>) {
    this.assertExists(id, companyId);
    const map: Record<string, string> = {
      name: 'name', contactName: 'contact_name', email: 'email', phone: 'phone',
      website: 'website', address: 'address', city: 'city', country: 'country',
      taxId: 'tax_id', notes: 'notes', isActive: 'is_active',
    };
    const sets: string[] = []; const vals: unknown[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (data[k] !== undefined) { sets.push(`${col} = ?`); vals.push(data[k]); }
    }
    if (sets.length > 0) { vals.push(new Date().toISOString(), id); run(`UPDATE suppliers SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, vals); }
    return this.findById(id, companyId);
  }

  async delete(id: string, companyId: string) {
    this.assertExists(id, companyId);
    run('DELETE FROM suppliers WHERE id = ? AND company_id = ?', [id, companyId]);
  }

  private assertExists(id: string, companyId: string) {
    if (!get('SELECT id FROM suppliers WHERE id = ? AND company_id = ?', [id, companyId])) throw new Error('Proveedor no encontrado');
  }

  private format(s: Record<string, unknown>) {
    return {
      id: s.id, name: s.name, contactName: s.contact_name, email: s.email, phone: s.phone,
      website: s.website, address: s.address, city: s.city, country: s.country,
      taxId: s.tax_id, notes: s.notes, isActive: !!s.is_active,
      productCount: Number(s.product_count || 0),
      createdAt: s.created_at, updatedAt: s.updated_at,
    };
  }
}
