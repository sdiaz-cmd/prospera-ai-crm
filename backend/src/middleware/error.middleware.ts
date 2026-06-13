import { Request, Response, NextFunction } from 'express';

const isProd = process.env.NODE_ENV === 'production';

// Mensajes genéricos para errores que no deben exponerse al cliente en producción
const SAFE_MESSAGES: Record<number, string> = {
  400: 'Solicitud incorrecta',
  401: 'No autenticado',
  403: 'Acceso denegado',
  404: 'Recurso no encontrado',
  409: 'Conflicto de datos',
  422: 'Datos de entrada inválidos',
  429: 'Demasiadas solicitudes',
  500: 'Error interno del servidor',
};

/**
 * Determina si un mensaje de error es seguro para mostrar al cliente.
 * Filtra mensajes que pueden revelar detalles internos (nombres de tablas,
 * rutas de archivos, versiones de librerías, etc.).
 */
function isSafeMessage(message: string): boolean {
  const dangerous = [
    /SQLITE/i, /sqlite/i,
    /UNIQUE constraint/i,
    /no such table/i,
    /FOREIGN KEY/i,
    /node_modules/i,
    /at Object\./,
    /at Function\./,
    /\.ts:\d+/,
    /\.js:\d+/,
    /Cannot read prop/,
    /undefined is not/,
  ];
  return !dangerous.some(pattern => pattern.test(message));
}

export const notFound = (req: Request, res: Response): void => {
  // En producción no revelar la ruta exacta que no existe
  const message = isProd
    ? 'Recurso no encontrado'
    : `Ruta no encontrada: ${req.method} ${req.originalUrl}`;

  res.status(404).json({ success: false, message });
};

export const errorHandler = (
  err: Error & { status?: number; statusCode?: number },
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const status = err.status ?? err.statusCode ?? 500;

  // Siempre loguear internamente con detalle completo
  if (status >= 500) {
    console.error('[ERROR]', err.message, err.stack);
  }

  let message: string;

  if (!isProd) {
    // En desarrollo: mostrar el mensaje real para facilitar debugging
    message = err.message || 'Error desconocido';
  } else {
    // En producción: solo mostrar si el mensaje es seguro (no revela internals)
    message = isSafeMessage(err.message)
      ? err.message
      : (SAFE_MESSAGES[status] ?? 'Error interno del servidor');
  }

  res.status(status).json({ success: false, message });
};
