import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const authService = new AuthService();

export const registerValidation = [
  body('firstName').trim().notEmpty().withMessage('El nombre es requerido'),
  body('lastName').trim().notEmpty().withMessage('El apellido es requerido'),
  body('email').isEmail().normalizeEmail().withMessage('Correo electrónico inválido'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe tener mayúscula, minúscula y número'),
  body('companyName').trim().notEmpty().withMessage('El nombre de la empresa es requerido'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Correo electrónico inválido').customSanitizer(v => v?.toLowerCase?.() ?? v),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
];

export const register = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const fieldErrors: Record<string, string[]> = {};
    errors.array().forEach((e) => {
      const field = (e as { path: string }).path;
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(e.msg);
    });
    sendError(res, 'Datos de registro inválidos', 422, fieldErrors);
    return;
  }

  try {
    const result = await authService.register(req.body);
    sendSuccess(res, result, 'Cuenta creada exitosamente', 201);
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      next(error);
    }
  }
};

export const login = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Datos de inicio de sesión inválidos', 422);
    return;
  }

  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    sendSuccess(res, result, 'Sesión iniciada exitosamente');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 401);
    } else {
      next(error);
    }
  }
};

export const refresh = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      sendError(res, 'Refresh token requerido', 400);
      return;
    }
    const tokens = await authService.refresh(refreshToken);
    sendSuccess(res, tokens, 'Tokens renovados');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 401);
    } else {
      next(error);
    }
  }
};

export const logout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    sendSuccess(res, null, 'Sesión cerrada exitosamente');
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) { sendError(res, 'El correo es requerido', 400); return; }
    await authService.forgotPassword(email);
    // Siempre responder OK para no revelar si el email existe
    sendSuccess(res, null, 'Si el correo existe, recibirás un enlace para restablecer tu contraseña');
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) { sendError(res, 'Token y contraseña son requeridos', 400); return; }
    if (password.length < 8) { sendError(res, 'La contraseña debe tener al menos 8 caracteres', 400); return; }
    await authService.resetPassword(token, password);
    sendSuccess(res, null, 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.');
  } catch (e: unknown) {
    sendError(res, (e as Error).message, 400);
  }
};

export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'No autenticado', 401);
      return;
    }
    const result = await authService.getMe(req.user.userId, req.user.companyId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};
