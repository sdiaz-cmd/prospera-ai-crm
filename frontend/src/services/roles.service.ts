import api from './api';
import { Permission } from '../types';

export interface RoleWithPermissions {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  rolePermissions: { permission: Permission }[];
  _count?: { userCompanies: number };
}

export const rolesService = {
  async getAll() {
    const { data } = await api.get<{ data: RoleWithPermissions[] }>('/roles');
    return data.data;
  },

  async getPermissions() {
    const { data } = await api.get<{ data: Permission[] }>('/roles/permissions');
    return data.data;
  },

  async create(payload: { name: string; description?: string; permissionIds?: string[] }) {
    const { data } = await api.post<{ data: RoleWithPermissions }>('/roles', payload);
    return data.data;
  },

  async update(id: string, payload: { name?: string; description?: string; permissionIds?: string[] }) {
    const { data } = await api.put<{ data: RoleWithPermissions }>(`/roles/${id}`, payload);
    return data.data;
  },

  async delete(id: string) {
    await api.delete(`/roles/${id}`);
  },
};
