import { db } from './db';

export function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      logo_url TEXT,
      website TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      timezone TEXT DEFAULT 'America/Mexico_City',
      currency TEXT DEFAULT 'MXN',
      plan TEXT DEFAULT 'trial',
      plan_status TEXT DEFAULT 'active',
      trial_ends_at TEXT,
      is_active INTEGER DEFAULT 1,
      apollo_api_key TEXT,
      apollo_search_roles TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      avatar_url TEXT,
      is_active INTEGER DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      is_system INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      UNIQUE(company_id, name)
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT,
      UNIQUE(module, action)
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      UNIQUE(role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_companies (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      is_owner INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, company_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      is_revoked INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pipelines (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pipeline_stages (
      id TEXT PRIMARY KEY,
      pipeline_id TEXT NOT NULL,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      probability INTEGER DEFAULT 0,
      color TEXT DEFAULT '#6366f1',
      FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      assignee_id TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      company TEXT,
      position TEXT,
      source TEXT,
      status TEXT DEFAULT 'new',
      score INTEGER DEFAULT 0,
      notes TEXT,
      tags TEXT,
      converted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      account_id TEXT,
      assignee_id TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      mobile TEXT,
      position TEXT,
      department TEXT,
      source TEXT,
      status TEXT DEFAULT 'active',
      lead_score INTEGER DEFAULT 0,
      notes TEXT,
      tags TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      assignee_id TEXT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      website TEXT,
      industry TEXT,
      company_size TEXT,
      annual_revenue REAL,
      address TEXT,
      city TEXT,
      country TEXT,
      notes TEXT,
      tags TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      account_id TEXT,
      contact_id TEXT,
      assignee_id TEXT,
      stage_id TEXT,
      name TEXT NOT NULL,
      amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'MXN',
      probability INTEGER DEFAULT 50,
      close_date TEXT,
      closed_at TEXT,
      status TEXT DEFAULT 'open',
      source TEXT,
      notes TEXT,
      tags TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      lead_id TEXT,
      contact_id TEXT,
      opportunity_id TEXT,
      type TEXT NOT NULL DEFAULT 'note',
      subject TEXT,
      body TEXT,
      outcome TEXT,
      scheduled_at TEXT,
      completed_at TEXT,
      duration_minutes INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS crm_tasks (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      assignee_id TEXT,
      created_by TEXT,
      lead_id TEXT,
      contact_id TEXT,
      opportunity_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      due_date TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      opportunity_id TEXT,
      contact_id TEXT,
      account_id TEXT,
      assignee_id TEXT,
      number TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      subtotal REAL DEFAULT 0,
      discount_type TEXT DEFAULT 'percent',
      discount_value REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      currency TEXT DEFAULT 'MXN',
      valid_until TEXT,
      notes TEXT,
      terms TEXT,
      sent_at TEXT,
      accepted_at TEXT,
      rejected_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS quote_items (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL,
      description TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit_price REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
    );

    -- ── ERP ─────────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      website TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      tax_id TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      supplier_id TEXT,
      sku TEXT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      unit TEXT DEFAULT 'pza',
      sale_price REAL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      tax_rate REAL DEFAULT 16,
      track_inventory INTEGER DEFAULT 1,
      stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      stock_after REAL DEFAULT 0,
      reference TEXT,
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      contact_id TEXT,
      account_id TEXT,
      opportunity_id TEXT,
      quote_id TEXT,
      assignee_id TEXT,
      number TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      subtotal REAL DEFAULT 0,
      discount_type TEXT DEFAULT 'percent',
      discount_value REAL DEFAULT 0,
      tax_rate REAL DEFAULT 16,
      tax_amount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      currency TEXT DEFAULT 'MXN',
      issue_date TEXT,
      due_date TEXT,
      paid_at TEXT,
      notes TEXT,
      terms TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      product_id TEXT,
      description TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit_price REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- ── Landing Pages ────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS landing_pages (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      created_by TEXT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      headline TEXT NOT NULL,
      subheadline TEXT,
      description TEXT,
      cta_text TEXT DEFAULT 'Enviar',
      primary_color TEXT DEFAULT '#6366f1',
      bg_color TEXT DEFAULT '#ffffff',
      logo_text TEXT,
      show_phone INTEGER DEFAULT 0,
      show_company INTEGER DEFAULT 0,
      show_message INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      views INTEGER DEFAULT 0,
      submissions INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS landing_submissions (
      id TEXT PRIMARY KEY,
      landing_page_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      lead_id TEXT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      message TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (landing_page_id) REFERENCES landing_pages(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );

    -- ── Marketing ────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      created_by TEXT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'email',
      status TEXT DEFAULT 'draft',
      subject TEXT,
      preview_text TEXT,
      body TEXT,
      segment_source TEXT,
      segment_status TEXT,
      scheduled_at TEXT,
      sent_at TEXT,
      recipient_count INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      open_count INTEGER DEFAULT 0,
      click_count INTEGER DEFAULT 0,
      bounce_count INTEGER DEFAULT 0,
      unsubscribe_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS campaign_contacts (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      lead_id TEXT,
      contact_id TEXT,
      email TEXT NOT NULL,
      name TEXT,
      status TEXT DEFAULT 'pending',
      sent_at TEXT,
      opened_at TEXT,
      clicked_at TEXT,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id),
      FOREIGN KEY (contact_id) REFERENCES contacts(id)
    );

    -- ── Webhook / Integraciones ──────────────────────────────────────

    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'whatsapp',
      phone TEXT,
      lead_id TEXT,
      direction TEXT DEFAULT 'inbound',
      message TEXT,
      raw_payload TEXT,
      processed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );

    CREATE TABLE IF NOT EXISTS assignment_state (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL UNIQUE,
      last_assigned_user_id TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Tabla de reset de contraseña ────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ── Columnas Apollo (migración incremental para DBs existentes) ──
  try { db.exec('ALTER TABLE companies ADD COLUMN apollo_api_key TEXT'); } catch { /* ya existe */ }
  try { db.exec('ALTER TABLE companies ADD COLUMN apollo_search_roles TEXT'); } catch { /* ya existe */ }

  // ── Tabla de invitaciones ────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_invitations (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role_id TEXT NOT NULL,
      invited_by TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      accepted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id),
      FOREIGN KEY (invited_by) REFERENCES users(id)
    );
  `);
}
