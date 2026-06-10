import api from './api';
import { DashboardData } from '../types';

export const dashboardService = {
  async getOverview() {
    const { data } = await api.get<{ data: DashboardData }>('/dashboard/overview');
    return data.data;
  },
};
