import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';

// ─── Validar secrets en producción ───────────────────────────────────────────
// En desarrollo se usan valores por defecto para conveniencia.
// En producción, fallar temprano si los secrets no están configurados.

const isProd = process.env.NODE_ENV === 'production';

function requireSecret(envVar: string, fallback: string): string {
  const value = process.env[envVar];
  if (!value) {
    if (isProd) {
      // En producción, no arrancar con secrets inseguros
      throw new Error(
        `[SECURITY] Variable de entorno ${envVar} no configurada. ` +
        `Genera un secret seguro con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
      );
    }
    console.warn(`[WARN] ${envVar} no configurada. Usando valor por defecto (SOLO PARA DESARROLLO).`);
    return fallback;
  }
  if (isProd && value.length < 32) {
    throw new Error(`[SECURITY] ${envVar} debe tener al menos 32 caracteres en producción.`);
  }
  return value;
}

const JWT_SECRET          = requireSecret('JWT_SECRET',          'dev_jwt_secret_min_32_chars_long_!!');
const JWT_REFRESH_SECRET  = requireSecret('JWT_REFRESH_SECRET',  'dev_refresh_secret_min_32_chars_!!');
const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN         || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
};
