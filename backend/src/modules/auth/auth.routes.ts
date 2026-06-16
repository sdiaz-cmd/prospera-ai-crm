import { Router } from 'express';
import {
  register, login, refresh, logout, getMe,
  forgotPassword, resetPassword,
  registerValidation, loginValidation,
  getMyCompanies, switchCompany, createBranch,
} from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Multi-empresa
router.get('/companies', authenticate, getMyCompanies);
router.post('/switch-company', authenticate, switchCompany);
router.post('/create-branch', authenticate, createBranch);

export default router;
