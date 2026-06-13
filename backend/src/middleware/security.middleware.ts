import { Request, Response, NextFunction } from 'express';

/**
 * Headers de seguridad adicionales no cubiertos por helmet por defecto.
 * Se aplican a todas las respuestas de la API.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Previene que el navegador "olfatee" el tipo MIME (ya en helmet, pero por si acaso)
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Previene clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Deshabilita la detección XSS del browser antiguo (ya no relevante en Chrome/FF modernos
  // pero IE/Edge legacy lo usan; en algunos navegadores activarlo puede ser peor, se deshabilita)
  res.setHeader('X-XSS-Protection', '0');

  // No cachear respuestas de API (previene que proxies cacheen datos sensibles)
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }

  // Permissions Policy — deshabilitar APIs sensibles no usadas
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );

  next();
}

/**
 * Sanitiza un string para prevenir log injection.
 * Remueve caracteres de control y saltos de línea.
 */
export function sanitizeLog(value: string): string {
  return value.replace(/[\r\n\t\x00-\x1f\x7f]/g, '_').slice(0, 200);
}

/**
 * Valida que un ID tenga formato UUID válido.
 * Previene inyección de rutas maliciosas.
 */
export function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
