import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';

interface CuadrillaRow {
  id: string; company_id: string; name: string;
  chief_id: string | null; specialty: string | null;
  vehicle: string | null; zone: string | null;
  daily_capacity: number; is_active: number; created_at: string;
  chief_name?: string; member_count?: number;
}

export interface Cuadrilla {
  id: string; companyId: string; name: string; description: string | null;
  chiefId: string | null; chiefName?: string;
  specialty: string | null; vehicle: string | null; zone: string | null;
  dailyCapacity: number; isActive: boolean; createdAt: string;
  memberCount?: number;
}

export interface CuadrillaMember {
  id: string; cuadrillaId: string; userId: string; role: string;
  firstName: string; lastName: string; email: string;
}

function mapCuadrilla(r: CuadrillaRow): Cuadrilla {
  return {
    id: r.id, companyId: r.company_id, name: r.name,
    description: r.specialty,   // re-use specialty as description in UI
    chiefId: r.chief_id, chiefName: r.chief_name,
    specialty: r.specialty, vehicle: r.vehicle, zone: r.zone,
    dailyCapacity: Number(r.daily_capacity || 1),
    isActive: !!r.is_active, createdAt: r.created_at,
    memberCount: Number(r.member_count || 0),
  };
}

const SELECT = `
  SELECT c.*,
    (u.first_name || ' ' || u.last_name) as chief_name,
    (SELECT COUNT(*) FROM cuadrilla_members cm WHERE cm.cuadrilla_id = c.id) as member_count
  FROM cuadrillas c
  LEFT JOIN users u ON c.chief_id = u.id
`;

export class CuadrillasService {

  findAll(companyId: string): Cuadrilla[] {
    const rows = all<CuadrillaRow>(`${SELECT} WHERE c.company_id = ? ORDER BY c.name`, [companyId]);
    return rows.map(mapCuadrilla);
  }

  findById(id: string, companyId: string): Cuadrilla {
    const row = get<CuadrillaRow>(`${SELECT} WHERE c.id = ? AND c.company_id = ?`, [id, companyId]);
    if (!row) throw new Error('Cuadrilla no encontrada');
    return mapCuadrilla(row);
  }

  create(companyId: string, data: {
    name: string; description?: string; chiefId?: string;
    specialty?: string; vehicle?: string; zone?: string; dailyCapacity?: number;
  }): Cuadrilla {
    const id = uuid();
    run(
      `INSERT INTO cuadrillas (id, company_id, name, chief_id, specialty, vehicle, zone, daily_capacity)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, companyId, data.name, data.chiefId || null,
       data.description || data.specialty || null,
       data.vehicle || null, data.zone || null,
       Number(data.dailyCapacity || 1)]
    );
    return this.findById(id, companyId);
  }

  update(id: string, companyId: string, data: Record<string, unknown>): Cuadrilla {
    const map: Record<string, string> = {
      name: 'name', description: 'specialty', specialty: 'specialty',
      chiefId: 'chief_id', vehicle: 'vehicle', zone: 'zone', dailyCapacity: 'daily_capacity',
    };
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (data[k] !== undefined) { sets.push(`${col} = ?`); vals.push(data[k]); }
    }
    if (sets.length > 0) {
      vals.push(id, companyId);
      run(`UPDATE cuadrillas SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`, vals);
    }
    return this.findById(id, companyId);
  }

  delete(id: string, companyId: string): void {
    const ex = get('SELECT id FROM cuadrillas WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!ex) throw new Error('Cuadrilla no encontrada');
    run('DELETE FROM cuadrillas WHERE id = ? AND company_id = ?', [id, companyId]);
  }

  // ── Members ──────────────────────────────────────────────────────────────────

  getMembers(cuadrillaId: string): CuadrillaMember[] {
    return all<{ id: string; cuadrilla_id: string; user_id: string; first_name: string; last_name: string; email: string }>(
      `SELECT cm.id, cm.cuadrilla_id, cm.user_id, u.first_name, u.last_name, u.email
       FROM cuadrilla_members cm JOIN users u ON cm.user_id = u.id
       WHERE cm.cuadrilla_id = ?`,
      [cuadrillaId]
    ).map(r => ({
      id: r.id, cuadrillaId: r.cuadrilla_id, userId: r.user_id,
      role: 'tecnico', firstName: r.first_name, lastName: r.last_name, email: r.email,
    }));
  }

  addMember(cuadrillaId: string, userId: string): void {
    const ex = get('SELECT id FROM cuadrilla_members WHERE cuadrilla_id = ? AND user_id = ?', [cuadrillaId, userId]);
    if (!ex) {
      run('INSERT INTO cuadrilla_members (id, cuadrilla_id, user_id) VALUES (?,?,?)', [uuid(), cuadrillaId, userId]);
    }
  }

  removeMember(cuadrillaId: string, userId: string): void {
    run('DELETE FROM cuadrilla_members WHERE cuadrilla_id = ? AND user_id = ?', [cuadrillaId, userId]);
  }
}

export const cuadrillasService = new CuadrillasService();
