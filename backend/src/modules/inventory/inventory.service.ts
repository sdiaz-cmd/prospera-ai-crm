import { v4 as uuid } from 'uuid';
import { all, get, run, count } from '../../database/db';

interface StockItem {
  id: string; name: string; sku: string; category: string;
  unit: string; salePrice: number; costPrice: number;
  stock: number; minStock: number; trackInventory: boolean;
  supplierName: string; status: 'ok' | 'stock_bajo' | 'sin_stock' | 'no_track';
}

interface MovementInput {
  productId: string;
  type: 'entrada' | 'salida' | 'ajuste';
  quantity: number;
  reference?: string;
  notes?: string;
}

interface ImportItem {
  name: string; sku?: string; category?: string; unit?: string;
  salePrice?: number; costPrice?: number; stock?: number; minStock?: number;
}

export class InventoryService {
  getStock(companyId: string, opts: { search?: string; lowStock?: boolean } = {}): StockItem[] {
    const { search, lowStock } = opts;
    let sql = `
      SELECT p.id, p.name, p.sku, p.category, p.unit,
             p.sale_price AS salePrice, p.cost_price AS costPrice,
             p.stock, p.min_stock AS minStock,
             p.track_inventory AS trackInventory,
             COALESCE(s.name, '') AS supplierName
      FROM products p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.company_id = ? AND p.is_active = 1
    `;
    const params: unknown[] = [companyId];

    if (search) {
      sql += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.category LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY p.name ASC';

    const rows = all<StockItem & { trackInventory: number | boolean }>(sql, params);

    return rows
      .map(r => ({
        ...r,
        trackInventory: Boolean(r.trackInventory),
        status: this._calcStatus(r),
      }))
      .filter(r => {
        if (!lowStock) return true;
        return r.status === 'stock_bajo' || r.status === 'sin_stock';
      });
  }

  private _calcStatus(r: { stock: number; minStock: number; trackInventory: boolean | number }): StockItem['status'] {
    if (!r.trackInventory) return 'no_track';
    if (r.stock <= 0) return 'sin_stock';
    if (r.stock <= r.minStock) return 'stock_bajo';
    return 'ok';
  }

  getSummary(companyId: string) {
    const total = count('SELECT COUNT(*) FROM products WHERE company_id = ? AND is_active = 1', [companyId]);
    const sinStock = count(`SELECT COUNT(*) FROM products WHERE company_id = ? AND is_active = 1 AND track_inventory = 1 AND stock <= 0`, [companyId]);
    const stockBajo = count(`SELECT COUNT(*) FROM products WHERE company_id = ? AND is_active = 1 AND track_inventory = 1 AND stock > 0 AND stock <= min_stock`, [companyId]);
    const row = get<{ val: number }>(`SELECT COALESCE(SUM(stock * cost_price), 0) AS val FROM products WHERE company_id = ? AND is_active = 1 AND track_inventory = 1`, [companyId]);
    return { total, sinStock, stockBajo, valorInventario: row?.val ?? 0 };
  }

  getMovements(companyId: string, productId?: string, limit = 50) {
    let sql = `
      SELECT m.*, p.name AS productName, p.unit,
             u.first_name || ' ' || u.last_name AS createdByName
      FROM inventory_movements m
      JOIN products p ON p.id = m.product_id
      LEFT JOIN users u ON u.id = m.created_by
      WHERE m.company_id = ?
    `;
    const params: unknown[] = [companyId];
    if (productId) { sql += ' AND m.product_id = ?'; params.push(productId); }
    sql += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit);
    return all(sql, params);
  }

  addMovement(companyId: string, userId: string, input: MovementInput) {
    const { productId, type, quantity, reference, notes } = input;
    if (!quantity || quantity <= 0) throw new Error('La cantidad debe ser mayor a 0');

    const product = get<{ stock: number; track_inventory: number }>(
      'SELECT stock, track_inventory FROM products WHERE id = ? AND company_id = ?',
      [productId, companyId]
    );
    if (!product) throw new Error('Producto no encontrado');

    let newStock: number;
    let delta: number;

    if (type === 'ajuste') {
      newStock = quantity;
      delta = quantity - product.stock;
    } else if (type === 'entrada') {
      newStock = product.stock + quantity;
      delta = quantity;
    } else {
      if (product.stock < quantity) throw new Error('Stock insuficiente para la salida');
      newStock = product.stock - quantity;
      delta = -quantity;
    }

    run("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?", [newStock, productId]);

    const id = uuid();
    run(
      `INSERT INTO inventory_movements (id, company_id, product_id, type, quantity, stock_after, reference, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, productId, type, Math.abs(delta), newStock, reference || null, notes || null, userId]
    );

    return { id, newStock };
  }

  importProducts(companyId: string, userId: string, items: ImportItem[]) {
    let created = 0, updated = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        if (!item.name?.trim()) { errors.push('Fila sin nombre'); continue; }

        const existing = item.sku
          ? get<{ id: string; stock: number }>('SELECT id, stock FROM products WHERE company_id = ? AND sku = ?', [companyId, item.sku.trim()])
          : undefined;

        if (existing) {
          run(`UPDATE products SET
            name = ?, category = ?, unit = ?, sale_price = ?, cost_price = ?,
            min_stock = ?, updated_at = datetime('now')
            WHERE id = ?`,
            [item.name.trim(), item.category || '', item.unit || 'pza',
             item.salePrice ?? 0, item.costPrice ?? 0,
             item.minStock ?? 0, existing.id]
          );

          if (item.stock !== undefined && item.stock !== existing.stock) {
            const id = uuid();
            run(
              `INSERT INTO inventory_movements (id, company_id, product_id, type, quantity, stock_after, reference, created_by)
               VALUES (?, ?, ?, 'ajuste', ?, ?, 'Importación Excel', ?)`,
              [id, companyId, existing.id, Math.abs(item.stock - existing.stock), item.stock, userId]
            );
            run('UPDATE products SET stock = ? WHERE id = ?', [item.stock, existing.id]);
          }
          updated++;
        } else {
          const id = uuid();
          run(`INSERT INTO products (id, company_id, sku, name, category, unit, sale_price, cost_price, stock, min_stock, track_inventory, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
            [id, companyId, item.sku?.trim() || null, item.name.trim(),
             item.category || '', item.unit || 'pza',
             item.salePrice ?? 0, item.costPrice ?? 0,
             item.stock ?? 0, item.minStock ?? 0]
          );

          if ((item.stock ?? 0) > 0) {
            const movId = uuid();
            run(
              `INSERT INTO inventory_movements (id, company_id, product_id, type, quantity, stock_after, reference, created_by)
               VALUES (?, ?, ?, 'entrada', ?, ?, 'Importación Excel', ?)`,
              [movId, companyId, id, item.stock, item.stock, userId]
            );
          }
          created++;
        }
      } catch (e) {
        errors.push(`${item.name}: ${(e as Error).message}`);
      }
    }

    return { created, updated, errors };
  }
}
