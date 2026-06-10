import api from './api';
import { UserWithRole } from '../types';

export const usersService = {
  async getAll(params?: { page?: number; limit?: number; search?: string }) {
    const { data } = await api.get<{ data: UserWithRole[]; meta: { total: number; page: number; limit: number; totalPages: number } }>('/users', { params });
    return data;
  },

  async getById(id: string) {
    const { data } = await api.get<{ data: UserWithRole }>(`/users/${id}`);
    return data.data;
  },

  async invite(payload: { email: string; firstName: string; lastName: string; roleId: string; password: string }) {
    const { data } = await api.post<{ data: UserWithRole }>('/users', payload);
    return data.data;
  },

  async update(id: string, payload: Partial<{ firstName: string; lastName: string; phone: string; roleId: string; isActive: boolean }>) {
    const { data } = await api.put<{ data: UserWithRole }>(`/users/${id}`, payload);
    return data.data;
  },

  async delete(id: string) {
    await api.delete(`/users/${id}`);
  },
};
