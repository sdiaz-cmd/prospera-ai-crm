import 'dotenv/config';
import { createSchema } from './schema';
import { run, get, all } from './db';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

async function setup() {
  console.log('\n🚀 PROSPERA.AI — Configuración de base de datos\n');

  // 1. Schema
  console.log('📋 Creando esquema...');
  createSchema();

  // 2. Permisos
  console.log('🔐 Creando permisos...');
  const modules = ['users', 'crm', 'erp', 'marketing', 'reports', 'settings', 'integrations'];
  const actions = ['create', 'read', 'update', 'delete', 'export', 'import'];
  const permMap: Record<string, string> = {};

  for (const module of modules) {
    for (const action of actions) {
      const key = `${module}:${action}`;
      const existing = get('SELECT id FROM permissions WHERE module = ? AND action = ?', [module, action]);
      if (!existing) {
        const id = uuid();
        run('INSERT INTO permissions (id, module, action, description) VALUES (?, ?, ?, ?)',
          [id, module, action, `${action} en ${module}`]);
        permMap[key] = id;
      } else {
        permMap[key] = (existing as { id: string }).id;
      }
    }
  }
  const allPermIds = Object.values(permMap);

  // 3. Empresa demo
  console.log('🏢 Creando empresa demo...');
  let company = get('SELECT * FROM companies WHERE slug = ?', ['prospera-demo']) as Record<string, unknown> | undefined;
  if (!company) {
    const companyId = uuid();
    run(`INSERT INTO companies (id, name, slug, email, phone, website, city, country, currency, timezone, plan, trial_ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [companyId, 'PROSPERA Demo', 'prospera-demo', 'demo@prospera.ai', '+52 55 1234 5678',
        'https://prospera.ai', 'Ciudad de México', 'México', 'MXN', 'America/Mexico_City', 'growth',
        new Date(Date.now() + 365 * 864e5).toISOString()]);
    company = get('SELECT * FROM companies WHERE id = ?', [companyId]) as Record<string, unknown>;
  }
  const companyId = company.id as string;

  // 4. Roles
  console.log('👥 Creando roles...');
  const createRole = (name: string, description: string): string => {
    const existing = get('SELECT id FROM roles WHERE company_id = ? AND name = ?', [companyId, name]);
    if (existing) return (existing as { id: string }).id;
    const id = uuid();
    run('INSERT INTO roles (id, company_id, name, description, is_system) VALUES (?, ?, ?, ?, 1)', [id, companyId, name, description]);
    return id;
  };

  const adminRoleId = createRole('Administrador', 'Acceso completo a toda la plataforma');
  const managerRoleId = createRole('Gerente', 'Acceso a CRM, reportes y gestión de equipo');
  const salesRoleId = createRole('Ejecutivo de Ventas', 'Acceso a CRM: leads, contactos, oportunidades');

  // Permisos admin (todos)
  for (const permId of allPermIds) {
    const ex = get('SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?', [adminRoleId, permId]);
    if (!ex) run('INSERT INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)', [uuid(), adminRoleId, permId]);
  }
  // Permisos gerente (crm, erp, marketing, reports)
  const managerPerms = all('SELECT id FROM permissions WHERE module IN (\'crm\', \'erp\', \'marketing\', \'reports\')') as { id: string }[];
  for (const perm of managerPerms) {
    const ex = get('SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?', [managerRoleId, perm.id]);
    if (!ex) run('INSERT INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)', [uuid(), managerRoleId, perm.id]);
  }
  // Permisos ventas (crm + reports:read)
  const salesPerms = all('SELECT id FROM permissions WHERE module = \'crm\' OR (module = \'reports\' AND action = \'read\')') as { id: string }[];
  for (const perm of salesPerms) {
    const ex = get('SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?', [salesRoleId, perm.id]);
    if (!ex) run('INSERT INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)', [uuid(), salesRoleId, perm.id]);
  }

  // 5. Usuarios
  console.log('👤 Creando usuarios...');
  const createUser = async (email: string, firstName: string, lastName: string, password: string, roleId: string, isOwner = false): Promise<string> => {
    let user = get('SELECT id FROM users WHERE email = ?', [email]) as { id: string } | undefined;
    if (!user) {
      const id = uuid();
      const hashed = await bcrypt.hash(password, 12);
      run('INSERT INTO users (id, email, first_name, last_name, password, is_active) VALUES (?, ?, ?, ?, ?, 1)', [id, email, firstName, lastName, hashed]);
      user = { id };
    }
    const uc = get('SELECT id FROM user_companies WHERE user_id = ? AND company_id = ?', [user.id, companyId]);
    if (!uc) run('INSERT INTO user_companies (id, user_id, company_id, role_id, is_owner, is_active) VALUES (?, ?, ?, ?, ?, 1)', [uuid(), user.id, companyId, roleId, isOwner ? 1 : 0]);
    return user.id;
  };

  await createUser('admin@prospera.ai', 'Admin', 'PROSPERA', 'Admin123!', adminRoleId, true);
  const managerId = await createUser('gerente@prospera.ai', 'María', 'González', 'Gerente123!', managerRoleId);
  const salesId = await createUser('ventas@prospera.ai', 'Carlos', 'Martínez', 'Ventas123!', salesRoleId);

  // 6. Pipeline
  console.log('📊 Creando pipeline...');
  let pipeline = get('SELECT id FROM pipelines WHERE company_id = ?', [companyId]) as { id: string } | undefined;
  if (!pipeline) {
    const pId = uuid();
    run('INSERT INTO pipelines (id, company_id, name, is_default) VALUES (?, ?, ?, 1)', [pId, companyId, 'Pipeline Principal']);
    pipeline = { id: pId };
  }
  const pipelineId = pipeline.id;

  const stageIds: Record<string, string> = {};
  const stages = [
    { name: 'Nuevo Lead', order: 1, probability: 10, color: '#6366f1' },
    { name: 'Contactado', order: 2, probability: 25, color: '#8b5cf6' },
    { name: 'Calificado', order: 3, probability: 40, color: '#3b82f6' },
    { name: 'Propuesta', order: 4, probability: 60, color: '#f59e0b' },
    { name: 'Negociación', order: 5, probability: 75, color: '#ef4444' },
    { name: 'Cerrado Ganado', order: 6, probability: 100, color: '#10b981' },
    { name: 'Cerrado Perdido', order: 7, probability: 0, color: '#6b7280' },
  ];
  for (const stage of stages) {
    const ex = get('SELECT id FROM pipeline_stages WHERE pipeline_id = ? AND name = ?', [pipelineId, stage.name]) as { id: string } | undefined;
    if (!ex) {
      const sId = uuid();
      run('INSERT INTO pipeline_stages (id, pipeline_id, name, order_index, probability, color) VALUES (?, ?, ?, ?, ?, ?)',
        [sId, pipelineId, stage.name, stage.order, stage.probability, stage.color]);
      stageIds[stage.name] = sId;
    } else {
      stageIds[stage.name] = ex.id;
    }
  }

  // 7. Datos demo
  console.log('🎯 Creando datos demo...');

  // Leads
  const leadDemos = [
    { first_name: 'Roberto', last_name: 'Silva', email: 'roberto@empresa.com', company: 'Empresa XYZ', source: 'web', status: 'new', score: 75 },
    { first_name: 'Ana', last_name: 'López', email: 'ana@startup.mx', company: 'StartupMX', source: 'referral', status: 'contacted', score: 90 },
    { first_name: 'Juan', last_name: 'Pérez', email: 'juan@pymes.com', company: 'PyMES Corp', source: 'social', status: 'qualified', score: 60 },
    { first_name: 'Sofía', last_name: 'Ramírez', email: 'sofia@corp.mx', company: 'Corp MX', source: 'event', status: 'new', score: 45 },
    { first_name: 'Diego', last_name: 'Torres', email: 'diego@negocios.com', company: 'Negocios SA', source: 'cold_call', status: 'contacted', score: 80 },
  ];
  for (const lead of leadDemos) {
    const ex = get('SELECT id FROM leads WHERE email = ? AND company_id = ?', [lead.email, companyId]);
    if (!ex) run('INSERT INTO leads (id, company_id, assignee_id, first_name, last_name, email, company, source, status, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid(), companyId, salesId, lead.first_name, lead.last_name, lead.email, lead.company, lead.source, lead.status, lead.score]);
  }

  // Cuenta
  let account = get('SELECT id FROM accounts WHERE company_id = ? AND name = ?', [companyId, 'Empresa Ejemplo SA de CV']) as { id: string } | undefined;
  if (!account) {
    const aId = uuid();
    run('INSERT INTO accounts (id, company_id, name, email, phone, industry, company_size, city, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [aId, companyId, 'Empresa Ejemplo SA de CV', 'contacto@empresa-ejemplo.com', '+52 55 9876 5432', 'Tecnología', '50-100', 'Guadalajara', 'México']);
    account = { id: aId };
  }

  // Oportunidades
  const opp1 = get('SELECT id FROM opportunities WHERE company_id = ? AND name = ?', [companyId, 'Implementación CRM Enterprise']);
  if (!opp1) run('INSERT INTO opportunities (id, company_id, stage_id, account_id, name, amount, currency, probability, close_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [uuid(), companyId, stageIds['Propuesta'], account.id, 'Implementación CRM Enterprise', 85000, 'MXN', 60, new Date(Date.now() + 30 * 864e5).toISOString(), 'open']);
  const opp2 = get('SELECT id FROM opportunities WHERE company_id = ? AND name = ?', [companyId, 'Módulo de Automatización IA']);
  if (!opp2) run('INSERT INTO opportunities (id, company_id, stage_id, account_id, name, amount, currency, probability, close_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [uuid(), companyId, stageIds['Negociación'], account.id, 'Módulo de Automatización IA', 45000, 'MXN', 75, new Date(Date.now() + 15 * 864e5).toISOString(), 'open']);

  // Actividades
  const actCount = get('SELECT COUNT(*) as c FROM activities WHERE company_id = ?', [companyId]) as { c: number };
  if (!actCount || Number(actCount.c) === 0) {
    run('INSERT INTO activities (id, company_id, owner_id, type, subject, body, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuid(), companyId, managerId, 'call', 'Llamada de seguimiento con Roberto Silva', 'Interesado en el módulo CRM para su equipo de ventas de 8 personas.', new Date().toISOString()]);
    run('INSERT INTO activities (id, company_id, owner_id, type, subject, body) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid(), companyId, salesId, 'email', 'Propuesta comercial enviada a Empresa Ejemplo', 'Enviada propuesta por $85,000 MXN para implementación CRM Enterprise.']);
    run('INSERT INTO activities (id, company_id, owner_id, type, subject, body, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuid(), companyId, managerId, 'meeting', 'Demo del producto con Ana López', 'Demo de 45 minutos, muy interesada en las funciones de IA.', new Date().toISOString()]);
  }

  // Cotizaciones demo
  console.log('📄 Creando cotizaciones demo...');
  const quoteCount = get('SELECT COUNT(*) as c FROM quotes WHERE company_id = ?', [companyId]) as { c: number };
  if (!quoteCount || Number(quoteCount.c) === 0) {
    const oppForQuote = get('SELECT id FROM opportunities WHERE company_id = ? AND name = ?', [companyId, 'Implementación CRM Enterprise']) as { id: string } | undefined;

    const q1Id = uuid();
    run(`INSERT INTO quotes (id, company_id, account_id, opportunity_id, assignee_id, number, title, status, subtotal, discount_type, discount_value, tax_rate, tax_amount, total, currency, valid_until, notes, terms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [q1Id, companyId, account.id, oppForQuote?.id || null, managerId,
        'Q-0001', 'Implementación CRM Enterprise — Propuesta Inicial', 'sent',
        85000, 'percent', 5, 16, 12920, 94120, 'MXN',
        new Date(Date.now() + 30 * 864e5).toISOString(),
        'Incluye configuración inicial, capacitación y soporte 3 meses.',
        'Pago 50% al inicio, 50% al entregar. Válida por 30 días.']);
    run('INSERT INTO quote_items (id, quote_id, description, quantity, unit_price, discount, total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid(), q1Id, 'Licencia CRM Enterprise (anual)', 1, 60000, 0, 60000, 1]);
    run('INSERT INTO quote_items (id, quote_id, description, quantity, unit_price, discount, total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid(), q1Id, 'Implementación y configuración', 1, 15000, 0, 15000, 2]);
    run('INSERT INTO quote_items (id, quote_id, description, quantity, unit_price, discount, total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid(), q1Id, 'Capacitación (8 horas)', 8, 1250, 0, 10000, 3]);

    const q2Id = uuid();
    run(`INSERT INTO quotes (id, company_id, account_id, assignee_id, number, title, status, subtotal, discount_type, discount_value, tax_rate, tax_amount, total, currency, valid_until)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [q2Id, companyId, account.id, salesId,
        'Q-0002', 'Módulo de Automatización IA — Cotización', 'draft',
        45000, 'percent', 0, 16, 7200, 52200, 'MXN',
        new Date(Date.now() + 15 * 864e5).toISOString()]);
    run('INSERT INTO quote_items (id, quote_id, description, quantity, unit_price, discount, total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid(), q2Id, 'Módulo IA — Agente de Leads', 1, 25000, 0, 25000, 1]);
    run('INSERT INTO quote_items (id, quote_id, description, quantity, unit_price, discount, total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid(), q2Id, 'Módulo IA — Generador de Correos', 1, 20000, 0, 20000, 2]);
  }

  // ERP demo
  console.log('🏭 Creando datos ERP demo...');

  // Proveedor
  let supplier = get('SELECT id FROM suppliers WHERE company_id = ? AND name = ?', [companyId, 'TechSoft México SA de CV']) as { id: string } | undefined;
  if (!supplier) {
    const sId = uuid();
    run(`INSERT INTO suppliers (id, company_id, name, contact_name, email, phone, city, country, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sId, companyId, 'TechSoft México SA de CV', 'Luis Hernández', 'ventas@techsoft.mx', '+52 55 4000 1234', 'Ciudad de México', 'México', 'Proveedor principal de licencias de software.']);
    supplier = { id: sId };
  }

  // Productos
  const productDemos = [
    { sku: 'LIC-CRM-001', name: 'Licencia CRM Enterprise (anual)', category: 'Software', unit: 'lic', sale_price: 60000, cost_price: 35000, stock: 50 },
    { sku: 'SVC-IMP-001', name: 'Servicio de Implementación', category: 'Servicios', unit: 'hr', sale_price: 1500, cost_price: 800, stock: 0, track: 0 },
    { sku: 'SVC-CAP-001', name: 'Capacitación (por hora)', category: 'Servicios', unit: 'hr', sale_price: 1250, cost_price: 600, stock: 0, track: 0 },
    { sku: 'LIC-IA-001', name: 'Módulo IA — Agente de Leads', category: 'Software', unit: 'lic', sale_price: 25000, cost_price: 12000, stock: 30 },
    { sku: 'LIC-IA-002', name: 'Módulo IA — Email Generator', category: 'Software', unit: 'lic', sale_price: 20000, cost_price: 10000, stock: 30 },
  ];
  const productIds: Record<string, string> = {};
  for (const p of productDemos) {
    const ex = get('SELECT id FROM products WHERE company_id = ? AND sku = ?', [companyId, p.sku]) as { id: string } | undefined;
    if (!ex) {
      const pId = uuid();
      run(`INSERT INTO products (id, company_id, supplier_id, sku, name, category, unit, sale_price, cost_price, tax_rate, track_inventory, stock, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 16, ?, ?, 5)`,
        [pId, companyId, supplier.id, p.sku, p.name, p.category, p.unit, p.sale_price, p.cost_price, p.track ?? 1, p.stock]);
      productIds[p.sku] = pId;
      if ((p.track ?? 1) && p.stock > 0) {
        run(`INSERT INTO inventory_movements (id, company_id, product_id, type, quantity, stock_after, reference, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuid(), companyId, pId, 'in', p.stock, p.stock, 'Stock inicial', managerId]);
      }
    } else {
      productIds[p.sku] = ex.id;
    }
  }

  // Factura demo
  const invCount = get('SELECT COUNT(*) as c FROM invoices WHERE company_id = ?', [companyId]) as { c: number };
  if (!invCount || Number(invCount.c) === 0) {
    const invId = uuid();
    run(`INSERT INTO invoices (id, company_id, account_id, assignee_id, number, status, subtotal, discount_type, discount_value, tax_rate, tax_amount, total, currency, issue_date, due_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invId, companyId, account.id, managerId, 'INV-0001', 'sent',
        75000, 'percent', 0, 16, 12000, 87000, 'MXN',
        new Date().toISOString(),
        new Date(Date.now() + 30 * 864e5).toISOString(),
        'Factura por implementación CRM Enterprise.']);
    run(`INSERT INTO invoice_items (id, invoice_id, product_id, description, quantity, unit_price, discount, total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), invId, productIds['LIC-CRM-001'] || null, 'Licencia CRM Enterprise (anual)', 1, 60000, 0, 60000, 1]);
    run(`INSERT INTO invoice_items (id, invoice_id, product_id, description, quantity, unit_price, discount, total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), invId, productIds['SVC-IMP-001'] || null, 'Implementación y configuración (10 horas)', 10, 1500, 0, 15000, 2]);
  }

  // Landing Pages demo
  console.log('🌐 Creando landing pages demo...');
  const lpCount = get('SELECT COUNT(*) as c FROM landing_pages WHERE company_id = ?', [companyId]) as { c: number };
  if (!lpCount || Number(lpCount.c) === 0) {
    const lp1Id = uuid();
    run(`INSERT INTO landing_pages (id, company_id, created_by, name, slug, headline, subheadline, description, cta_text, primary_color, logo_text, show_phone, show_company, show_message, is_active, views, submissions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [lp1Id, companyId, managerId,
        'Demo PROSPERA CRM', 'demo-prospera-crm',
        '¿Listo para potenciar tus ventas?',
        'Agenda una demo gratuita de 30 minutos y descubre cómo PROSPERA.AI puede transformar tu equipo comercial.',
        'Completa el formulario y uno de nuestros expertos se pondrá en contacto contigo en menos de 24 horas.',
        'Agendar mi demo', '#6366f1', 'PROSPERA.AI', 1, 1, 1, 248, 31]);

    const lp2Id = uuid();
    run(`INSERT INTO landing_pages (id, company_id, created_by, name, slug, headline, subheadline, description, cta_text, primary_color, logo_text, show_phone, show_company, show_message, is_active, views, submissions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [lp2Id, companyId, salesId,
        'Webinar IA en Ventas', 'webinar-ia-ventas',
        'Aprende a usar IA para cerrar más ventas',
        'Webinar gratuito — Martes 20 de Mayo, 11:00 AM (Ciudad de México)',
        'Regístrate ahora y recibe el enlace de acceso directo en tu correo. Cupo limitado a 100 participantes.',
        'Quiero mi lugar', '#10b981', 'PROSPERA.AI', 0, 1, 0, 89, 44]);

    // Some submissions for lp1
    const submNames = [
      ['Roberto', 'silva@empresa.mx', '+52 55 1111 2222', 'Empresa XYZ'],
      ['Ana', 'ana@startup.mx', '', 'StartupMX'],
      ['Carlos', 'carlos@corp.mx', '+52 33 9999 8888', 'Corp México'],
    ];
    for (const [name, email, phone, company] of submNames) {
      const leadId = uuid();
      run('INSERT INTO leads (id, company_id, assignee_id, first_name, email, phone, company, source, status, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [leadId, companyId, salesId, name, email, phone, company, 'web', 'new', 55]);
      run(`INSERT INTO landing_submissions (id, landing_page_id, company_id, lead_id, name, email, phone, company, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid(), lp1Id, companyId, leadId, name, email, phone, company, 'Me interesa conocer más sobre la plataforma.']);
    }
  }

  // Marketing demo
  console.log('📢 Creando campañas demo...');
  const campCount = get('SELECT COUNT(*) as c FROM campaigns WHERE company_id = ?', [companyId]) as { c: number };
  if (!campCount || Number(campCount.c) === 0) {
    const c1Id = uuid();
    run(`INSERT INTO campaigns (id, company_id, created_by, name, type, status, subject, preview_text, body, recipient_count, sent_count, open_count, click_count, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c1Id, companyId, managerId, 'Campaña de Bienvenida Q2 2025', 'email', 'sent',
        '¡Bienvenido a PROSPERA.AI! Potencia tus ventas con IA',
        'Descubre cómo nuestra plataforma puede transformar tu CRM',
        `Estimado/a {{nombre}},\n\nNos complace darte la bienvenida a PROSPERA.AI, la plataforma de CRM + IA diseñada para empresas mexicanas.\n\nCon PROSPERA.AI puedes:\n• Gestionar leads y oportunidades\n• Generar correos con IA\n• Analizar tu pipeline en tiempo real\n\nEmpieza hoy: https://app.prospera.ai\n\nSaludos,\nEquipo PROSPERA.AI`,
        120, 118, 54, 22, new Date(Date.now() - 7 * 864e5).toISOString()]);

    const c2Id = uuid();
    run(`INSERT INTO campaigns (id, company_id, created_by, name, type, status, subject, preview_text, body, segment_source, recipient_count, sent_count, open_count, click_count, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c2Id, companyId, salesId, 'Seguimiento Leads — Fuente Referidos', 'email', 'sent',
        'Tenemos algo especial para ti',
        'Por ser referido, accede a una demo personalizada',
        `Hola {{nombre}},\n\nNos comentaron que podrías estar interesado en optimizar tu proceso de ventas.\n\nAgenda una demo de 30 minutos y te mostramos cómo PROSPERA.AI puede ayudarte a cerrar más negocios.\n\nSaludos,\n{{remitente}}`,
        'referral', 45, 45, 31, 18, new Date(Date.now() - 3 * 864e5).toISOString()]);

    const c3Id = uuid();
    run(`INSERT INTO campaigns (id, company_id, created_by, name, type, status, subject, preview_text, body, segment_status, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c3Id, companyId, managerId, 'Reactivación de Leads Fríos', 'email', 'draft',
        '¿Aún buscas mejorar tus ventas?',
        'Han pasado unos meses, te traemos novedades',
        `Estimado/a {{nombre}},\n\nHace algún tiempo conversamos sobre cómo mejorar tu gestión comercial. Hoy queremos compartirte las nuevas funciones de PROSPERA.AI que pueden hacer la diferencia.\n\n¿Conversamos esta semana?\n\nSaludos,\nEquipo PROSPERA.AI`,
        'new', new Date(Date.now() + 5 * 864e5).toISOString()]);
  }

  console.log('\n✅ Configuración completada!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 Credenciales de acceso:');
  console.log('   Admin:   admin@prospera.ai     / Admin123!');
  console.log('   Gerente: gerente@prospera.ai   / Gerente123!');
  console.log('   Ventas:  ventas@prospera.ai    / Ventas123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

setup().catch(e => { console.error('❌ Error:', e); process.exit(1); });
