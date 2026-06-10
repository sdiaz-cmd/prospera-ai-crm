import { get, all, run } from '../../database/db';
import { v4 as uuid } from 'uuid';

interface PageRow {
  id: string; company_id: string; created_by: string; name: string; slug: string;
  headline: string; subheadline: string; description: string; cta_text: string;
  primary_color: string; bg_color: string; logo_text: string;
  show_phone: number; show_company: number; show_message: number;
  is_active: number; views: number; submissions: number;
  created_at: string; updated_at: string;
  creator_first?: string; creator_last?: string;
}

function fmt(row: PageRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    headline: row.headline,
    subheadline: row.subheadline,
    description: row.description,
    ctaText: row.cta_text,
    primaryColor: row.primary_color,
    bgColor: row.bg_color,
    logoText: row.logo_text,
    showPhone: !!row.show_phone,
    showCompany: !!row.show_company,
    showMessage: !!row.show_message,
    isActive: !!row.is_active,
    views: Number(row.views || 0),
    submissions: Number(row.submissions || 0),
    conversionRate: row.views > 0 ? Math.round((row.submissions / row.views) * 100) : 0,
    creator: row.creator_first ? `${row.creator_first} ${row.creator_last || ''}`.trim() : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publicUrl: `/p/${row.slug}`,
  };
}

