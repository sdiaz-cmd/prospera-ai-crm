import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';

export interface Notification {
  id: string;
  companyId: string;
  userId: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

function format(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    userId: row.user_id as string,
    type: row.type as string,
    title: row.title as string,
    message: row.message as string | null,
    link: row.link as string | null,
    isRead: row.is_read === 1,
    createdAt: row.created_at as string,
  };
}

export const notificationsService = {
  create(opts: {
    companyId: string;
    userId: string;
    type: string;
    title: string;
    message?: string;
    link?: string;
  }): Notification {
    const id = uuid();
    run(
      `INSERT INTO notifications (id, company_id, user_id, type, title, message, link)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, opts.companyId, opts.userId, opts.type, opts.title, opts.message || null, opts.link || null]
    );
    return get<Record<string, unknown>>('SELECT * FROM notifications WHERE id = ?', [id])!
      ? format(get<Record<string, unknown>>('SELECT * FROM notifications WHERE id = ?', [id])!)
      : { id, companyId: opts.companyId, userId: opts.userId, type: opts.type,
          title: opts.title, message: opts.message || null, link: opts.link || null,
          isRead: false, createdAt: new Date().toISOString() };
  },

  list(userId: string, companyId: string, limit = 50): Notification[] {
    return all<Record<string, unknown>>(
      `SELECT * FROM notifications WHERE user_id = ? AND company_id = ?
       ORDER BY is_read ASC, created_at DESC LIMIT ?`,
      [userId, companyId, limit]
    ).map(format);
  },

  countUnread(userId: string, companyId: string): number {
    const row = get<{ c: number }>(
      'SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND company_id = ? AND is_read = 0',
      [userId, companyId]
    );
    return row?.c ?? 0;
  },

  markRead(id: string, userId: string): void {
    run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
  },

  markAllRead(userId: string, companyId: string): void {
    run('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND company_id = ?', [userId, companyId]);
  },
};
