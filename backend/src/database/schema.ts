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

  // ── Columnas Google OAuth (migración incremental) ──
  try { db.exec('ALTER TABLE users ADD COLUMN google_id TEXT'); } catch { /* ya existe */ }
  try { db.exec('ALTER TABLE users ADD COLUMN google_refresh_token TEXT'); } catch { /* ya existe */ }
  try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL'); } catch { /* ya existe */ }

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

  // ── Configuración del Agente WhatsApp IA ─────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_agent_config (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1,
      agent_name TEXT DEFAULT 'Asistente',
      business_description TEXT DEFAULT '',
      business_hours TEXT DEFAULT '',
      tone TEXT DEFAULT 'amigable',
      main_goal TEXT DEFAULT 'capturar_lead',
      greeting TEXT DEFAULT '',
      qualification_questions TEXT DEFAULT '[]',
      knowledge_base TEXT DEFAULT '[]',
      special_announcement TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);

  // ── Comisiones ────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS commission_rules (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      category_name TEXT NOT NULL,
      percentage REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS commission_records (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rule_id TEXT,
      source_type TEXT NOT NULL DEFAULT 'manual',
      source_id TEXT,
      source_description TEXT NOT NULL DEFAULT '',
      base_amount REAL NOT NULL DEFAULT 0,
      percentage REAL NOT NULL DEFAULT 0,
      commission_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pendiente',
      notes TEXT,
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ── Tickets de soporte ────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'consulta',
      priority TEXT NOT NULL DEFAULT 'media',
      status TEXT NOT NULL DEFAULT 'abierto',
      admin_notes TEXT,
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ── Centro de costos ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS cost_centers (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      client TEXT,
      status TEXT NOT NULL DEFAULT 'activo',
      start_date TEXT,
      end_date TEXT,
      budget REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cost_entries (
      id TEXT PRIMARY KEY,
      cost_center_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('ingreso','gasto')),
      category TEXT NOT NULL DEFAULT 'General',
      description TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);

  // ── Conversaciones WhatsApp ────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_conversations (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      phone TEXT NOT NULL,
      contact_id TEXT,
      lead_id TEXT,
      contact_name TEXT,
      unread_count INTEGER DEFAULT 0,
      last_message TEXT DEFAULT '',
      last_message_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(company_id, phone),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);

  // ── Mensajes WhatsApp ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      phone TEXT NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
      body TEXT NOT NULL,
      is_bot INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);

  // ── Módulo Operaciones ────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,

      -- Origin
      origin TEXT NOT NULL DEFAULT 'manual',
      origin_id TEXT,

      -- Type & priority
      type TEXT NOT NULL DEFAULT 'other',
      priority TEXT NOT NULL DEFAULT 'media',
      status TEXT NOT NULL DEFAULT 'creado',

      -- Client (linked or free text)
      account_id TEXT,
      contact_id TEXT,
      client_name TEXT,
      client_email TEXT,
      client_phone TEXT,

      -- Location
      address TEXT,
      city TEXT,
      region TEXT,
      country TEXT DEFAULT 'Chile',
      coordinates TEXT,

      -- Team
      seller_id TEXT,
      service_chief_id TEXT,
      lead_tech_id TEXT,
      cuadrilla_id TEXT,

      -- Dates
      commitment_date TEXT,
      installation_date TEXT,
      delivery_date TEXT,
      close_date TEXT,

      -- Financials (hidden from techs)
      sale_amount REAL DEFAULT 0,
      estimated_cost REAL DEFAULT 0,
      actual_cost REAL DEFAULT 0,
      estimated_hours REAL DEFAULT 0,
      actual_hours REAL DEFAULT 0,

      -- Notes
      commercial_notes TEXT,
      technical_notes TEXT,
      risks TEXT,

      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_team (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'tecnico',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_logs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT,
      type TEXT NOT NULL DEFAULT 'event',
      title TEXT NOT NULL,
      description TEXT,
      old_value TEXT,
      new_value TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      parent_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pendiente',
      priority TEXT DEFAULT 'media',
      assigned_to TEXT,
      due_date TEXT,
      estimated_hours REAL DEFAULT 0,
      actual_hours REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_checklist_items (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      item TEXT NOT NULL,
      is_required INTEGER DEFAULT 1,
      is_completed INTEGER DEFAULT 0,
      completed_by TEXT,
      completed_at TEXT,
      notes TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_documents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'other',
      name TEXT NOT NULL,
      file_url TEXT,
      file_size INTEGER,
      mime_type TEXT,
      notes TEXT,
      uploaded_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS installed_equipment (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      account_id TEXT,
      brand TEXT,
      model TEXT,
      sku TEXT,
      serial_number TEXT,
      installation_date TEXT,
      location_detail TEXT,
      warranty_start TEXT,
      warranty_end TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cuadrillas (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      chief_id TEXT,
      specialty TEXT,
      vehicle TEXT,
      zone TEXT,
      daily_capacity INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cuadrilla_members (
      id TEXT PRIMARY KEY,
      cuadrilla_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      FOREIGN KEY (cuadrilla_id) REFERENCES cuadrillas(id) ON DELETE CASCADE
    );
  `);

  // ── Migración: nuevos roles para empresas existentes ─────────────────
  const { run: dbRun, get: dbGet, all: dbAll } = require('./db');
  const newRoles = [
    { name: 'Recursos Humanos',    description: 'Gestión de personal y acceso a usuarios' },
    { name: 'Finanzas',            description: 'Acceso a facturas, cotizaciones y reportes financieros' },
    { name: 'Product Manager',     description: 'Gestión de productos, catálogo e inventario' },
    { name: 'Marketing',           description: 'Acceso a campañas, landing pages y reportes' },
    { name: 'Diseño',              description: 'Acceso a landing pages y recursos visuales' },
    { name: 'Servicio Técnico',    description: 'Gestión de actividades y soporte a clientes' },
    { name: 'Jefe de Bodega',      description: 'Gestión completa de inventario y proveedores' },
    { name: 'Asistente de Bodega',       description: 'Consulta y registro de movimientos de inventario' },
    { name: 'CEO / Gerencia',            description: 'Dashboard ejecutivo, KPIs, rentabilidad y estado de operaciones' },
    { name: 'Jefe de Servicio Técnico',  description: 'Gestión completa de proyectos, técnicos, instalaciones, garantías y mantenciones' },
    { name: 'Técnico',                   description: 'Acceso a proyectos asignados, checklist, evidencias y bitácora. Sin acceso a información financiera' },
    { name: 'Cliente',                   description: 'Portal cliente: ver estado del proyecto, documentos autorizados, garantías y tickets' },
  ];

  try {
    const { v4: uuidv4 } = require('uuid');
    const companies = dbAll('SELECT id FROM companies', []) as { id: string }[];
    for (const company of companies) {
      for (const role of newRoles) {
        const exists = dbGet(
          'SELECT id FROM roles WHERE company_id = ? AND name = ?',
          [company.id, role.name]
        );
        if (!exists) {
          dbRun(
            'INSERT INTO roles (id, company_id, name, description, is_system) VALUES (?, ?, ?, ?, 1)',
            [uuidv4(), company.id, role.name, role.description]
          );
        }
      }
    }
  } catch (err) {
    console.error('[DB] Error en migración de roles:', (err as Error).message);
  }
}
