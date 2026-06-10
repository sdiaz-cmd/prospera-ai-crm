import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';

export interface ApolloSearchParams {
  name?: string;
  title?: string;
  organization?: string;
  location?: string;
  industry?: string;
  page?: number;
  perPage?: number;
}

export interface ApolloContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  organization: string | null;
  city: string | null;
  country: string | null;
  linkedinUrl: string | null;
}

// ─── Permission helpers ───────────────────────────────────────────────────────

/**
 * Returns true if the user (by userId) can use Apollo search in the given company.
 * Logic:
 *   - Owner always can.
 *   - If apollo_search_roles is set → check if user's role_id is in the list.
 *   - If NOT set → fallback: allow roles whose name contains 'gerencia' or 'admin'.
 */
export function canUserUseApollo(companyId: string, userId: string): boolean {
  const uc = get<{ is_owner: number; role_id: string }>(
    'SELECT uc.is_owner, uc.role_id FROM user_companies uc WHERE uc.user_id = ? AND uc.company_id = ?',
    [userId, companyId],
  );
  if (!uc) return false;
  if (uc.is_owner) return true;

  const company = get<{ apollo_search_roles: string | null }>(
    'SELECT apollo_search_roles FROM companies WHERE id = ?',
    [companyId],
  );

  const rolesJson = company?.apollo_search_roles;

  if (rolesJson) {
    // Explicit list of role IDs
    const allowed: string[] = JSON.parse(rolesJson);
    return allowed.includes(uc.role_id);
  }

  // Fallback: allow if role name contains 'gerencia' or 'admin'
  const role = get<{ name: string }>(
    'SELECT name FROM roles WHERE id = ?',
    [uc.role_id],
  );
  const name = (role?.name || '').toLowerCase();
  return name.includes('gerencia') || name.includes('admin');
}

// ─── Apollo API call ──────────────────────────────────────────────────────────

export async function searchApolloContacts(
  apiKey: string,
  params: ApolloSearchParams,
): Promise<{ contacts: ApolloContact[]; total: number }> {
  const page = params.page || 1;
  const perPage = Math.min(params.perPage || 25, 50);

  const body: Record<string, unknown> = {
    api_key: apiKey,
    page,
    per_page: perPage,
  };

  if (params.name) body.q_keywords = params.name;

  const personTitles: string[] = [];
  if (params.title) personTitles.push(params.title);
  if (personTitles.length) body.person_titles = personTitles;

  if (params.organization) body.q_organization_name = params.organization;

  const locations: string[] = [];
  if (params.location) locations.push(params.location);
  if (locations.length) body.person_locations = locations;

  const industries: string[] = [];
  if (params.industry) industries.push(params.industry);
  if (industries.length) body.organization_industry_tag_ids = industries;

  const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apollo API error ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json() as {
    people?: Record<string, unknown>[];
    pagination?: { total_entries?: number };
  };

  const contacts: ApolloContact[] = (data.people || []).map((p: Record<string, unknown>) => ({
    id: (p.id as string) || uuid(),
    firstName: (p.first_name as string) || '',
    lastName: (p.last_name as string) || '',
    email: (p.email as string) || null,
    phone: (p.phone_numbers as Record<string, string>[])?.[0]?.sanitized_number || null,
    title: (p.title as string) || null,
    organization: (p.organization as Record<string, string>)?.name || (p.organization_name as string) || null,
    city: (p.city as string) || null,
    country: (p.country as string) || null,
    linkedinUrl: (p.linkedin_url as string) || null,
  }));

  return {
    contacts,
    total: data.pagination?.total_entries || contacts.length,
  };
}

// ─── Round-robin for Apollo imports ──────────────────────────────────────────

function getNextAssignee(companyId: string): string | null {
  const users = all<{ id: string }>(
    `SELECT u.id FROM users u
     JOIN user_companies uc ON uc.user_id = u.id
     WHERE uc.company_id = ? AND uc.is_active = 1 AND u.is_active = 1
     ORDER BY u.first_name`,
    [companyId],
  );
  if (!users.length) return null;

  const state = get<{ last_assigned_user_id: string }>(
    'SELECT last_assigned_user_id FROM assignment_state WHERE company_id = ?',
    [companyId],
  );

  let nextUser = users[0];
  if (state?.last_assigned_user_id) {
    const idx = users.findIndex(u => u.id === state.last_assigned_user_id);
    nextUser = users[(idx + 1) % users.length];
  }

  const existing = get('SELECT id FROM assignment_state WHERE company_id = ?', [companyId]);
  if (existing) {
    run("UPDATE assignment_state SET last_assigned_user_id = ?, updated_at = datetime('now') WHERE company_id = ?",
      [nextUser.id, companyId]);
  } else {
    run('INSERT INTO assignment_state (id, company_id, last_assigned_user_id) VALUES (?, ?, ?)',
      [uuid(), companyId, nextUser.id]);
  }
  return nextUser.id;
}

// ─── Import prospects ─────────────────────────────────────────────────────────

export interface ImportResult {
  imported: number;
  skipped: number;
  leads: { id: string; firstName: string; assigneeId: string | null }[];
}

export function importProspects(companyId: string, contacts: ApolloContact[]): ImportResult {
  let imported = 0;
  let skipped = 0;
  const leads: ImportResult['leads'] = [];

  for (const c of contacts) {
    // Skip if already exists (by email or by similar name+company)
    if (c.email) {
      const exists = get('SELECT id FROM leads WHERE company_id = ? AND email = ?', [companyId, c.email]);
      if (exists) { skipped++; continue; }
    }

    const assigneeId = getNextAssignee(companyId);
    const leadId = uuid();

    run(
      `INSERT INTO leads
        (id, company_id, assignee_id, first_name, last_name, email, phone,
         company, position, source, status, score, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'apollo', 'new', 70, ?, datetime('now'), datetime('now'))`,
      [
        leadId, companyId, assigneeId,
        c.firstName || 'Prospecto', c.lastName || '',
        c.email || null, c.phone || null,
        c.organization || null, c.title || null,
        c.linkedinUrl ? `LinkedIn: ${c.linkedinUrl}` : null,
      ],
    );

    imported++;
    leads.push({ id: leadId, firstName: c.firstName, assigneeId });
  }

  return { imported, skipped, leads };
}

// ─── Settings helpers ─────────────────────────────────────────────────────────

export function getApolloSettings(companyId: string) {
  const company = get<{
    apollo_api_key: string | null;
    apollo_search_roles: string | null;
  }>(
    'SELECT apollo_api_key, apollo_search_roles FROM companies WHERE id = ?',
    [companyId],
  );

  const roles = all<{ id: string; name: string }>(
    'SELECT id, name FROM roles WHERE company_id = ? ORDER BY name',
    [companyId],
  );

  return {
    apiKey: company?.apollo_api_key || null,
    searchRoles: company?.apollo_search_roles
      ? JSON.parse(company.apollo_search_roles) as string[]
      : [],
    availableRoles: roles,
  };
}

export function updateApolloSettings(
  companyId: string,
  data: { apiKey?: string; searchRoles?: string[] },
) {
  if (data.apiKey !== undefined) {
    run("UPDATE companies SET apollo_api_key = ?, updated_at = datetime('now') WHERE id = ?",
      [data.apiKey || null, companyId]);
  }
  if (data.searchRoles !== undefined) {
    run("UPDATE companies SET apollo_search_roles = ?, updated_at = datetime('now') WHERE id = ?",
      [data.searchRoles.length ? JSON.stringify(data.searchRoles) : null, companyId]);
  }
  return getApolloSettings(companyId);
}
