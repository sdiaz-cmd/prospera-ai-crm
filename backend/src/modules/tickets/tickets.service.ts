import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TicketCategory = 'bug' | 'mejora' | 'consulta' | 'urgente';
export type TicketPriority = 'baja' | 'media' | 'alta' | 'critica';
export type TicketStatus   = 'abierto' | 'en_revision' | 'resuelto' | 'cerrado';

export interface Ticket {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  userEmail: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  adminNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TicketRow {
  id: string; company_id: string; user_id: string;
  user_name: string; user_email: string;
  title: string; description: string;
  category: string; priority: string; status: string;
  admin_notes: string | null; resolved_at: string | null;
  created_at: string; updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapTicket(row: TicketRow): Ticket {
  return {
    id: row.id, companyId: row.company_id, userId: row.user_id,
    userName: row.user_name, userEmail: row.user_email,
    title: row.title, description: row.description,
    category: row.category as TicketCategory,
    priority: row.priority as TicketPriority,
    status: row.status as TicketStatus,
    adminNotes: row.admin_notes,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class TicketsService {

  // ── Get all (admin sees all; user sees own) ────────────────────────

  findAll(companyId: string, userId: string, isAdmin: boolean, filters: {
    status?: string; category?: string; priority?: string;
  } = {}): Ticket[] {
    const conditions: string[] = ['company_id = ?'];
    const values: unknown[] = [companyId];

    if (!isAdmin) {
      conditions.push('user_id = ?');
      values.push(userId);
    }
    if (filters.status)   { conditions.push('status = ?');   values.push(filters.status); }
    if (filters.category) { conditions.push('category = ?'); values.push(filters.category); }
    if (filters.priority) { conditions.push('priority = ?'); values.push(filters.priority); }

    const rows = all<TicketRow>(
      `SELECT * FROM support_tickets WHERE ${conditions.join(' AND ')} ORDER BY
        CASE status WHEN 'abierto' THEN 0 WHEN 'en_revision' THEN 1 WHEN 'resuelto' THEN 2 ELSE 3 END,
        CASE priority WHEN 'critica' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
        created_at DESC`,
      values
    );
    return rows.map(mapTicket);
  }

  // ── Get single ────────────────────────────────────────────────────

  findById(id: string, companyId: string, userId: string, isAdmin: boolean): Ticket | null {
    const conditions = isAdmin
      ? 'id = ? AND company_id = ?'
      : 'id = ? AND company_id = ? AND user_id = ?';
    const values = isAdmin ? [id, companyId] : [id, companyId, userId];

    const row = get<TicketRow>(`SELECT * FROM support_tickets WHERE ${conditions}`, values);
    return row ? mapTicket(row) : null;
  }

  // ── Create ────────────────────────────────────────────────────────

  create(data: {
    companyId: string; userId: string; userName: string; userEmail: string;
    title: string; description: string;
    category: TicketCategory; priority: TicketPriority;
  }): Ticket {
    const id = uuid();
    run(
      `INSERT INTO support_tickets
       (id, company_id, user_id, user_name, user_email, title, description, category, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.companyId, data.userId, data.userName, data.userEmail,
       data.title, data.description, data.category, data.priority]
    );
    return this.findById(id, data.companyId, data.userId, true)!;
  }

  // ── Update status + notes (admin) ─────────────────────────────────

  update(id: string, companyId: string, data: {
    status?: TicketStatus; adminNotes?: string;
  }): Ticket | null {
    const sets: string[] = ['updated_at = datetime(\'now\')'];
    const values: unknown[] = [];

    if (data.status) {
      sets.push('status = ?');
      values.push(data.status);
      if (data.status === 'resuelto') {
        sets.push('resolved_at = datetime(\'now\')');
      }
    }
    if (data.adminNotes !== undefined) {
      sets.push('admin_notes = ?');
      values.push(data.adminNotes);
    }

    values.push(id, companyId);
    run(`UPDATE support_tickets SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`, values);

    const row = get<TicketRow>('SELECT * FROM support_tickets WHERE id = ?', [id]);
    return row ? mapTicket(row) : null;
  }

  // ── Delete (admin) ────────────────────────────────────────────────

  delete(id: string, companyId: string): boolean {
    run('DELETE FROM support_tickets WHERE id = ? AND company_id = ?', [id, companyId]);
    return true;
  }

  // ── Stats (admin) ─────────────────────────────────────────────────

  getStats(companyId: string): Record<string, number> {
    const rows = all<{ status: string; cnt: number }>(
      `SELECT status, COUNT(*) as cnt FROM support_tickets WHERE company_id = ? GROUP BY status`,
      [companyId]
    );
    const stats: Record<string, number> = { abierto: 0, en_revision: 0, resuelto: 0, cerrado: 0 };
    rows.forEach(r => { stats[r.status] = r.cnt; });
    stats['total'] = Object.values(stats).reduce((a, b) => a + b, 0);
    return stats;
  }
}

export const ticketsService = new TicketsService();
