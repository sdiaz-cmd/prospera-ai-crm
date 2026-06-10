import 'dotenv/config';
import db from './db';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

async function seed() {
  console.log('🌱 Ejecutando seed de PROSPERA.AI...\n');

  // Permisos del sistema
  const modules = ['users', 'crm', 'erp', 'marketing', 'reports', 'settings', 'integrations'];
  const actions = ['create', 'read', 'update', 'delete', 'export', 'import'];
  const permMap: Record<string, string> = {};

  for (const module of modules) {
    for (const action of actions) {
      const key = `${module}:${action}`;
      const existing = await db('permissions').where({ module, action }).first();
      if (!existing) {
        const id = uuid();
        await db('permissions').insert({ id, module, action, description: `${action} en ${module}` });
        permMap[key] = id;
      } else {
        permMap[key] = existing.id;
      }
    }
  }
  console.log('✓ Permisos creados');

  // Empresa demo
  let company = await db('companies').where({ slug: 'prospera-demo' }).first();
  if (!company) {
    const companyId = uuid();
    await db('companies').insert({
      id: companyId,
      name: 'PROSPERA Demo',
      slug: 'prospera-demo',
      email: 'demo@prospera.ai',
      phone: '+52 55 1234 5678',
      website: 'https://prospera.ai',
      city: 'Ciudad de México',
      country: 'México',
      currency: 'MXN',
      timezone: 'America/Mexico_City',
      plan: 'growth',
    });
    company = await db('companies').where({ id: companyId }).first();
  }
  console.log('✓ Empresa demo creada:', company.name);

  // Roles
  const createRole = async (name: string, description: string) => {
    let role = await db('roles').where({ company_id: company.id, name }).first();
    if (!role) {
      const id = uuid();
      await db('roles').insert({ id, company_id: company.id, name, description, is_system: 1 });
      role = await db('roles').where({ id }).first();
    }
    return role;
  };

  const adminRole = await createRole('Administrador', 'Acceso completo a toda la plataforma');
  const managerRole = await createRole('Gerente', 'Acceso a CRM, reportes y gestión de equipo');
  const salesRole = await createRole('Ejecutivo de Ventas', 'Acceso a CRM: leads, contactos, oportunidades y tareas propias');

  // Asignar todos los permisos al admin
  const allPermIds = Object.values(permMap);
  for (const permId of allPermIds) {
    const exists = await db('role_permissions').where({ role_id: adminRole.id, permission_id: permId }).first();
    if (!exists) await db('role_permissions').insert({ id: uuid(), role_id: adminRole.id, permission_id: permId });
  }

  // Permisos de gerente
  const managerModules = ['crm', 'erp', 'marketing', 'reports'];
  const managerPerms = await db('permissions').whereIn('module', managerModules);
  for (const perm of managerPerms) {
    const exists = await db('role_permissions').where({ role_id: managerRole.id, permission_id: perm.id }).first();
    if (!exists) await db('role_permissions').insert({ id: uuid(), role_id: managerRole.id, permission_id: perm.id });
  }

  // Permisos de ventas
  const salesPerms = await db('permissions').where({ module: 'crm' }).orWhere({ module: 'reports', action: 'read' });
  for (const perm of salesPerms) {
    const exists = await db('role_permissions').where({ role_id: salesRole.id, permission_id: perm.id }).first();
    if (!exists) await db('role_permissions').insert({ id: uuid(), role_id: salesRole.id, permission_id: perm.id });
  }
  console.log('✓ Roles y permisos configurados');

  // Usuarios
  const createUser = async (email: string, firstName: string, lastName: string, password: string, roleId: string, isOwner = false) => {
    let user = await db('users').where({ email }).first();
    if (!user) {
      const id = uuid();
      const hashed = await bcrypt.hash(password, 12);
      await db('users').insert({ id, email, first_name: firstName, last_name: lastName, password: hashed, is_active: 1 });
      user = await db('users').where({ id }).first();
    }
    const uc = await db('user_companies').where({ user_id: user.id, company_id: company.id }).first();
    if (!uc) {
      await db('user_companies').insert({ id: uuid(), user_id: user.id, company_id: company.id, role_id: roleId, is_owner: isOwner ? 1 : 0, is_active: 1 });
    }
    return user;
  };

  await createUser('admin@prospera.ai', 'Admin', 'PROSPERA', 'Admin123!', adminRole.id, true);
  const managerUser = await createUser('gerente@prospera.ai', 'María', 'González', 'Gerente123!', managerRole.id);
  const salesUser = await createUser('ventas@prospera.ai', 'Carlos', 'Martínez', 'Ventas123!', salesRole.id);
  console.log('✓ Usuarios creados');

  // Pipeline
  let pipeline = await db('pipelines').where({ company_id: company.id }).first();
  if (!pipeline) {
    const pId = uuid();
    await db('pipelines').insert({ id: pId, company_id: company.id, name: 'Pipeline Principal', is_default: 1 });
    pipeline = await db('pipelines').where({ id: pId }).first();
  }

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
    let s = await db('pipeline_stages').where({ pipeline_id: pipeline.id, name: stage.name }).first();
    if (!s) {
      const sId = uuid();
      await db('pipeline_stages').insert({ id: sId, pipeline_id: pipeline.id, ...stage });
      stageIds[stage.name] = sId;
    } else {
      stageIds[stage.name] = s.id;
    }
  }
  console.log('✓ Pipeline creado');

  // Leads demo
  const leadDemos = [
    { first_name: 'Roberto', last_name: 'Silva', email: 'roberto@empresa.com', company: 'Empresa XYZ', source: 'web', status: 'new', score: 75 },
    { first_name: 'Ana', last_name: 'López', email: 'ana@startup.mx', company: 'StartupMX', source: 'referral', status: 'contacted', score: 90 },
    { first_name: 'Juan', last_name: 'Pérez', email: 'juan@pymes.com', company: 'PyMES Corp', source: 'social', status: 'qualified', score: 60 },
    { first_name: 'Sofía', last_name: 'Ramírez', email: 'sofia@corp.mx', company: 'Corp MX', source: 'event', status: 'new', score: 45 },
    { first_name: 'Diego', last_name: 'Torres', email: 'diego@negocios.com', company: 'Negocios SA', source: 'cold_call', status: 'contacted', score: 80 },
  ];
  for (const lead of leadDemos) {
    const exists = await db('leads').where({ email: lead.email, company_id: company.id }).first();
    if (!exists) await db('leads').insert({ id: uuid(), company_id: company.id, assignee_id: salesUser.id, ...lead });
  }

  // Cuenta demo
  let account = await db('accounts').where({ company_id: company.id, name: 'Empresa Ejemplo SA de CV' }).first();
  if (!account) {
    const aId = uuid();
    await db('accounts').insert({ id: aId, company_id: company.id, name: 'Empresa Ejemplo SA de CV', email: 'contacto@empresa-ejemplo.com', phone: '+52 55 9876 5432', industry: 'Tecnología', employees: 50, city: 'Guadalajara', country: 'México' });
    account = await db('accounts').where({ id: aId }).first();
  }

  // Oportunidades demo
  const opp1Exists = await db('opportunities').where({ company_id: company.id, name: 'Implementación CRM Enterprise' }).first();
  if (!opp1Exists) {
    await db('opportunities').insert({ id: uuid(), company_id: company.id, stage_id: stageIds['Propuesta'], account_id: account.id, name: 'Implementación CRM Enterprise', value: 85000, currency: 'MXN', probability: 60, expected_close_date: new Date(Date.now() + 30 * 864e5).toISOString(), status: 'open' });
  }
  const opp2Exists = await db('opportunities').where({ company_id: company.id, name: 'Módulo de Automatización IA' }).first();
  if (!opp2Exists) {
    await db('opportunities').insert({ id: uuid(), company_id: company.id, stage_id: stageIds['Negociación'], account_id: account.id, name: 'Módulo de Automatización IA', value: 45000, currency: 'MXN', probability: 75, expected_close_date: new Date(Date.now() + 15 * 864e5).toISOString(), status: 'open' });
  }

  // Actividades demo
  const actExists = await db('activities').where({ company_id: company.id }).first();
  if (!actExists) {
    await db('activities').insert({ id: uuid(), company_id: company.id, owner_id: managerUser.id, type: 'call', subject: 'Llamada de seguimiento con Roberto Silva', description: 'Interesado en el módulo CRM para su equipo de ventas de 8 personas.', completed_at: new Date().toISOString() });
    await db('activities').insert({ id: uuid(), company_id: company.id, owner_id: salesUser.id, type: 'email', subject: 'Propuesta comercial enviada a Empresa Ejemplo', description: 'Enviada propuesta por $85,000 MXN para implementación CRM Enterprise.' });
    await db('activities').insert({ id: uuid(), company_id: company.id, owner_id: managerUser.id, type: 'meeting', subject: 'Demo del producto con Ana López', description: 'Demo de 45 minutos, muy interesada en las funciones de IA.', completed_at: new Date().toISOString() });
  }

  console.log('✓ Datos demo creados');
  console.log('\n✅ Seed completado exitosamente!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 Credenciales de acceso:');
  console.log('   Admin:   admin@prospera.ai     / Admin123!');
  console.log('   Gerente: gerente@prospera.ai   / Gerente123!');
  console.log('   Ventas:  ventas@prospera.ai    / Ventas123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  await db.destroy();
}

seed().catch((e) => { console.error('❌ Error en seed:', e); process.exit(1); });
