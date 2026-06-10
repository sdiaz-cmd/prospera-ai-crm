import { get, all } from '../../database/db';

export class ReportsService {

  getSalesReport(companyId: string) {
    const now = new Date();

    // Monthly revenue (won opportunities) — last 6 months
    const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
      const idx = 5 - i;
      const start = new Date(now.getFullYear(), now.getMonth() - idx, 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() - idx + 1, 0, 23, 59, 59).toISOString();
      const won = get<{ s: number; c: number }>(
        `SELECT COALESCE(SUM(amount),0) as s, COUNT(*) as c FROM opportunities
         WHERE company_id = ? AND status = 'won' AND closed_at >= ? AND closed_at <= ?`,
        [companyId, start, end]);
      const d = new Date(now.getFullYear(), now.getMonth() - idx, 1);
      return {
        month: d.toLocaleString('es-MX', { month: 'short' }),
        revenue: Number(won?.s || 0),
        deals: Number(won?.c || 0),
      };
    });

    // Total metrics
    const totalWon = get<{ s: number; c: number }>(
      `SELECT COALESCE(SUM(amount),0) as s, COUNT(*) as c FROM opportunities WHERE company_id = ? AND status = 'won'`,
      [companyId]);
    const totalOpen = get<{ s: number; c: number }>(
      `SELECT COALESCE(SUM(amount),0) as s, COUNT(*) as c FROM opportunities WHERE company_id = ? AND status = 'open'`,
      [companyId]);
    const totalLost = get<{ c: number }>(
      `SELECT COUNT(*) as c FROM opportunities WHERE company_id = ? AND status = 'lost'`, [companyId]);

    const wonCount = Number(totalWon?.c || 0);
    const lostCount = Number(totalLost?.c || 0);
    const winRate = (wonCount + lostCount) > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;

    // Forecast (open * probability/100)
    const forecastRow = get<{ s: number }>(
      `SELECT COALESCE(SUM(amount * probability / 100.0), 0) as s FROM opportunities WHERE company_id = ? AND status = 'open'`,
      [companyId]);
    const forecast = Number(forecastRow?.s || 0);

    return {
      monthlyRevenue,
      kpis: {
        totalRevenue: Number(totalWon?.s || 0),
        wonDeals: wonCount,
        openPipelineValue: Number(totalOpen?.s || 0),
        openDeals: Number(totalOpen?.c || 0),
        winRate,
        forecast: Math.round(forecast),
      },
    };
  }

  getLeadsReport(companyId: string) {
    const now = new Date();

    // Monthly leads — last 6 months
    const monthlyLeads = Array.from({ length: 6 }, (_, i) => {
      const idx = 5 - i;
      const start = new Date(now.getFullYear(), now.getMonth() - idx, 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() - idx + 1, 0, 23, 59, 59).toISOString();
      const row = get<{ c: number }>(
        `SELECT COUNT(*) as c FROM leads WHERE company_id = ? AND created_at >= ? AND created_at <= ?`,
        [companyId, start, end]);
      const conv = get<{ c: number }>(
        `SELECT COUNT(*) as c FROM leads WHERE company_id = ? AND status = 'converted' AND created_at >= ? AND created_at <= ?`,
        [companyId, start, end]);
      const d = new Date(now.getFullYear(), now.getMonth() - idx, 1);
      return {
        month: d.toLocaleString('es-MX', { month: 'short' }),
        leads: Number(row?.c || 0),
        converted: Number(conv?.c || 0),
      };
    });

    // By source
    const bySource = all<{ source: string; count: number }>(
      `SELECT COALESCE(source, 'Sin fuente') as source, COUNT(*) as count
       FROM leads WHERE company_id = ? GROUP BY source ORDER BY count DESC`,
      [companyId]);

    // By status
    const byStatus = all<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM leads WHERE company_id = ? GROUP BY status ORDER BY count DESC`,
      [companyId]);

    // Score distribution
    const highScore = Number((get<{ c: number }>(`SELECT COUNT(*) as c FROM leads WHERE company_id = ? AND score >= 70`, [companyId]))?.c || 0);
    const midScore  = Number((get<{ c: number }>(`SELECT COUNT(*) as c FROM leads WHERE company_id = ? AND score >= 40 AND score < 70`, [companyId]))?.c || 0);
    const lowScore  = Number((get<{ c: number }>(`SELECT COUNT(*) as c FROM leads WHERE company_id = ? AND score < 40`, [companyId]))?.c || 0);

    const totalLeads = Number((get<{ c: number }>(`SELECT COUNT(*) as c FROM leads WHERE company_id = ?`, [companyId]))?.c || 0);
    const converted  = Number((get<{ c: number }>(`SELECT COUNT(*) as c FROM leads WHERE company_id = ? AND status = 'converted'`, [companyId]))?.c || 0);
    const convRate   = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;
    const avgScore   = Number((get<{ a: number }>(`SELECT COALESCE(AVG(score),0) as a FROM leads WHERE company_id = ?`, [companyId]))?.a || 0);

    return {
      monthlyLeads,
      bySource: bySource.map(r => ({ ...r, count: Number(r.count) })),
      byStatus: byStatus.map(r => ({ ...r, count: Number(r.count) })),
      scoreDistribution: [
        { label: 'Alto (70-100)', value: highScore, color: '#10b981' },
        { label: 'Medio (40-69)', value: midScore,  color: '#f59e0b' },
        { label: 'Bajo (0-39)',   value: lowScore,  color: '#ef4444' },
      ],
      kpis: {
        totalLeads,
        converted,
        conversionRate: convRate,
        avgScore: Math.round(avgScore),
      },
    };
  }

  getPipelineReport(companyId: string) {
    // By stage
    const byStage = all<Record<string, unknown>>(
      `SELECT s.name as stage, s.color, s.order_index,
              COUNT(o.id) as count,
              COALESCE(SUM(o.amount), 0) as value,
              COALESCE(AVG(o.probability), 0) as avg_prob
       FROM pipeline_stages s
       LEFT JOIN opportunities o ON o.stage_id = s.id AND o.company_id = ? AND o.status = 'open'
       WHERE s.pipeline_id IN (SELECT id FROM pipelines WHERE company_id = ?)
       GROUP BY s.id, s.name, s.color, s.order_index
       ORDER BY s.order_index`,
      [companyId, companyId]);

    // Avg deal size
    const avgDeal = get<{ a: number }>(
      `SELECT COALESCE(AVG(amount),0) as a FROM opportunities WHERE company_id = ? AND status = 'open'`,
      [companyId]);

    // Avg close time (days) for won deals
    const avgClose = get<{ a: number }>(
      `SELECT COALESCE(AVG(julianday(closed_at) - julianday(created_at)), 0) as a
       FROM opportunities WHERE company_id = ? AND status = 'won' AND closed_at IS NOT NULL`,
      [companyId]);

    return {
      byStage: byStage.map(s => ({
        stage: s.stage as string,
        color: s.color as string,
        count: Number(s.count),
        value: Number(s.value),
        avgProbability: Math.round(Number(s.avg_prob)),
      })),
      kpis: {
        avgDealSize: Math.round(Number(avgDeal?.a || 0)),
        avgCloseDays: Math.round(Number(avgClose?.a || 0)),
      },
    };
  }

  getTeamReport(companyId: string) {
    // Activities by user
    const actByUser = all<Record<string, unknown>>(
      `SELECT u.first_name, u.last_name,
              COUNT(a.id) as total_activities,
              SUM(CASE WHEN a.type = 'call' THEN 1 ELSE 0 END) as calls,
              SUM(CASE WHEN a.type = 'email' THEN 1 ELSE 0 END) as emails,
              SUM(CASE WHEN a.type = 'meeting' THEN 1 ELSE 0 END) as meetings
       FROM users u
       JOIN user_companies uc ON uc.user_id = u.id AND uc.company_id = ?
       LEFT JOIN activities a ON a.owner_id = u.id AND a.company_id = ?
       GROUP BY u.id, u.first_name, u.last_name
       ORDER BY total_activities DESC`,
      [companyId, companyId]);

    // Tasks by user
    const tasksByUser = all<Record<string, unknown>>(
      `SELECT u.first_name, u.last_name,
              COUNT(t.id) as total,
              SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) as pending
       FROM users u
       JOIN user_companies uc ON uc.user_id = u.id AND uc.company_id = ?
       LEFT JOIN crm_tasks t ON t.assignee_id = u.id AND t.company_id = ?
       GROUP BY u.id, u.first_name, u.last_name`,
      [companyId, companyId]);

    // Won opps by user
    const wonByUser = all<Record<string, unknown>>(
      `SELECT u.first_name, u.last_name,
              COUNT(o.id) as won_deals,
              COALESCE(SUM(o.amount), 0) as revenue
       FROM users u
       JOIN user_companies uc ON uc.user_id = u.id AND uc.company_id = ?
       LEFT JOIN opportunities o ON o.assignee_id = u.id AND o.company_id = ? AND o.status = 'won'
       GROUP BY u.id, u.first_name, u.last_name
       ORDER BY revenue DESC`,
      [companyId, companyId]);

    return {
      activityByUser: actByUser.map(r => ({
        name: `${r.first_name} ${r.last_name}`.trim(),
        total: Number(r.total_activities),
        calls: Number(r.calls),
        emails: Number(r.emails),
        meetings: Number(r.meetings),
      })),
      tasksByUser: tasksByUser.map(r => ({
        name: `${r.first_name} ${r.last_name}`.trim(),
        total: Number(r.total),
        completed: Number(r.completed),
        pending: Number(r.pending),
      })),
      wonByUser: wonByUser.map(r => ({
        name: `${r.first_name} ${r.last_name}`.trim(),
        wonDeals: Number(r.won_deals),
        revenue: Number(r.revenue),
      })),
    };
  }
}
