import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CostCenter {
  id: string; companyId: string;
  name: string; description: string | null; client: string | null;
  status: 'activo' | 'cerrado' | 'pausado';
  startDate: string | null; endDate: string | null;
  budget: number;
  // computed
  totalIngresos: number; totalGastos: number;
  utilidad: number; margen: number;
  profitability: 'excelente' | 'bueno' | 'bajo' | 'negativo';
  createdAt: string; updatedAt: string;
}

export interface CostEntry {
  id: string; costCenterId: string; companyId: string;
  type: 'ingreso' | 'gasto';
  category: string; description: string;
  amount: number; date: string; notes: string | null;
  createdAt: string;
}

interface CenterRow {
  id: string; company_id: string; name: string; description: string | null;
  client: string | null; status: string; start_date: string | null;
  end_date: string | null; budget: number; created_at: string; updated_at: string;
  total_ingresos: number; total_gastos: number;
}

interface EntryRow {
  id: string; cost_center_id: string; company_id: string;
  type: string; category: string; description: string;
  amount: number; date: string; notes: string | null; created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcProfitability(margen: number): CostCenter['profitability'] {
  if (margen >= 40) return 'excelente';
  if (margen >= 20) return 'bueno';
  if (margen >= 0)  return 'bajo';
  return 'negativo';
}

function mapCenter(r: CenterRow): CostCenter {
  const ingresos = Number(r.total_ingresos || 0);
  const gastos   = Number(r.total_gastos   || 0);
  const utilidad = ingresos - gastos;
  const margen   = ingresos > 0 ? (utilidad / ingresos) * 100 : (utilidad < 0 ? -100 : 0);
  return {
    id: r.id, companyId: r.company_id, name: r.name,
    description: r.description, client: r.client,
    status: r.status as CostCenter['status'],
    startDate: r.start_date, endDate: r.end_date,
    budget: Number(r.budget || 0),
    totalIngresos: ingresos, totalGastos: gastos,
    utilidad, margen: Math.round(margen * 10) / 10,
    profitability: calcProfitability(margen),
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function mapEntry(e: EntryRow): CostEntry {
  return {
    id: e.id, costCenterId: e.cost_center_id, companyId: e.company_id,
    type: e.type as CostEntry['type'],
    category: e.category, description: e.description,
    amount: Number(e.amount), date: e.date, notes: e.notes,
    createdAt: e.created_at,
  };
}

const CENTER_SELECT = `
  SELECT cc.*,
    COALESCE((SELECT SUM(amount) FROM cost_entries WHERE cost_center_id = cc.id AND type = 'ingreso'),0) as total_ingresos,
    COALESCE((SELECT SUM(amount) FROM cost_entries WHERE cost_center_id = cc.id AND type = 'gasto'),0) as total_gastos
  FROM cost_centers cc
`;

// ─── Service ──────────────────────────────────────────────────────────────────

export class CostCentersService {

  findAll(companyId: string, params: { status?: string; search?: string } = {}): CostCenter[] {
    const conditions = ['cc.company_id = ?'];
    const vals: unknown[] = [companyId];
    if (params.status) { conditions.push('cc.status = ?'); vals.push(params.status); }
    if (params.search) { conditions.push('cc.name LIKE ?'); vals.push(`%${params.search}%`); }

    const rows = all<CenterRow>(
      `${CENTER_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY cc.created_at DESC`,
      vals
    );
    return rows.map(mapCenter);
  }

  findById(id: string, companyId: string): CostCenter {
    const row = get<CenterRow>(
      `${CENTER_SELECT} WHERE cc.id = ? AND cc.company_id = ?`, [id, companyId]
    );
    if (!row) throw new Error('Centro de costos no encontrado');
    return mapCenter(row);
  }

  create(companyId: string, data: Record<string, unknown>): CostCenter {
    const id = uuid();
    run(
      `INSERT INTO cost_centers (id, company_id, name, description, client, status, start_date, end_date, budget)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, data.name, data.description || null, data.client || null,
       data.status || 'activo', data.startDate || null, data.endDate || null, Number(data.budget || 0)]
    );
    return this.findById(id, companyId);
  }

  update(id: string, companyId: string, data: Record<string, unknown>): CostCenter {
    this.assertExists(id, companyId);
    const map: Record<string, string> = {
      name: 'name', description: 'description', client: 'client',
      status: 'status', startDate: 'start_date', endDate: 'end_date', budget: 'budget',
    };
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (data[k] !== undefined) { sets.push(`${col} = ?`); vals.push(data[k]); }
    }
    if (sets.length > 0) {
      vals.push(new Date().toISOString(), id);
      run(`UPDATE cost_centers SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, vals);
    }
    return this.findById(id, companyId);
  }

  delete(id: string, companyId: string): void {
    this.assertExists(id, companyId);
    run('DELETE FROM cost_centers WHERE id = ? AND company_id = ?', [id, companyId]);
  }

  // ── Entries ───────────────────────────────────────────────────────

  getEntries(costCenterId: string, companyId: string, type?: string): CostEntry[] {
    const conditions = ['cost_center_id = ? AND company_id = ?'];
    const vals: unknown[] = [costCenterId, companyId];
    if (type) { conditions.push('type = ?'); vals.push(type); }
    const rows = all<EntryRow>(
      `SELECT * FROM cost_entries WHERE ${conditions.join(' AND ')} ORDER BY date DESC, created_at DESC`,
      vals
    );
    return rows.map(mapEntry);
  }

  createEntry(data: {
    costCenterId: string; companyId: string;
    type: 'ingreso' | 'gasto'; category: string;
    description: string; amount: number; date: string; notes?: string;
  }): CostEntry {
    const id = uuid();
    run(
      `INSERT INTO cost_entries (id, cost_center_id, company_id, type, category, description, amount, date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.costCenterId, data.companyId, data.type, data.category,
       data.description, data.amount, data.date, data.notes || null]
    );
    return mapEntry(get<EntryRow>('SELECT * FROM cost_entries WHERE id = ?', [id])!);
  }

  deleteEntry(id: string, companyId: string): void {
    run('DELETE FROM cost_entries WHERE id = ? AND company_id = ?', [id, companyId]);
  }

  // ── Global summary ────────────────────────────────────────────────

  getSummary(companyId: string) {
    const centers = this.findAll(companyId);
    const totals = centers.reduce(
      (acc, c) => ({
        ingresos: acc.ingresos + c.totalIngresos,
        gastos:   acc.gastos   + c.totalGastos,
      }),
      { ingresos: 0, gastos: 0 }
    );
    const utilidad = totals.ingresos - totals.gastos;
    const margen   = totals.ingresos > 0 ? (utilidad / totals.ingresos) * 100 : 0;
    return {
      totalCentros:   centers.length,
      activos:        centers.filter(c => c.status === 'activo').length,
      totalIngresos:  totals.ingresos,
      totalGastos:    totals.gastos,
      utilidad,
      margen: Math.round(margen * 10) / 10,
      porRentabilidad: {
        excelente: centers.filter(c => c.profitability === 'excelente').length,
        bueno:     centers.filter(c => c.profitability === 'bueno').length,
        bajo:      centers.filter(c => c.profitability === 'bajo').length,
        negativo:  centers.filter(c => c.profitability === 'negativo').length,
      },
    };
  }

  private assertExists(id: string, companyId: string) {
    const ex = get('SELECT id FROM cost_centers WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!ex) throw new Error('Centro de costos no encontrado');
  }
}

export const costCentersService = new CostCentersService();
