import { v4 as uuid } from 'uuid';
import { run, get, all } from '../../database/db';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import normalizeEmailFn from 'validator/lib/normalizeEmail';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'PROSPERA.AI <noreply@prospera.ai>';

export class InvitationsService {

  async invite(companyId: string, invitedBy: string, data: { email: string; roleId: string }) {
    // Verificar que el rol pertenece a la empresa
    const role = get<{ id: string; name: string }>(
      'SELECT id, name FROM roles WHERE id = ? AND company_id = ?',
      [data.roleId, companyId]
    );
    if (!role) throw new Error('Rol no válido');

    // Verificar que el email no tenga ya una cuenta en esta empresa
    const existing = get(
      `SELECT u.id FROM users u
       JOIN user_companies uc ON uc.user_id = u.id
       WHERE u.email = ? AND uc.company_id = ?`,
      [data.email, companyId]
    );
    if (existing) throw new Error('Este correo ya tiene una cuenta en tu empresa');

    // Revocar invitaciones previas no usadas para este email+empresa
    run(
      `DELETE FROM user_invitations WHERE company_id = ? AND email = ? AND accepted_at IS NULL`,
      [companyId, data.email]
    );

    const token = uuid().replace(/-/g, '') + uuid().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 días

    const invitationId = uuid();
    run(
      `INSERT INTO user_invitations (id, company_id, email, role_id, invited_by, token, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [invitationId, companyId, data.email, data.roleId, invitedBy, token, expiresAt]
    );

    const company = get<{ name: string }>('SELECT name FROM companies WHERE id = ?', [companyId]);
    const inviter = get<{ first_name: string; last_name: string }>('SELECT first_name, last_name FROM users WHERE id = ?', [invitedBy]);

    const link = `${APP_URL}/invite/${token}`;

    // Intentar enviar email — si falla, igual retornamos el link para compartir manualmente
    try {
      await this.sendInvitationEmail(
        data.email,
        company?.name || 'Tu empresa',
        `${inviter?.first_name || ''} ${inviter?.last_name || ''}`.trim(),
        role.name,
        token
      );
    } catch (emailErr) {
      console.warn('[INVITACIÓN] Email no enviado (continúa):', (emailErr as Error).message);
    }

    return { id: invitationId, email: data.email, role: role.name, expiresAt, link };
  }

  getByToken(token: string) {
    const inv = get<{
      id: string; email: string; role_id: string; company_id: string;
      expires_at: string; accepted_at: string | null;
    }>(
      'SELECT * FROM user_invitations WHERE token = ?',
      [token]
    );
    if (!inv) throw new Error('Invitación no válida');
    if (inv.accepted_at) throw new Error('Esta invitación ya fue usada');
    if (new Date() > new Date(inv.expires_at)) throw new Error('Esta invitación ha expirado');

    const company = get<{ name: string }>('SELECT name FROM companies WHERE id = ?', [inv.company_id]);
    const role = get<{ name: string }>('SELECT name FROM roles WHERE id = ?', [inv.role_id]);

    return {
      email: inv.email,
      companyName: company?.name || '',
      roleName: role?.name || '',
    };
  }

  async accept(token: string, data: { firstName: string; lastName: string; password: string }) {
    const inv = get<{
      id: string; email: string; role_id: string; company_id: string;
      expires_at: string; accepted_at: string | null;
    }>(
      'SELECT * FROM user_invitations WHERE token = ?',
      [token]
    );
    if (!inv) throw new Error('Invitación no válida');
    if (inv.accepted_at) throw new Error('Esta invitación ya fue usada');
    if (new Date() > new Date(inv.expires_at)) throw new Error('Esta invitación ha expirado');

    // Normalizar email igual que express-validator normalizeEmail() para consistencia con login
    const normalizedEmail = normalizeEmailFn(inv.email) || inv.email.toLowerCase();

    // Verificar si el usuario ya existe (en otra empresa) o crear uno nuevo
    let userId = (get<{ id: string }>('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [normalizedEmail]))?.id;

    const hashedPassword = await bcrypt.hash(data.password, 12);

    if (userId) {
      // Ya tiene cuenta — actualizar nombre y contraseña
      run('UPDATE users SET first_name = ?, last_name = ?, password = ? WHERE id = ?',
        [data.firstName, data.lastName, hashedPassword, userId]);
    } else {
      userId = uuid();
      run(
        'INSERT INTO users (id, email, first_name, last_name, password, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        [userId, normalizedEmail, data.firstName, data.lastName, hashedPassword]
      );
    }

    // Vincular a la empresa con el rol asignado
    run(
      'INSERT OR IGNORE INTO user_companies (id, user_id, company_id, role_id, is_owner, is_active) VALUES (?, ?, ?, ?, 0, 1)',
      [uuid(), userId, inv.company_id, inv.role_id]
    );

    // Marcar invitación como aceptada
    run('UPDATE user_invitations SET accepted_at = ? WHERE id = ?',
      [new Date().toISOString(), inv.id]);

    // Generar tokens para auto-login
    const company = get<{ id: string; name: string; slug: string; plan: string; logo_url: string; currency: string; timezone: string }>(
      'SELECT id, name, slug, plan, logo_url, currency, timezone FROM companies WHERE id = ?', [inv.company_id]
    );
    const role = get<{ id: string; name: string }>('SELECT id, name FROM roles WHERE id = ?', [inv.role_id]);
    const user = get<{ id: string; email: string; first_name: string; last_name: string }>(
      'SELECT id, email, first_name, last_name FROM users WHERE id = ?', [userId]
    );

    const accessToken = generateAccessToken({ userId, companyId: inv.company_id, email: normalizedEmail });
    const refreshToken = generateRefreshToken({ userId, companyId: inv.company_id, email: normalizedEmail });
    run('INSERT INTO refresh_tokens (id, token, user_id, expires_at) VALUES (?, ?, ?, ?)',
      [uuid(), refreshToken, userId, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()]);

    return {
      success: true,
      accessToken,
      refreshToken,
      user: { id: userId, email: inv.email, firstName: data.firstName, lastName: data.lastName },
      company: { id: company?.id, name: company?.name, slug: company?.slug, plan: company?.plan, logoUrl: company?.logo_url, currency: company?.currency || 'USD', timezone: company?.timezone || 'UTC' },
      role: { id: role?.id, name: role?.name },
      permissions: [],
      isOwner: false,
    };
  }

  listPending(companyId: string) {
    return all(
      `SELECT ui.id, ui.email, r.name as role_name, ui.expires_at, ui.created_at,
              u.first_name || ' ' || u.last_name as invited_by_name
       FROM user_invitations ui
       JOIN roles r ON r.id = ui.role_id
       JOIN users u ON u.id = ui.invited_by
       WHERE ui.company_id = ? AND ui.accepted_at IS NULL
       ORDER BY ui.created_at DESC`,
      [companyId]
    );
  }

  revoke(invitationId: string, companyId: string) {
    run('DELETE FROM user_invitations WHERE id = ? AND company_id = ?', [invitationId, companyId]);
  }

  private async sendInvitationEmail(
    toEmail: string,
    companyName: string,
    inviterName: string,
    roleName: string,
    token: string
  ) {
    const link = `${APP_URL}/invite/${token}`;

    if (!RESEND_API_KEY) {
      console.log(`[INVITACIÓN] Enlace para ${toEmail}: ${link}`);
      return;
    }

    console.log(`[RESEND] Enviando invitación a ${toEmail}, from: ${RESEND_FROM}, link: ${link}`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: toEmail,
        subject: `${inviterName} te invitó a ${companyName} en PROSPERA.AI`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="color:#2563eb">PROSPERA.AI</h2>
            <p>Hola,</p>
            <p><strong>${inviterName}</strong> te invitó a unirte a <strong>${companyName}</strong> como <strong>${roleName}</strong>.</p>
            <p>Haz clic en el siguiente botón para crear tu cuenta:</p>
            <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
              Aceptar invitación
            </a>
            <p>O copia este enlace en tu navegador:</p>
            <p style="color:#555;font-size:13px;word-break:break-all">${link}</p>
            <p style="color:#888;font-size:12px">Este enlace expira en 7 días.</p>
          </div>
        `,
      }),
    });

    const body = await res.json().catch(() => ({}));
    console.log(`[RESEND] Status: ${res.status}`, JSON.stringify(body));

    if (!res.ok) {
      throw new Error(`Resend error ${res.status}: ${JSON.stringify(body)}`);
    }
  }
}