function slugify(text: string) {
  return text.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

function uniqueSlug(base: string): string {
  let slug = base;
  let attempt = 0;
  while (true) {
    const existing = get('SELECT id FROM landing_pages WHERE slug = ?', [slug]);
    if (!existing) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

export class LandingService {
  findAll(companyId: string) {
    const rows = all<PageRow>(`
      SELECT lp.*, u.first_name as creator_first, u.last_name as creator_last
      FROM landing_pages lp LEFT JOIN users u ON lp.created_by = u.id
      WHERE lp.company_id = ? ORDER BY lp.created_at DESC
    `, [companyId]);
    return rows.map(fmt);
  }

  findById(id: string, companyId: string) {
    const row = get<PageRow>(`
      SELECT lp.*, u.first_name as creator_first, u.last_name as creator_last
      FROM landing_pages lp LEFT JOIN users u ON lp.created_by = u.id
      WHERE lp.id = ? AND lp.company_id = ?
    `, [id, companyId]);
    return row ? fmt(row) : null;
  }

  // Public — by slug only (no company_id check, slug is globally unique)
  findBySlug(slug: string) {
    const row = get<PageRow>(`
      SELECT lp.*, u.first_name as creator_first, u.last_name as creator_last
      FROM landing_pages lp LEFT JOIN users u ON lp.created_by = u.id
      WHERE lp.slug = ? AND lp.is_active = 1
    `, [slug]);
    if (!row) return null;
    // Increment views
    run('UPDATE landing_pages SET views = views + 1 WHERE id = ?', [row.id]);
    return fmt(row);
  }

  getStats(companyId: string) {
    const total = Number((get<{ c: number }>('SELECT COUNT(*) as c FROM landing_pages WHERE company_id = ?', [companyId]))?.c || 0);
    const active = Number((get<{ c: number }>('SELECT COUNT(*) as c FROM landing_pages WHERE company_id = ? AND is_active = 1', [companyId]))?.c || 0);
    const totalViews = Number((get<{ s: number }>('SELECT COALESCE(SUM(views),0) as s FROM landing_pages WHERE company_id = ?', [companyId]))?.s || 0);
    const totalSubm = Number((get<{ s: number }>('SELECT COALESCE(SUM(submissions),0) as s FROM landing_pages WHERE company_id = ?', [companyId]))?.s || 0);
    const avgConv = totalViews > 0 ? Math.round((totalSubm / totalViews) * 100) : 0;
    return { total, active, totalViews, totalSubmissions: totalSubm, avgConversion: avgConv };
  }

  create(companyId: string, userId: string, body: {
    name: string; headline: string; subheadline?: string; description?: string;
    ctaText?: string; primaryColor?: string; bgColor?: string; logoText?: string;
    showPhone?: boolean; showCompany?: boolean; showMessage?: boolean;
  }) {
    const id = uuid();
    const slug = uniqueSlug(slugify(body.name));
    run(`INSERT INTO landing_pages
      (id, company_id, created_by, name, slug, headline, subheadline, description,
       cta_text, primary_color, bg_color, logo_text,
       show_phone, show_company, show_message, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      [id, companyId, userId, body.name, slug,
        body.headline, body.subheadline || null, body.description || null,
        body.ctaText || 'Enviar',
        body.primaryColor || '#6366f1', body.bgColor || '#ffffff',
        body.logoText || null,
        body.showPhone ? 1 : 0, body.showCompany ? 1 : 0,
        body.showMessage !== false ? 1 : 0]);
    return this.findById(id, companyId);
  }

  update(id: string, companyId: string, body: Partial<{
    name: string; headline: string; subheadline: string; description: string;
    ctaText: string; primaryColor: string; bgColor: string; logoText: string;
    showPhone: boolean; showCompany: boolean; showMessage: boolean; isActive: boolean;
  }>) {
    const existing = get('SELECT id FROM landing_pages WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!existing) throw new Error('Página no encontrada');
    run(`UPDATE landing_pages SET
      name = COALESCE(?, name),
      headline = COALESCE(?, headline),
      subheadline = COALESCE(?, subheadline),
      description = COALESCE(?, description),
      cta_text = COALESCE(?, cta_text),
      primary_color = COALESCE(?, primary_color),
      bg_color = COALESCE(?, bg_color),
      logo_text = COALESCE(?, logo_text),
      show_phone = COALESCE(?, show_phone),
      show_company = COALESCE(?, show_company),
      show_message = COALESCE(?, show_message),
      is_active = COALESCE(?, is_active),
      updated_at = datetime('now')
      WHERE id = ? AND company_id = ?`,
      [body.name || null, body.headline || null, body.subheadline ?? null,
        body.description ?? null, body.ctaText || null,
        body.primaryColor || null, body.bgColor || null, body.logoText ?? null,
        body.showPhone !== undefined ? (body.showPhone ? 1 : 0) : null,
        body.showCompany !== undefined ? (body.showCompany ? 1 : 0) : null,
        body.showMessage !== undefined ? (body.showMessage ? 1 : 0) : null,
        body.isActive !== undefined ? (body.isActive ? 1 : 0) : null,
        id, companyId]);
    return this.findById(id, companyId);
  }

  submit(slug: string, data: {
    name: string; email?: string; phone?: string; company?: string; message?: string; ip?: string;
  }) {
    const page = get<{ id: string; company_id: string; is_active: number }>(
      'SELECT id, company_id, is_active FROM landing_pages WHERE slug = ?', [slug]);
    if (!page || !page.is_active) throw new Error('Página no encontrada');

    // Create lead
    const leadId = uuid();
    const firstName = data.name.split(' ')[0];
    const lastName = data.name.split(' ').slice(1).join(' ') || '';
    run(`INSERT INTO leads (id, company_id, first_name, last_name, email, phone, company, source, status, score, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'web', 'new', 50, ?)`,
      [leadId, page.company_id, firstName, lastName,
        data.email || null, data.phone || null, data.company || null,
        data.message ? `Mensaje: ${data.message}` : null]);

    // Record submission
    run(`INSERT INTO landing_submissions (id, landing_page_id, company_id, lead_id, name, email, phone, company, message, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), page.id, page.company_id, leadId,
        data.name, data.email || null, data.phone || null,
        data.company || null, data.message || null, data.ip || null]);

    // Increment submissions count
    run('UPDATE landing_pages SET submissions = submissions + 1 WHERE id = ?', [page.id]);

    return { success: true, leadId };
  }

  getSubmissions(id: string, companyId: string) {
    const page = get('SELECT id FROM landing_pages WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!page) throw new Error('Página no encontrada');
    return all<Record<string, unknown>>(`
      SELECT ls.*, l.score as lead_score
      FROM landing_submissions ls
      LEFT JOIN leads l ON ls.lead_id = l.id
      WHERE ls.landing_page_id = ? ORDER BY ls.created_at DESC
    `, [id]);
  }

  delete(id: string, companyId: string) {
    const existing = get('SELECT id FROM landing_pages WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!existing) throw new Error('Página no encontrada');
    run('DELETE FROM landing_pages WHERE id = ? AND company_id = ?', [id, companyId]);
  }
}
