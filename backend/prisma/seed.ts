import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de PROSPERA.AI...\n');

  // ─── Permisos del sistema ─────────────────────────────────
  const modules = ['users', 'crm', 'erp', 'marketing', 'reports', 'settings', 'integrations'];
  const actions = ['create', 'read', 'update', 'delete', 'export', 'import'];

  const permissions: { module: string; action: string; description: string }[] = [];
  for (const module of modules) {
    for (const action of actions) {
      permissions.push({
        module,
        action,
        description: `${action} en ${module}`,
      });
    }
  }

  console.log('📋 Creando permisos del sistema...');
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { module_action: { module: perm.module, action: perm.action } },
      update: {},
      create: perm,
    });
  }

  // ─── Empresa demo ─────────────────────────────────────────
  console.log('🏢 Creando empresa demo...');
  const company = await prisma.company.upsert({
    where: { slug: 'prospera-demo' },
    update: {},
    create: {
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
    },
  });

  // ─── Roles del sistema ────────────────────────────────────
  console.log('🔐 Creando roles...');

  const adminRole = await prisma.role.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Administrador' } },
    update: {},
    create: {
      companyId: company.id,
      name: 'Administrador',
      description: 'Acceso completo a toda la plataforma',
      isSystem: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Gerente' } },
    update: {},
    create: {
      companyId: company.id,
      name: 'Gerente',
      description: 'Acceso a CRM, reportes y gestión de equipo',
      isSystem: true,
    },
  });

  const salesRole = await prisma.role.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Ejecutivo de Ventas' } },
    update: {},
    create: {
      companyId: company.id,
      name: 'Ejecutivo de Ventas',
      description: 'Acceso a CRM: leads, contactos, oportunidades y tareas propias',
      isSystem: true,
    },
  });

  // Asignar todos los permisos al admin
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // Permisos de gerente (todo excepto configuraciones avanzadas e integraciones)
  const managerPerms = await prisma.permission.findMany({
    where: { module: { in: ['crm', 'erp', 'marketing', 'reports'] } },
  });
  for (const perm of managerPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: managerRole.id, permissionId: perm.id },
    });
  }

  // Permisos de ejecutivo de ventas (solo CRM, lectura de reportes)
  const salesPerms = await prisma.permission.findMany({
    where: {
      OR: [
        { module: 'crm' },
        { module: 'reports', action: 'read' },
      ],
    },
  });
  for (const perm of salesPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: salesRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: salesRole.id, permissionId: perm.id },
    });
  }

  // ─── Usuario administrador ────────────────────────────────
  console.log('👤 Creando usuario administrador...');
  const hashedPassword = await bcrypt.hash('Admin123!', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@prospera.ai' },
    update: {},
    create: {
      email: 'admin@prospera.ai',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'PROSPERA',
      isActive: true,
    },
  });

  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: adminUser.id, companyId: company.id } },
    update: {},
    create: {
      userId: adminUser.id,
      companyId: company.id,
      roleId: adminRole.id,
      isOwner: true,
    },
  });

  // ─── Usuario gerente ──────────────────────────────────────
  const managerUser = await prisma.user.upsert({
    where: { email: 'gerente@prospera.ai' },
    update: {},
    create: {
      email: 'gerente@prospera.ai',
      password: await bcrypt.hash('Gerente123!', 12),
      firstName: 'María',
      lastName: 'González',
      isActive: true,
    },
  });

  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: managerUser.id, companyId: company.id } },
    update: {},
    create: {
      userId: managerUser.id,
      companyId: company.id,
      roleId: managerRole.id,
    },
  });

  // ─── Usuario vendedor ─────────────────────────────────────
  const salesUser = await prisma.user.upsert({
    where: { email: 'ventas@prospera.ai' },
    update: {},
    create: {
      email: 'ventas@prospera.ai',
      password: await bcrypt.hash('Ventas123!', 12),
      firstName: 'Carlos',
      lastName: 'Martínez',
      isActive: true,
    },
  });

  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: salesUser.id, companyId: company.id } },
    update: {},
    create: {
      userId: salesUser.id,
      companyId: company.id,
      roleId: salesRole.id,
    },
  });

  // ─── Pipeline comercial ───────────────────────────────────
  console.log('📊 Creando pipeline comercial...');
  const pipeline = await prisma.pipeline.upsert({
    where: { id: 'pipeline-default' },
    update: {},
    create: {
      id: 'pipeline-default',
      companyId: company.id,
      name: 'Pipeline Principal',
      isDefault: true,
    },
  });

  const stages = [
    { name: 'Nuevo Lead', order: 1, probability: 10, color: '#6366f1' },
    { name: 'Contactado', order: 2, probability: 25, color: '#8b5cf6' },
    { name: 'Calificado', order: 3, probability: 40, color: '#3b82f6' },
    { name: 'Propuesta', order: 4, probability: 60, color: '#f59e0b' },
    { name: 'Negociación', order: 5, probability: 75, color: '#ef4444' },
    { name: 'Cerrado Ganado', order: 6, probability: 100, color: '#10b981' },
    { name: 'Cerrado Perdido', order: 7, probability: 0, color: '#6b7280' },
  ];

  const createdStages: { [key: string]: string } = {};
  for (const stage of stages) {
    const s = await prisma.pipelineStage.create({
      data: { pipelineId: pipeline.id, ...stage },
    });
    createdStages[stage.name] = s.id;
  }

  // ─── Datos demo CRM ───────────────────────────────────────
  console.log('🎯 Creando leads y contactos demo...');

  const leads = [
    { firstName: 'Roberto', lastName: 'Silva', email: 'roberto@empresa.com', company: 'Empresa XYZ', source: 'web', status: 'new', score: 75 },
    { firstName: 'Ana', lastName: 'López', email: 'ana@startup.mx', company: 'StartupMX', source: 'referral', status: 'contacted', score: 90 },
    { firstName: 'Juan', lastName: 'Pérez', email: 'juan@pymes.com', company: 'PyMES Corp', source: 'social', status: 'qualified', score: 60 },
    { firstName: 'Sofía', lastName: 'Ramírez', email: 'sofia@corp.mx', company: 'Corp MX', source: 'event', status: 'new', score: 45 },
    { firstName: 'Diego', lastName: 'Torres', email: 'diego@negocios.com', company: 'Negocios SA', source: 'cold_call', status: 'contacted', score: 80 },
  ];

  for (const lead of leads) {
    await prisma.lead.create({
      data: {
        companyId: company.id,
        assigneeId: salesUser.id,
        ...lead,
      },
    });
  }

  // ─── Oportunidades demo ───────────────────────────────────
  const account = await prisma.account.create({
    data: {
      companyId: company.id,
      name: 'Empresa Ejemplo SA de CV',
      email: 'contacto@empresa-ejemplo.com',
      phone: '+52 55 9876 5432',
      industry: 'Tecnología',
      employees: 50,
      city: 'Guadalajara',
      country: 'México',
    },
  });

  await prisma.opportunity.create({
    data: {
      companyId: company.id,
      stageId: createdStages['Propuesta'],
      accountId: account.id,
      name: 'Implementación CRM Enterprise',
      value: 85000,
      currency: 'MXN',
      probability: 60,
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'open',
    },
  });

  await prisma.opportunity.create({
    data: {
      companyId: company.id,
      stageId: createdStages['Negociación'],
      accountId: account.id,
      name: 'Módulo de Automatización IA',
      value: 45000,
      currency: 'MXN',
      probability: 75,
      expectedCloseDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      status: 'open',
    },
  });

  console.log('\n✅ Seed completado exitosamente!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 Credenciales de acceso:');
  console.log('   Admin:   admin@prospera.ai     / Admin123!');
  console.log('   Gerente: gerente@prospera.ai   / Gerente123!');
  console.log('   Ventas:  ventas@prospera.ai    / Ventas123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
