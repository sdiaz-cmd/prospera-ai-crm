import { get, all } from '../../database/db';

export class DashboardService {
  async getOverview(companyId: string, startDate: string, endDate: string) {
    const now = new Date();

    // Previous equivalent period for growth comparison
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration - 1).toISOString();
    const prevEnd = new Date(start.getTime() - 1).toISOString();

    const n = (sql: string, p: unknown[]) => Number((get<{ c: number }>(sql, p))?.c || 0);

    // KPIs filtered by period
    const leadsInPeriod = n(
      'SELECT COUNT(*) as c FROM leads WHERE company_id = ? AND created_at >= ? AND created_at <= ?',
      [companyId, startDate, endDate]
    );
    const leadsPrevPeriod = n(
      'SELECT COUNT(*) as c FROM leads WHERE company_id = ? AND created_at >= ? AND created_at <= ?',
      [companyId, prevStart, prevEnd]
    );

    const totalContacts = n('SELECT COUNT(*) as c FROM contacts WHERE company_id = ?', [companyId]);
    const openOpps = n(
      'SELECT COUNT(*) as c FROM opportunities WHERE company_id = ? AND status = ?',
      [companyId, 'open']
    );
    const wonOpps = n(
      'SELECT COUNT(*) as c FROM opportunities WHERE company_id = ? AND status = ? AND created_at >= ? AND created_at <= ?',
      [companyId, 'won', startDate, endDate]
    );
    const pendingTasks = n(
      'SELECT COUNT(*) as c FROM crm_tasks WHERE company_id = ? AND status = ?',
      [companyId, 'pending']
    );
    const overdueTasks = n(
      'SELECT COUNT(*) as c FROM crm_tasks WHERE company_id = ? AND status != ? AND due_date < ?',
      [companyId, 'completed', now.toISOString()]
    );

    const oppValueRow = get<{ s: number }>(
      'SELECT COALESCE(SUM(amount), 0) as s FROM opportunities WHERE company_id = ? AND status = ?',
      [companyId, 'open']
    );
    const oppValue = Number(oppValueRow?.s || 0);

    const growth = leadsPrevPeriod > 0
      ? Math.round(((leadsInPeriod - leadsPrevPeriod) / leadsPrevPeriod) * 100)
      : leadsInPeriod > 0 ? 100 : 0;

    // Recent activities in period
    const recentActivities = all<Record<string, unknown>>(`
      SELECT a.id, a.type, a.subject, a.created_at, u.first_name, u.last_name, u.avatar_url
      FROM activities a JOIN users u ON a.owner_id = u.id
      WHERE a.company_id = ? AND a.created_at >= ? AND a.created_at <= ?
      ORDER BY a.created_at DESC LIMIT 5
    `, [companyId, startDate, endDate]);

    // Leads by source in period
    const leadsBySource = all<{ source: string; count: number }>(`
      SELECT COALESCE(source, 'Sin fuente') as source, COUNT(*) as count
      FROM leads WHERE company_id = ? AND created_at >= ? AND created_at <= ?
      GROUP BY source
    `, [companyId, startDate, endDate]);

    // Opportunities by stage (always current open pipeline)
    const oppByStage = all<Record<string, unknown>>(`
      SELECT o.stage_id, s.name as stage_name, s.color,
             COUNT(*) as count, COALESCE(SUM(o.amount), 0) as value
      FROM opportunities o JOIN pipeline_stages s ON o.stage_id = s.id
      WHERE o.company_id = ? AND o.status = 'open'
      GROUP BY o.stage_id, s.name, s.color
    `, [companyId]);

    // Timeline: daily if ≤ 31 days, monthly if > 31
    const daysDiff = Math.max(1, Math.ceil(duration / (1000 * 60 * 60 * 24)));
    const isDaily = daysDiff <= 31;
    const timeline = isDaily
      ? this.getDailyLeads(companyId, start, end)
      : this.getMonthlyLeads(companyId, start, end);

    return {
      kpis: {
        totalLeads: { value: leadsInPeriod, growth },
        totalContacts: { value: totalContacts },
        openOpportunities: { value: openOpps, totalValue: oppValue },
        wonOpportunities: { value: wonOpps },
        pendingTasks: { value: pendingTasks },
        overdueTasks: { value: overdueTasks },
      },
      recentActivities: recentActivities.map(a => ({
        id: a.id, type: a.type, subject: a.subject,
        owner: `${a.first_name} ${a.last_name}`, ownerAvatar: a.avatar_url,
        createdAt: a.created_at,
      })),
      leadsBySource,
      opportunitiesByStage: oppByStage.map(o => ({
        stageId: o.stage_id, stageName: o.stage_name, color: o.color,
        count: Number(o.count), value: Number(o.value),
      })),
      timeline,
      isDaily,
    };
  }

  private getDailyLeads(companyId: string, start: Date, end: Date) {
    const days: { label: string; leads: number }[] = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(23, 59, 59, 999);

    while (current <= endDay) {
      const dayStart = new Date(current);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);
      const row = get<{ c: number }>(
        'SELECT COUNT(*) as c FROM leads WHERE company_id = ? AND created_at >= ? AND created_at <= ?',
        [companyId, dayStart.toISOString(), dayEnd.toISOString()]
      );
      days.push({
        label: dayStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
        leads: Number(row?.c || 0),
      });
      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  private getMonthlyLeads(companyId: string, start: Date, end: Date) {
    const months: { label: string; leads: number }[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (current <= endMonth) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
      const row = get<{ c: number }>(
        'SELECT COUNT(*) as c FROM leads WHERE company_id = ? AND created_at >= ? AND created_at <= ?',
        [companyId, monthStart.toISOString(), monthEnd.toISOString()]
      );
      months.push({
        label: monthStart.toLocaleString('es-MX', { month: 'short', year: '2-digit' }),
        leads: Number(row?.c || 0),
      });
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  }
}
