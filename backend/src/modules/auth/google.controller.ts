import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get as dbGet, run as dbRun } from '../../database/db';
import { AuthenticatedRequest } from '../../types';

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI  || 'http://localhost:4000/api/auth/google/callback';
const FRONTEND_URL         = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173';
const JWT_SECRET           = process.env.JWT_SECRET         || 'prospera-secret-key';
const JWT_REFRESH_SECRET   = process.env.JWT_REFRESH_SECRET  || 'prospera-refresh-secret';

// ── 1. Redirect to Google consent screen ─────────────────────────────────────

export function googleAuth(req: Request, res: Response) {
  if (!GOOGLE_CLIENT_ID) {
    return res.redirect(`${FRONTEND_URL}/login?error=google_not_configured`);
  }

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://mail.google.com/',          // Gmail send scope
  ].join(' ');

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id',     GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri',  GOOGLE_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope',         scopes);
  url.searchParams.set('access_type',   'offline');
  url.searchParams.set('prompt',        'consent');

  res.redirect(url.toString());
}

// ── 2. Handle Google callback ─────────────────────────────────────────────────

export async function googleCallback(req: Request, res: Response) {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}/login?error=google_denied`);
  }

  try {
    // Exchange code → tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code:          code as string,
        client_id:     GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri:  GOOGLE_REDIRECT_URI,
        grant_type:    'authorization_code',
      }),
    });

    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      id_token?: string;
      error?: string;
    };

    if (!tokens.access_token) {
      console.error('[Google OAuth] Token exchange failed:', tokens);
      return res.redirect(`${FRONTEND_URL}/login?error=google_token_failed`);
    }

    // Get Google user info
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const gUser = await infoRes.json() as {
      id: string; email: string;
      given_name?: string; family_name?: string; picture?: string;
    };

    if (!gUser.email) {
      return res.redirect(`${FRONTEND_URL}/login?error=google_no_email`);
    }

    // Find user by google_id OR email
    let user = dbGet<{
      id: string; first_name: string; last_name: string; email: string; is_active: number;
    }>(`SELECT id, first_name, last_name, email, is_active
        FROM users WHERE google_id = ? OR email = ? LIMIT 1`,
      [gUser.id, gUser.email]
    );

    if (!user) {
      // New user — create account (random password, they'll always use Google to log in)
      const newId  = uuid();
      const randPw = await bcrypt.hash(uuid() + Date.now(), 10);
      dbRun(
        `INSERT INTO users
           (id, email, password, first_name, last_name, avatar_url, google_id, google_refresh_token, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          newId,
          gUser.email,
          randPw,
          gUser.given_name  || gUser.email.split('@')[0],
          gUser.family_name || '',
          gUser.picture     || null,
          gUser.id,
          tokens.refresh_token || null,
        ]
      );
      user = {
        id: newId,
        first_name: gUser.given_name || gUser.email.split('@')[0],
        last_name:  gUser.family_name || '',
        email:      gUser.email,
        is_active:  1,
      };

      // New user has no company → go to register
      const p = new URLSearchParams({ google: '1', email: gUser.email });
      return res.redirect(`${FRONTEND_URL}/register?${p}`);
    }

    if (!user.is_active) {
      return res.redirect(`${FRONTEND_URL}/login?error=account_inactive`);
    }

    // Link / update Google data
    dbRun(
      `UPDATE users
         SET google_id = ?,
             google_refresh_token = COALESCE(?, google_refresh_token),
             avatar_url = COALESCE(avatar_url, ?),
             updated_at = datetime('now')
       WHERE id = ?`,
      [gUser.id, tokens.refresh_token || null, gUser.picture || null, user.id]
    );

    // Find active company membership
    const membership = dbGet<{ company_id: string; role_id: string; is_owner: number }>(
      `SELECT company_id, role_id, is_owner
         FROM user_companies WHERE user_id = ? AND is_active = 1 LIMIT 1`,
      [user.id]
    );

    if (!membership) {
      const p = new URLSearchParams({ google: '1', email: user.email });
      return res.redirect(`${FRONTEND_URL}/register?${p}`);
    }

    const company = dbGet<{ id: string; name: string; slug: string; plan: string; logo_url: string | null }>(
      'SELECT id, name, slug, plan, logo_url FROM companies WHERE id = ?',
      [membership.company_id]
    );
    const role = dbGet<{ id: string; name: string }>(
      'SELECT id, name FROM roles WHERE id = ?',
      [membership.role_id]
    );

    // Generate tokens
    const accessToken  = jwt.sign(
      { userId: user.id, companyId: membership.company_id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    const rtExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    dbRun(
      'INSERT INTO refresh_tokens (id, token, user_id, expires_at) VALUES (?, ?, ?, ?)',
      [uuid(), refreshToken, user.id, rtExpires]
    );
    dbRun("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", [user.id]);

    // Build redirect to frontend with all session data
    const params = new URLSearchParams({
      accessToken,
      refreshToken,
      userId:      user.id,
      firstName:   user.first_name,
      lastName:    user.last_name,
      email:       user.email,
      companyId:   company?.id   || '',
      companyName: company?.name || '',
      companySlug: company?.slug || '',
      companyPlan: company?.plan || 'trial',
      roleName:    role?.name    || '',
      isOwner:     membership.is_owner ? '1' : '0',
    });

    res.redirect(`${FRONTEND_URL}/auth/google/callback?${params}`);
  } catch (err) {
    console.error('[Google OAuth] Unexpected error:', err);
    res.redirect(`${FRONTEND_URL}/login?error=google_error`);
  }
}

