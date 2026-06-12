import api from './api';
import { DashboardData } from '../types';

export const dashboardService = {
  async getOverview(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString();
    const { data } = await api.get<{ data: DashboardData }>(
      `/dashboard/overview${query ? `?${query}` : ''}`
    );
    return data.data;
  },
};
