import { run, get } from '../../database/db';

export class CompaniesService {
  async getSettings(companyId: string) {
    return get('SELECT id, name, slug, logo_url, website, phone, email, address, city, country, timezone, currency, plan, plan_status, trial_ends_at, is_active, created_at FROM companies WHERE id = ?', [companyId]);
  }

  async updateSettings(companyId: string, data: Record<string, unknown>) {
    const allowed = ['name', 'website', 'phone', 'email', 'address', 'city', 'country', 'timezone', 'currency'];
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const key of allowed) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key]); }
    }
    if (fields.length > 0) {
      values.push(new Date().toISOString(), companyId);
      run(`UPDATE companies SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`, values);
    }
    return this.getSettings(companyId);
  }

  async getStats(companyId: string) {
    const q = (sql: string, p: unknown[]) => Number((get<{ c: number }>(sql, p))?.c || 0);
    return {
      users: q('SELECT COUNT(*) as c FROM user_companies WHERE company_id = ? AND is_active = 1', [companyId]),
      leads: q('SELECT COUNT(*) as c FROM leads WHERE company_id = ?', [companyId]),
      contacts: q('SELECT COUNT(*) as c FROM contacts WHERE company_id = ?', [companyId]),
      opportunities: q('SELECT COUNT(*) as c FROM opportunities WHERE company_id = ? AND status = ?', [companyId, 'open']),
      tasks: q('SELECT COUNT(*) as c FROM crm_tasks WHERE company_id = ? AND status != ?', [companyId, 'completed']),
    };
  }
}
