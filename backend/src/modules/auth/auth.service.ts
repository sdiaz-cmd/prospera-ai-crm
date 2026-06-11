import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { run, get, all } from '../../database/db';
import { createSchema } from '../../database/schema';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';

export class AuthService {
  async register(data: { firstName: string; lastName: string; email: string; password: string; companyName: string }) {
    const existingUser = get('SELECT id FROM users WHERE email = ?', [data.email]);
    if (existingUser) throw new Error('Ya existe una cuenta con este correo electrónico');

    const slug = this.generateSlug(data.companyName);
    const slugExists = get('SELECT id FROM companies WHERE slug = ?', [slug]);
    const finalSlug = slugExists ? `${slug}-${uuid().slice(0, 8)}` : slug;

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const companyId = uuid();
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    run(`INSERT INTO companies (id, name, slug, email, plan, trial_ends_at) VALUES (?, ?, ?, ?, 'trial', ?)`,
      [companyId, data.companyName, finalSlug, data.email, trialEndsAt]);

    // Permisos del sistema
    const allPerms = all<{ id: string }>('SELECT id FROM permissions');

    // Roles
    const adminId = uuid();
    run('INSERT INTO roles (id, company_id, name, description, is_system) VALUES (?, ?, ?, ?, 1)',
      [adminId, companyId, 'Administrador', 'Acceso completo a toda la plataforma']);
    for (const perm of allPerms) {
      run('INSERT INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)', [uuid(), adminId, perm.id]);
    }

    const managerId = uuid();
    run('INSERT INTO roles (id, company_id, name, description, is_system) VALUES (?, ?, ?, ?, 1)',
      [managerId, companyId, 'Gerente', 'Acceso a CRM, reportes y gestión de equipo']);

    const salesId = uuid();
    run('INSERT INTO roles (id, company_id, name, description, is_system) VALUES (?, ?, ?, ?, 1)',
      [salesId, companyId, 'Ejecutivo de Ventas', 'Acceso a CRM: leads, contactos, oportunidades']);

    // Pipeline por defecto
    const pipelineId = uuid();
    run('INSERT INTO pipelines (id, company_id, name, is_default) VALUES (?, ?, ?, 1)',
      [pipelineId, companyId, 'Pipeline Principal']);

    const stages = [
      ['Nuevo Lead', 1, 10, '#6366f1'], ['Contactado', 2, 25, '#8b5cf6'],
      ['Calificado', 3, 40, '#3b82f6'], ['Propuesta', 4, 60, '#f59e0b'],
      ['Negociación', 5, 75, '#ef4444'], ['Cerrado Ganado', 6, 100, '#10b981'],
      ['Cerrado Perdido', 7, 0, '#6b7280'],
    ];
    for (const [name, order, prob, color] of stages) {
      run('INSERT INTO pipeline_stages (id, pipeline_id, name, order_index, probability, color) VALUES (?, ?, ?, ?, ?, ?)',
        [uuid(), pipelineId, name, order, prob, color]);
    }

    // Usuario
    const userId = uuid();
    run('INSERT INTO users (id, email, first_name, last_name, password, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [userId, data.email, data.firstName, data.lastName, hashedPassword]);
    run('INSERT INTO user_companies (id, user_id, company_id, role_id, is_owner, is_active) VALUES (?, ?, ?, ?, 1, 1)',
      [uuid(), userId, companyId, adminId]);

    const tokens = this.generateTokens(userId, companyId, data.email);
    this.saveRefreshToken(userId, tokens.refreshToken);

    return {
      user: { id: userId, email: data.email, firstName: data.firstName, lastName: data.lastName },
      company: { id: companyId, name: data.companyName, slug: finalSlug, plan: 'trial', currency: 'MXN', timezone: 'America/Mexico_City' },
      role: { id: adminId, name: 'Administrador' },
      permissions: allPerms.map(() => '').length > 0 ? ['*'] : [],
      isOwner: true,
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    // Búsqueda case-insensitive para evitar problemas con normalización de emails
    const user = get<Record<string, unknown>>('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (!user || !user.is_active) throw new Error('Credenciales incorrectas');

    const valid = await bcrypt.compare(password, user.password as string);
    if (!valid) throw new Error('Credenciales incorrectas');

    const uc = get<Record<string, unknown>>('SELECT * FROM user_companies WHERE user_id = ? AND is_active = 1', [user.id]);
    if (!uc) throw new Error('No tienes acceso a ninguna empresa');

    const company = get<Record<string, unknown>>('SELECT * FROM companies WHERE id = ?', [uc.company_id]);
    const role = get<Record<string, unknown>>('SELECT * FROM roles WHERE id = ?', [uc.role_id]);

    const perms = all<{ module: string; action: string }>(
      'SELECT p.module, p.action FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = ?',
      [role!.id]
    );
    const permissions = perms.map(p => `${p.module}:${p.action}`);

    run('UPDATE users SET last_login_at = ? WHERE id = ?', [new Date().toISOString(), user.id]);

    const tokens = this.generateTokens(user.id as string, company!.id as string, user.email as string);
    this.saveRefreshToken(user.id as string, tokens.refreshToken);

    return {
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, avatarUrl: user.avatar_url },
      company: { id: company!.id, name: company!.name, slug: company!.slug, plan: company!.plan, logoUrl: company!.logo_url, currency: company!.currency, timezone: company!.timezone },
      role: { id: role!.id, name: role!.name },
      permissions,
      isOwner: !!(uc.is_owner),
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const stored = get<Record<string, unknown>>('SELECT * FROM refresh_tokens WHERE token = ?', [refreshToken]);
    if (!stored || stored.is_revoked || new Date(stored.expires_at as string) < new Date()) throw new Error('Refresh token inválido o expirado');

    let payload;
    try { payload = verifyRefreshToken(refreshToken); } catch { throw new Error('Refresh token inválido'); }

    run('UPDATE refresh_tokens SET is_revoked = 1 WHERE id = ?', [stored.id]);
    const tokens = this.generateTokens(payload.userId, payload.companyId, payload.email);
    this.saveRefreshToken(payload.userId, tokens.refreshToken);
    return tokens;
  }

  async logout(refreshToken: string) {
    run('UPDATE refresh_tokens SET is_revoked = 1 WHERE token = ?', [refreshToken]);
  }

  async getMe(userId: string, companyId: string) {
    const uc = get<Record<string, unknown>>('SELECT * FROM user_companies WHERE user_id = ? AND company_id = ?', [userId, companyId]);
    if (!uc) throw new Error('Usuario no encontrado');

    const user = get<Record<string, unknown>>('SELECT id, email, first_name, last_name, avatar_url, last_login_at FROM users WHERE id = ?', [userId]);
    const company = get<Record<string, unknown>>('SELECT id, name, slug, plan, logo_url, currency, timezone FROM companies WHERE id = ?', [companyId]);
    const role = get<Record<string, unknown>>('SELECT * FROM roles WHERE id = ?', [uc.role_id]);
    const perms = all<{ module: string; action: string }>(
      'SELECT p.module, p.action FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = ?',
      [role!.id]
    );

    return {
      user: { id: user!.id, email: user!.email, firstName: user!.first_name, lastName: user!.last_name, avatarUrl: user!.avatar_url, lastLoginAt: user!.last_login_at },
      company: { id: company!.id, name: company!.name, slug: company!.slug, plan: company!.plan, logoUrl: company!.logo_url, currency: company!.currency, timezone: company!.timezone },
      role: { id: role!.id, name: role!.name },
      permissions: perms.map(p => `${p.module}:${p.action}`),
      isOwner: !!(uc.is_owner),
    };
  }

  private generateTokens(userId: string, companyId: string, email: string) {
    return {
      accessToken: generateAccessToken({ userId, companyId, email }),
      refreshToken: generateRefreshToken({ userId, companyId, email }),
    };
  }

  private saveRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    run('INSERT INTO refresh_tokens (id, token, user_id, expires_at) VALUES (?, ?, ?, ?)',
      [uuid(), token, userId, expiresAt.toISOString()]);
  }

  async forgotPassword(email: string) {
    const user = get<{ id: string; first_name: string }>('SELECT id, first_name FROM users WHERE email = ?', [email]);
    // Siempre responder OK aunque el email no exista (seguridad)
    if (!user) return;

    // Invalida tokens previos
    run('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ?', [user.id]);

    const token = uuid().replace(/-/g, '') + uuid().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora
    run('INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [uuid(), user.id, token, expiresAt]);

    await this.sendResetEmail(email, user.first_name, token);
  }

  async resetPassword(token: string, newPassword: string) {
    const record = get<{ id: string; user_id: string; expires_at: string; used: number }>(
      'SELECT * FROM password_reset_tokens WHERE token = ?', [token]
    );
    if (!record || record.used || new Date(record.expires_at) < new Date()) {
      throw new Error('El enlace de recuperación es inválido o ya expiró');
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    run('UPDATE users SET password = ? WHERE id = ?', [hashed, record.user_id]);
    run('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [record.id]);
    // Revocar todos los refresh tokens del usuario por seguridad
    run('UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?', [record.user_id]);
  }

  private async sendResetEmail(email: string, firstName: string, token: string) {
    const resendKey = process.env.RESEND_API_KEY;
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    if (!resendKey) {
      // En desarrollo: imprime el link en consola
      console.log(`\n[Reset Password Link para ${email}]:\n${resetUrl}\n`);
      return;
    }

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'PROSPERA.AI <noreply@prospera.ai>',
        to: email,
        subject: 'Recupera tu contraseña — PROSPERA.AI',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;">
            <h2 style="color:#6366f1;margin-bottom:8px;">PROSPERA.AI</h2>
            <h3 style="color:#111;margin-bottom:16px;">Recupera tu contraseña</h3>
            <p style="color:#555;">Hola ${firstName}, recibimos una solicitud para restablecer tu contraseña.</p>
            <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
              Restablecer contraseña
            </a>
            <p style="color:#999;font-size:13px;">Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.</p>
          </div>
        `,
      }),
    });
  }

  private generateSlug(name: string) {
    return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
  }
}
