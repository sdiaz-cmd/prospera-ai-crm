import { run, get, all, count } from '../../database/db';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { buildPaginationMeta } from '../../utils/response';
import { getPlan } from '../../config/plans';

export class UsersService {
  async findAll(companyId: string, params: { page?: number; limit?: number; search?: string }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;
    const search = params.search ? `%${params.search}%` : null;

    const whereSearch = search
      ? 'AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)'
      : '';
    const searchParams = search ? [search, search, search] : [];

    const sql = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
             u.is_active, u.last_login_at, u.created_at,
             uc.is_owner, r.id as role_id, r.name as role_name
      FROM users u
      JOIN user_companies uc ON u.id = uc.user_id
      JOIN roles r ON uc.role_id = r.id
      WHERE uc.company_id = ? ${whereSearch}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countSql = `
      SELECT COUNT(*) as c FROM users u
      JOIN user_companies uc ON u.id = uc.user_id
      WHERE uc.company_id = ? ${whereSearch}
    `;

    const users = all<Record<string, unknown>>(sql, [companyId, ...searchParams, limit, offset]);
    const totalRow = get<{ c: number }>(countSql, [companyId, ...searchParams]);
    const total = Number(totalRow?.c || 0);

    return {
      users: users.map(u => ({
        id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name,
        phone: u.phone, avatarUrl: u.avatar_url, isActive: !!u.is_active,
        lastLoginAt: u.last_login_at, createdAt: u.created_at, isOwner: !!u.is_owner,
        role: { id: u.role_id, name: u.role_name },
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findById(userId: string, companyId: string) {
    const row = get<Record<string, unknown>>(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
             u.is_active, u.last_login_at, u.created_at,
             uc.is_owner, r.id as role_id, r.name as role_name
      FROM users u
      JOIN user_companies uc ON u.id = uc.user_id
      JOIN roles r ON uc.role_id = r.id
      WHERE uc.user_id = ? AND uc.company_id = ?
    `, [userId, companyId]);

    if (!row) throw new Error('Usuario no encontrado');
    return {
      id: row.id, email: row.email, firstName: row.first_name, lastName: row.last_name,
      phone: row.phone, avatarUrl: row.avatar_url, isActive: !!row.is_active,
      isOwner: !!row.is_owner, lastLoginAt: row.last_login_at, createdAt: row.created_at,
      role: { id: row.role_id, name: row.role_name },
    };
  }

  async invite(companyId: string, data: { email: string; firstName: string; lastName: string; roleId: string; password: string }) {
    const role = get('SELECT id FROM roles WHERE id = ? AND company_id = ?', [data.roleId, companyId]);
    if (!role) throw new Error('Rol no encontrado');

    // Check plan user limit
    const company = get<{ plan: string }>('SELECT plan FROM companies WHERE id = ?', [companyId]);
    const planConfig = getPlan(company?.plan || 'trial');
    if (planConfig.maxUsers !== Infinity) {
      const currentUsers = count('SELECT COUNT(*) FROM user_companies WHERE company_id = ?', [companyId]);
      if (currentUsers >= planConfig.maxUsers) {
        throw new Error(`Tu plan permite máximo ${planConfig.maxUsers} usuarios. Actualiza tu plan para agregar más.`);
      }
    }

    let user = get<{ id: string }>('SELECT id FROM users WHERE email = ?', [data.email]);
    if (!user) {
      const hashed = await bcrypt.hash(data.password, 12);
      const id = uuid();
      run('INSERT INTO users (id, email, first_name, last_name, password, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        [id, data.email, data.firstName, data.lastName, hashed]);
      user = { id };
    } else {
      const existing = get('SELECT id FROM user_companies WHERE user_id = ? AND company_id = ?', [user.id, companyId]);
      if (existing) throw new Error('El usuario ya pertenece a esta empresa');
    }

    run('INSERT INTO user_companies (id, user_id, company_id, role_id, is_owner, is_active) VALUES (?, ?, ?, ?, 0, 1)',
      [uuid(), user.id, companyId, data.roleId]);

    return this.findById(user.id, companyId);
  }

  async update(userId: string, companyId: string, data: { firstName?: string; lastName?: string; phone?: string; roleId?: string; isActive?: boolean }) {
    if (data.firstName) run('UPDATE users SET first_name = ? WHERE id = ?', [data.firstName, userId]);
    if (data.lastName) run('UPDATE users SET last_name = ? WHERE id = ?', [data.lastName, userId]);
    if (data.phone !== undefined) run('UPDATE users SET phone = ? WHERE id = ?', [data.phone, userId]);
    if (data.roleId) {
      const role = get('SELECT id FROM roles WHERE id = ? AND company_id = ?', [data.roleId, companyId]);
      if (!role) throw new Error('Rol no encontrado');
      run('UPDATE user_companies SET role_id = ? WHERE user_id = ? AND company_id = ?', [data.roleId, userId, companyId]);
    }
    if (data.isActive !== undefined) {
      run('UPDATE user_companies SET is_active = ? WHERE user_id = ? AND company_id = ?', [data.isActive ? 1 : 0, userId, companyId]);
    }
    return this.findById(userId, companyId);
  }

  async remove(userId: string, companyId: string, requestingUserId: string) {
    if (userId === requestingUserId) throw new Error('No puedes eliminar tu propia cuenta');
    const uc = get<{ is_owner: number }>('SELECT is_owner FROM user_companies WHERE user_id = ? AND company_id = ?', [userId, companyId]);
    if (!uc) throw new Error('Usuario no encontrado');
    if (uc.is_owner) throw new Error('No se puede eliminar al propietario');
    run('DELETE FROM user_companies WHERE user_id = ? AND company_id = ?', [userId, companyId]);
  }

  transferOwnership(companyId: string, currentOwnerId: string, newOwnerId: string) {
    if (currentOwnerId === newOwnerId) throw new Error('Ya eres el propietario');
    const currentUser = get<{ is_owner: number }>(
      'SELECT is_owner FROM user_companies WHERE user_id = ? AND company_id = ?',
      [currentOwnerId, companyId]
    );
    if (!currentUser?.is_owner) throw new Error('Solo el propietario puede transferir la propiedad');
    const newUser = get<{ is_active: number }>(
      'SELECT is_active FROM user_companies WHERE user_id = ? AND company_id = ?',
      [newOwnerId, companyId]
    );
    if (!newUser) throw new Error('El usuario no pertenece a esta empresa');
    if (!newUser.is_active) throw new Error('El usuario no está activo');
    run('UPDATE user_companies SET is_owner = 0 WHERE company_id = ? AND user_id = ?', [companyId, currentOwnerId]);
    run('UPDATE user_companies SET is_owner = 1 WHERE company_id = ? AND user_id = ?', [companyId, newOwnerId]);
  }
}
