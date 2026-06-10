import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';
import { buildPaginationMeta } from '../../utils/response';

export class ProductsService {
  async findAll(companyId: string, params: { page?: number; limit?: number; search?: string; category?: string; lowStock?: boolean }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: string[] = ['p.company_id = ?'];
    const values: unknown[] = [companyId];
    if (params.search) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)');
      const q = `%${params.search}%`;
      values.push(q, q, q);
    }
    if (params.category) { conditions.push('p.category = ?'); values.push(params.category); }
    if (params.lowStock) { conditions.push('p.track_inventory = 1 AND p.stock <= p.min_stock'); }
    const where = conditions.join(' AND ');
    const sql = `
      SELECT p.*, s.name as supplier_name
      FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE ${where} ORDER BY p.name ASC LIMIT ? OFFSET ?`;
    const products = all<Record<string, unknown>>(sql, [...values, limit, offset]);
    const total = Number(get<{ c: number }>(`SELECT COUNT(*) as c FROM products p WHERE ${where}`, values)?.c || 0);
    const categories = all<{ c: string }>('SELECT DISTINCT category as c FROM products WHERE company_id = ? AND category IS NOT NULL ORDER BY category', [companyId]);
    return { products: products.map(this.format), meta: buildPaginationMeta(total, page, limit), categories: categories.map(r => r.c) };
  }

  async findById(id: string, companyId: string) {
    const row = get<Record<string, unknown>>(`
      SELECT p.*, s.name as supplier_name FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ? AND p.company_id = ?`, [id, companyId]);
    if (!row) throw new Error('Producto no encontrado');
    const movements = all<Record<string, unknown>>(`
      SELECT m.*, u.first_name, u.last_name FROM inventory_movements m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.product_id = ? ORDER BY m.created_at DESC LIMIT 20`, [id]);
    return { ...this.format(row), movements };
  }

  async create(companyId: string, data: Record<string, unknown>) {
    const id = uuid();
    run(`INSERT INTO products (id, company_id, supplier_id, sku, name, description, category, unit, sale_price, cost_price, tax_rate, track_inventory, stock, min_stock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, data.supplierId || null, data.sku || null, data.name, data.description || null,
        data.category || null, data.unit || 'pza', Number(data.salePrice || 0), Number(data.costPrice || 0),
        Number(data.taxRate ?? 16), data.trackInventory !== false ? 1 : 0,
        Number(data.stock || 0), Number(data.minStock || 0)]);
    if (data.trackInventory !== false && Number(data.stock || 0) > 0) {
      const stock = Number(data.stock);
      run('INSERT INTO inventory_movements (id, company_id, product_id, type, quantity, stock_after, reference, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [uuid(), companyId, id, 'in', stock, stock, 'Stock inicial', data.createdBy || null]);
    }
    return this.findById(id, companyId);
  }

  async update(id: string, companyId: string, data: Record<string, unknown>) {
    this.assertExists(id, companyId);
    const map: Record<string, string> = {
      supplierId: 'supplier_id', sku: 'sku', name: 'name', description: 'description',
      category: 'category', unit: 'unit', salePrice: 'sale_price', costPrice: 'cost_price',
      taxRate: 'tax_rate', trackInventory: 'track_inventory', minStock: 'min_stock', isActive: 'is_active',
    };
    const sets: string[] = []; const vals: unknown[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (data[k] !== undefined) {
        sets.push(`${col} = ?`);
        vals.push(k === 'trackInventory' ? (data[k] ? 1 : 0) : data[k]);
      }
    }
    if (sets.length > 0) { vals.push(new Date().toISOString(), id); run(`UPDATE products SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, vals); }
    return this.findById(id, companyId);
  }

  async adjustStock(id: string, companyId: string, type: string, quantity: number, reference: string, notes: string, userId: string) {
    const product = get<{ stock: number }>('SELECT stock FROM products WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!product) throw new Error('Producto no encontrado');
    const delta = type === 'out' ? -Math.abs(quantity) : Math.abs(quantity);
    const newStock = product.stock + delta;
    if (newStock < 0) throw new Error('Stock insuficiente');
    run('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?', [newStock, new Date().toISOString(), id]);
    run('INSERT INTO inventory_movements (id, company_id, product_id, type, quantity, stock_after, reference, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid(), companyId, id, type, Math.abs(quantity), newStock, reference || null, notes || null, userId]);
    return this.findById(id, companyId);
  }

  async getStats(companyId: string) {
    const total = Number(get<{ c: number }>('SELECT COUNT(*) as c FROM products WHERE company_id = ? AND is_active = 1', [companyId])?.c || 0);
    const lowStock = Number(get<{ c: number }>('SELECT COUNT(*) as c FROM products WHERE company_id = ? AND is_active = 1 AND track_inventory = 1 AND stock <= min_stock', [companyId])?.c || 0);
    const totalValue = Number(get<{ v: number }>('SELECT COALESCE(SUM(stock * cost_price), 0) as v FROM products WHERE company_id = ? AND is_active = 1', [companyId])?.v || 0);
    const categories = Number(get<{ c: number }>('SELECT COUNT(DISTINCT category) as c FROM products WHERE company_id = ? AND category IS NOT NULL', [companyId])?.c || 0);
    return { total, lowStock, totalValue, categories };
  }

  async delete(id: string, companyId: string) {
    this.assertExists(id, companyId);
    run('UPDATE products SET is_active = 0, updated_at = ? WHERE id = ? AND company_id = ?', [new Date().toISOString(), id, companyId]);
  }

  private assertExists(id: string, companyId: string) {
    if (!get('SELECT id FROM products WHERE id = ? AND company_id = ?', [id, companyId])) throw new Error('Producto no encontrado');
  }

  private format(p: Record<string, unknown>) {
    return {
      id: p.id, sku: p.sku, name: p.name, description: p.description, category: p.category,
      unit: p.unit, salePrice: p.sale_price, costPrice: p.cost_price, taxRate: p.tax_rate,
      trackInventory: !!p.track_inventory, stock: Number(p.stock || 0), minStock: Number(p.min_stock || 0),
      isActive: !!p.is_active, isLowStock: !!p.track_inventory && Number(p.stock || 0) <= Number(p.min_stock || 0),
      supplierId: p.supplier_id, supplierName: p.supplier_name,
      createdAt: p.created_at, updatedAt: p.updated_at,
    };
  }
}
