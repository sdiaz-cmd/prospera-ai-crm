import api from './api';
import { LoginResponse } from '../types';

export const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post<{ data: LoginResponse }>('/auth/login', { email, password });
    return data.data;
  },

  async register(payload: { firstName: string; lastName: string; email: string; password: string; companyName: string }) {
    const { data } = await api.post<{ data: LoginResponse }>('/auth/register', payload);
    return data.data;
  },

  async logout(refreshToken: string) {
    await api.post('/auth/logout', { refreshToken });
  },

  async getMe() {
    const { data } = await api.get<{ data: LoginResponse }>('/auth/me');
    return data.data;
  },

  async refresh(refreshToken: string) {
    const { data } = await api.post<{ data: { accessToken: string; refreshToken: string } }>('/auth/refresh', { refreshToken });
    return data.data;
  },
};
