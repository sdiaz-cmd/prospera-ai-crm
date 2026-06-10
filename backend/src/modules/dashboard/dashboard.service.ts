import { get, all } from '../../database/db';

export class DashboardService {
  async getOverview(companyId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
    const nowIso = now.toISOString();

    const n = (sql: string, p: unknown[]) => Number((get<{ c: number }>(sql, p))?.c || 0);

    const totalLeads = n('SELECT COUNT(*) as c FROM leads WHERE company_id = ?', [companyId]);
    const leadsThisMonth = n('SELECT COUNT(*) as c FROM leads WHERE company_id = ? AND created_at >= ?', [companyId, startOfMonth]);
    const leadsLastMonth = n('SELECT COUNT(*) as c FROM leads WHERE company_id = ? AND created_at >= ? AND created_at <= ?', [companyId, startOfLastMonth, endOfLastMonth]);
    const totalContacts = n('SELECT COUNT(*) as c FROM contacts WHERE company_id = ?', [companyId]);
    const openOpps = n('SELECT COUNT(*) as c FROM opportunities WHERE company_id = ? AND status = ?', [companyId, 'open']);
    const wonOpps = n('SELECT COUNT(*) as c FROM opportunities WHERE company_id = ? AND status = ?', [companyId, 'won']);
    const pendingTasks = n('SELECT COUNT(*) as c FROM crm_tasks WHERE company_id = ? AND status = ?', [companyId, 'pending']);
    const overdueTasks = n('SELECT COUNT(*) as c FROM crm_tasks WHERE company_id = ? AND status != ? AND due_date < ?', [companyId, 'completed', nowIso]);

    const oppValueRow = get<{ s: number }>('SELECT COALESCE(SUM(amount), 0) as s FROM opportunities WHERE company_id = ? AND status = ?', [companyId, 'open']);
    const oppValue = Number(oppValueRow?.s || 0);

    const growth = leadsLastMonth > 0 ? Math.round(((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100) : leadsThisMonth > 0 ? 100 : 0;

    const recentActivities = all<Record<string, unknown>>(`
      SELECT a.id, a.type, a.subject, a.created_at, u.first_name, u.last_name, u.avatar_url
      FROM activities a JOIN users u ON a.owner_id = u.id
      WHERE a.company_id = ? ORDER BY a.created_at DESC LIMIT 5
    `, [companyId]);

    const leadsBySource = all<{ source: string; count: number }>(`
      SELECT COALESCE(source, 'Sin fuente') as source, COUNT(*) as count
      FROM leads WHERE company_id = ? GROUP BY source
    `, [companyId]);

    const oppByStage = all<Record<string, unknown>>(`
      SELECT o.stage_id, s.name as stage_name, s.color,
             COUNT(*) as count, COALESCE(SUM(o.amount), 0) as value
      FROM opportunities o JOIN pipeline_stages s ON o.stage_id = s.id
      WHERE o.company_id = ? AND o.status = 'open'
      GROUP BY o.stage_id, s.name, s.color
    `, [companyId]);

    const monthlyLeads = this.getMonthlyLeads(companyId);

    return {
      kpis: {
        totalLeads: { value: totalLeads, growth },
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
      monthlyLeads,
    };
  }

  private getMonthlyLeads(companyId: string) {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const idx = 5 - i;
      const start = new Date(now.getFullYear(), now.getMonth() - idx, 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() - idx + 1, 0, 23, 59, 59).toISOString();
      const row = get<{ c: number }>('SELECT COUNT(*) as c FROM leads WHERE company_id = ? AND created_at >= ? AND created_at <= ?', [companyId, start, end]);
      const d = new Date(now.getFullYear(), now.getMonth() - idx, 1);
      return { month: d.toLocaleString('es-MX', { month: 'short' }), leads: Number(row?.c || 0) };
    });
  }
}
