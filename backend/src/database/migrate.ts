import 'dotenv/config';
import db from './db';

async function migrate() {
  console.log('🔄 Ejecutando migraciones...\n');

  await db.schema.createTableIfNotExists('companies', (t) => {
    t.string('id').primary();
    t.string('name').notNullable();
    t.string('slug').notNullable().unique();
    t.string('logo_url');
    t.string('website');
    t.string('phone');
    t.string('email');
    t.string('address');
    t.string('city');
    t.string('country');
    t.string('timezone').defaultTo('America/Mexico_City');
    t.string('currency').defaultTo('MXN');
    t.string('plan').defaultTo('trial');
    t.string('plan_status').defaultTo('active');
    t.datetime('trial_ends_at');
    t.boolean('is_active').defaultTo(true);
    t.datetime('created_at').defaultTo(db.fn.now());
    t.datetime('updated_at').defaultTo(db.fn.now());
  });

  await db.schema.createTableIfNotExists('users', (t) => {
    t.string('id').primary();
    t.string('email').notNullable().unique();
    t.string('password').notNullable();
    t.string('first_name').notNullable();
    t.string('last_name').notNullable();
    t.string('phone');
    t.string('avatar_url');
    t.boolean('is_active').defaultTo(true);
    t.datetime('last_login_at');
    t.datetime('created_at').defaultTo(db.fn.now());
    t.datetime('updated_at').defaultTo(db.fn.now());
  });

  await db.schema.createTableIfNotExists('roles', (t) => {
    t.string('id').primary();
    t.string('company_id');
    t.string('name').notNullable();
    t.string('description');
    t.boolean('is_system').defaultTo(false);
    t.datetime('created_at').defaultTo(db.fn.now());
    t.datetime('updated_at').defaultTo(db.fn.now());
    t.foreign('company_id').references('companies.id').onDelete('CASCADE');
  });

  await db.schema.createTableIfNotExists('permissions', (t) => {
    t.string('id').primary();
    t.string('module').notNullable();
    t.string('action').notNullable();
    t.string('description');
    t.unique(['module', 'action']);
  });

  await db.schema.createTableIfNotExists('role_permissions', (t) => {
    t.string('id').primary();
    t.string('role_id').notNullable();
    t.string('permission_id').notNullable();
    t.unique(['role_id', 'permission_id']);
    t.foreign('role_id').references('roles.id').onDelete('CASCADE');
    t.foreign('permission_id').references('permissions.id').onDelete('CASCADE');
  });

  await db.schema.createTableIfNotExists('user_companies', (t) => {
    t.string('id').primary();
    t.string('user_id').notNullable();
    t.string('company_id').notNullable();
    t.string('role_id').notNullable();
    t.boolean('is_owner').defaultTo(false);
    t.boolean('is_active').defaultTo(true);
    t.datetime('created_at').defaultTo(db.fn.now());
    t.unique(['user_id', 'company_id']);
    t.foreign('user_id').references('users.id').onDelete('CASCADE');
    t.foreign('company_id').references('companies.id').onDelete('CASCADE');
    t.foreign('role_id').references('roles.id');
  });

  await db.schema.createTableIfNotExists('refresh_tokens', (t) => {
    t.string('id').primary();
    t.string('token').notNullable().unique();
    t.string('user_id').notNullable();
    t.datetime('expires_at').notNullable();
    t.boolean('is_revoked').defaultTo(false);
    t.datetime('created_at').defaultTo(db.fn.now());
    t.foreign('user_id').references('users.id').onDelete('CASCADE');
  });

  await db.schema.createTableIfNotExists('pipelines', (t) => {
    t.string('id').primary();
    t.string('company_id').notNullable();
    t.string('name').notNullable();
    t.boolean('is_default').defaultTo(false);
    t.datetime('created_at').defaultTo(db.fn.now());
    t.foreign('company_id').references('companies.id').onDelete('CASCADE');
  });

  await db.schema.createTableIfNotExists('pipeline_stages', (t) => {
    t.string('id').primary();
    t.string('pipeline_id').notNullable();
    t.string('name').notNullable();
    t.integer('order').notNullable();
    t.integer('probability').defaultTo(0);
    t.string('color').defaultTo('#6366f1');
    t.foreign('pipeline_id').references('pipelines.id').onDelete('CASCADE');
  });

  await db.schema.createTableIfNotExists('leads', (t) => {
    t.string('id').primary();
    t.string('company_id').notNullable();
    t.string('assignee_id');
    t.string('first_name').notNullable();
    t.string('last_name');
    t.string('email');
    t.string('phone');
    t.string('company');
    t.string('position');
    t.string('source');
    t.string('status').defaultTo('new');
    t.integer('score').defaultTo(0);
    t.text('notes');
    t.string('tags');
    t.datetime('converted_at');
    t.datetime('created_at').defaultTo(db.fn.now());
    t.datetime('updated_at').defaultTo(db.fn.now());
    t.foreign('company_id').references('companies.id').onDelete('CASCADE');
    t.foreign('assignee_id').references('users.id');
  });

  await db.schema.createTableIfNotExists('contacts', (t) => {
    t.string('id').primary();
    t.string('company_id').notNullable();
    t.string('account_id');
    t.string('first_name').notNullable();
    t.string('last_name');
    t.string('email');
    t.string('phone');
    t.string('position');
    t.string('department');
    t.text('notes');
    t.datetime('created_at').defaultTo(db.fn.now());
    t.datetime('updated_at').defaultTo(db.fn.now());
    t.foreign('company_id').references('companies.id').onDelete('CASCADE');
  });

  await db.schema.createTableIfNotExists('accounts', (t) => {
    t.string('id').primary();
    t.string('company_id').notNullable();
    t.string('name').notNullable();
    t.string('website');
    t.string('phone');
    t.string('email');
    t.string('industry');
    t.integer('employees');
    t.float('revenue');
    t.string('address');
    t.string('city');
    t.string('country');
    t.text('notes');
    t.datetime('created_at').defaultTo(db.fn.now());
    t.datetime('updated_at').defaultTo(db.fn.now());
    t.foreign('company_id').references('companies.id').onDelete('CASCADE');
  });

  await db.schema.createTableIfNotExists('opportunities', (t) => {
    t.string('id').primary();
    t.string('company_id').notNullable();
    t.string('stage_id').notNullable();
    t.string('contact_id');
    t.string('account_id');
    t.string('name').notNullable();
    t.float('value').defaultTo(0);
    t.string('currency').defaultTo('MXN');
    t.integer('probability').defaultTo(0);
    t.datetime('expected_close_date');
    t.string('status').defaultTo('open');
    t.text('notes');
    t.string('lost_reason');
    t.datetime('created_at').defaultTo(db.fn.now());
    t.datetime('updated_at').defaultTo(db.fn.now());
    t.foreign('company_id').references('companies.id').onDelete('CASCADE');
    t.foreign('stage_id').references('pipeline_stages.id');
  });

  await db.schema.createTableIfNotExists('activities', (t) => {
    t.string('id').primary();
    t.string('company_id').notNullable();
    t.string('owner_id').notNullable();
    t.string('lead_id');
    t.string('contact_id');
    t.string('account_id');
    t.string('opportunity_id');
    t.string('type').notNullable();
    t.string('subject').notNullable();
    t.text('description');
    t.string('outcome');
    t.datetime('scheduled_at');
    t.datetime('completed_at');
    t.integer('duration');
    t.datetime('created_at').defaultTo(db.fn.now());
    t.datetime('updated_at').defaultTo(db.fn.now());
    t.foreign('company_id').references('companies.id').onDelete('CASCADE');
    t.foreign('owner_id').references('users.id');
  });

  await db.schema.createTableIfNotExists('crm_tasks', (t) => {
    t.string('id').primary();
    t.string('company_id').notNullable();
    t.string('assignee_id');
    t.string('lead_id');
    t.string('contact_id');
    t.string('account_id');
    t.string('opportunity_id');
    t.string('title').notNullable();
    t.text('description');
    t.string('priority').defaultTo('medium');
    t.string('status').defaultTo('pending');
    t.datetime('due_date');
    t.datetime('completed_at');
    t.datetime('created_at').defaultTo(db.fn.now());
    t.datetime('updated_at').defaultTo(db.fn.now());
    t.foreign('company_id').references('companies.id').onDelete('CASCADE');
  });

  await db.schema.createTableIfNotExists('audit_logs', (t) => {
    t.string('id').primary();
    t.string('company_id').notNullable();
    t.string('user_id');
    t.string('module').notNullable();
    t.string('action').notNullable();
    t.string('entity_type');
    t.string('entity_id');
    t.text('details');
    t.string('ip_address');
    t.datetime('created_at').defaultTo(db.fn.now());
    t.foreign('company_id').references('companies.id');
  });

  console.log('✅ Migraciones completadas!\n');
  await db.destroy();
}

migrate().catch((e) => {
  console.error('❌ Error en migraciones:', e);
  process.exit(1);
});
