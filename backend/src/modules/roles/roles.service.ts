import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';

export class RolesService {
  async findAll(companyId: string) {
    const roles = all<Record<string, unknown>>('SELECT * FROM roles WHERE company_id = ? ORDER BY created_at ASC', [companyId]);
    return roles.map(r => {
      const perms = all<Record<string, unknown>>(
        'SELECT p.id, p.module, p.action, p.description FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = ?',
        [r.id]
      );
      const countRow = get<{ c: number }>('SELECT COUNT(*) as c FROM user_companies WHERE role_id = ?', [r.id]);
      return { id: r.id, name: r.name, description: r.description, isSystem: !!r.is_system, createdAt: r.created_at, permissions: perms, userCount: Number(countRow?.c || 0) };
    });
  }

  async findById(id: string, companyId: string) {
    const role = get<Record<string, unknown>>('SELECT * FROM roles WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!role) throw new Error('Rol no encontrado');
    const perms = all<Record<string, unknown>>(
      'SELECT p.id, p.module, p.action FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = ?',
      [id]
    );
    return { ...role, permissions: perms };
  }

  async create(companyId: string, data: { name: string; description?: string; permissionIds?: string[] }) {
    const existing = get('SELECT id FROM roles WHERE company_id = ? AND name = ?', [companyId, data.name]);
    if (existing) throw new Error('Ya existe un rol con este nombre');
    const id = uuid();
    run('INSERT INTO roles (id, company_id, name, description, is_system) VALUES (?, ?, ?, ?, 0)',
      [id, companyId, data.name, data.description || null]);
    if (data.permissionIds?.length) {
      for (const permId of data.permissionIds) {
        run('INSERT INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)', [uuid(), id, permId]);
      }
    }
    return this.findById(id, companyId);
  }

  async update(id: string, companyId: string, data: { name?: string; description?: string; permissionIds?: string[] }) {
    const role = get<Record<string, unknown>>('SELECT * FROM roles WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!role) throw new Error('Rol no encontrado');
    if (role.is_system) throw new Error('No se pueden modificar roles del sistema');
    if (data.name) run('UPDATE roles SET name = ? WHERE id = ?', [data.name, id]);
    if (data.description !== undefined) run('UPDATE roles SET description = ? WHERE id = ?', [data.description, id]);
    if (data.permissionIds !== undefined) {
      run('DELETE FROM role_permissions WHERE role_id = ?', [id]);
      for (const permId of data.permissionIds) {
        run('INSERT INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)', [uuid(), id, permId]);
      }
    }
    return this.findById(id, companyId);
  }

  async delete(id: string, companyId: string) {
    const role = get<Record<string, unknown>>('SELECT * FROM roles WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!role) throw new Error('Rol no encontrado');
    if (role.is_system) throw new Error('No se pueden eliminar roles del sistema');
    const countRow = get<{ c: number }>('SELECT COUNT(*) as c FROM user_companies WHERE role_id = ?', [id]);
    if (Number(countRow?.c || 0) > 0) throw new Error('No se puede eliminar un rol con usuarios asignados');
    run('DELETE FROM roles WHERE id = ?', [id]);
  }

  async getAllPermissions() {
    return all('SELECT * FROM permissions ORDER BY module ASC, action ASC');
  }
}