// ── 3. Status — is Gmail connected? ──────────────────────────────────────────

export function googleStatus(req: AuthenticatedRequest, res: Response) {
  const row = dbGet<{ google_id: string | null; google_refresh_token: string | null; email: string }>(
    'SELECT google_id, google_refresh_token, email FROM users WHERE id = ?',
    [req.user!.userId]
  );
  res.json({
    data: {
      connected:      !!row?.google_id,
      gmailConnected: !!(row?.google_id && row?.google_refresh_token),
      googleEmail:    row?.email || null,
    },
  });
}

// ── 4. Disconnect Google / Gmail ──────────────────────────────────────────────

export function googleDisconnect(req: AuthenticatedRequest, res: Response) {
  dbRun(
    "UPDATE users SET google_id = NULL, google_refresh_token = NULL, updated_at = datetime('now') WHERE id = ?",
    [req.user!.userId]
  );
  res.json({ success: true, message: 'Google desvinculado' });
}

// ── 5. Send via Gmail API (used by campaigns) ─────────────────────────────────

export async function sendViaGmail(
  userId: string,
  to: string,
  subject: string,
  html: string,
  from?: string
): Promise<{ success: boolean; error?: string }> {
  const user = dbGet<{ google_refresh_token: string | null; email: string }>(
    'SELECT google_refresh_token, email FROM users WHERE id = ?',
    [userId]
  );

  if (!user?.google_refresh_token) {
    return { success: false, error: 'Gmail no vinculado' };
  }

  try {
    // Refresh access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: user.google_refresh_token,
        grant_type:    'refresh_token',
      }),
    });
    const tok = await tokenRes.json() as { access_token?: string; error?: string };

    if (!tok.access_token) {
      return { success: false, error: `Error refrescando token: ${tok.error}` };
    }

    // Build RFC 2822 email
    const fromAddr = from || `PROSPERA.AI <${user.email}>`;
    const raw = [
      `From: ${fromAddr}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      html,
    ].join('\r\n');

    const encoded = Buffer.from(raw).toString('base64url');

    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${tok.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    });

    if (!gmailRes.ok) {
      const err = await gmailRes.json().catch(() => ({}));
      return { success: false, error: JSON.stringify(err) };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
