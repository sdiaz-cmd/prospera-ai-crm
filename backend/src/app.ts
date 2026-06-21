import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { createSchema } from './database/schema';
import { errorHandler, notFound } from './middleware/error.middleware';
import { requireFeature } from './middleware/plan.middleware';
import { authenticate } from './middleware/auth.middleware';
import { securityHeaders } from './middleware/security.middleware';

// Routes
import authRoutes from './modules/auth/auth.routes';
import googleAuthRoutes from './modules/auth/google.routes';
import usersRoutes from './modules/users/users.routes';
import rolesRoutes from './modules/roles/roles.routes';
import companiesRoutes from './modules/companies/companies.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
// CRM
import leadsRoutes from './modules/leads/leads.routes';
import contactsRoutes from './modules/contacts/contacts.routes';
import accountsRoutes from './modules/accounts/accounts.routes';
import opportunitiesRoutes from './modules/opportunities/opportunities.routes';
import activitiesRoutes from './modules/activities/activities.routes';
import tasksRoutes from './modules/tasks/tasks.routes';
import quotesRoutes from './modules/quotes/quotes.routes';
// ERP
import suppliersRoutes from './modules/suppliers/suppliers.routes';
import productsRoutes from './modules/products/products.routes';
import invoicesRoutes from './modules/invoices/invoices.routes';
// Webhook
import webhookRoutes from './modules/webhook/whatsapp.routes';
// Reports
import reportsRoutes from './modules/reports/reports.routes';
// Landing Pages
import landingRoutes from './modules/landing/landing.routes';
// Marketing
import campaignsRoutes from './modules/marketing/campaigns.routes';
// AI
import aiRoutes from './modules/ai/ai.routes';
// Apollo
import apolloRoutes from './modules/apollo/apollo.routes';
// Invitations
import invitationsRoutes from './modules/invitations/invitations.routes';
// Tickets
import ticketsRoutes from './modules/tickets/tickets.routes';
// Commissions
import commissionsRoutes from './modules/commissions/commissions.routes';
// Cost Centers
import costCentersRoutes from './modules/cost-centers/cost-centers.routes';
// Operations
import projectsRoutes from './modules/operations/projects.routes';
import cuadrillasRoutes from './modules/operations/cuadrillas.routes';
// Inventory
import inventoryRoutes from './modules/inventory/inventory.routes';
// WhatsApp
import whatsappSessionRoutes from './modules/whatsapp-session/whatsapp-session.routes';
import { whatsAppSessionService } from './modules/whatsapp-session/whatsapp-session.service';
import whatsappAgentRoutes from './modules/whatsapp-agent/whatsapp-agent.routes';
import whatsappInboxRoutes from './modules/whatsapp-inbox/whatsapp-inbox.routes';
// Email + Notifications
import emailRoutes from './modules/email/email.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
// Cron
import { startFollowupCron } from './cron/followup.cron';

// Inicializar DB y sesiones
createSchema();
whatsAppSessionService.reconnectSaved().catch(console.error);
startFollowupCron();

const app = express();

// ─── Proxy trust (Railway / Vercel) ───────────────────────────────────────────
app.set('trust proxy', 1);

// ─── Helmet con headers de seguridad completos ────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: isProd
    ? {
        directives: {
          defaultSrc:    ["'self'"],
          scriptSrc:     ["'self'"],
          styleSrc:      ["'self'", "'unsafe-inline'"],  // React styles
          imgSrc:        ["'self'", 'data:', 'https:'],
          connectSrc:    ["'self'", 'https://api.anthropic.com'],
          fontSrc:       ["'self'", 'https://fonts.gstatic.com'],
          objectSrc:     ["'none'"],
          frameAncestors:["'none'"],
          baseUri:       ["'self'"],
          formAction:    ["'self'"],
        },
      }
    : false,
  hsts: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
}));

// ─── Headers de seguridad adicionales ────────────────────────────────────────
app.use(securityHeaders);

// ─── CORS estricto ────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin Origin (same-origin, mobile apps, Postman en dev)
    if (!origin) return callback(null, !isProd);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origen no permitido — ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // Pre-flight cache 24h
}));

// ─── Rate limiting ────────────────────────────────────────────────────────────

// Límite general para la API — 300 req / 15 min por IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes, intenta más tarde' },
  skip: (req) => req.path === '/health',
});

// Login / registro — 20 intentos / 15 min por IP (previene brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos de autenticación, espera 15 minutos' },
});

// Forgot password — 5 intentos / hora por IP (previene email flooding)
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes de recuperación de contraseña' },
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);

// ─── Body parsing — límite reducido para prevenir DoS ─────────────────────────
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Logging solo en desarrollo ───────────────────────────────────────────────
if (!isProd) app.use(morgan('dev'));

// ─── Health check (sin info de versión en prod) ───────────────────────────────
app.get('/health', (_, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  ...(isProd ? {} : { app: 'PROSPERA.AI API', version: '1.0.0' }),
}));

// ─── Rutas API ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/auth/google', googleAuthRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/company', companiesRoutes);
app.use('/api/dashboard', dashboardRoutes);
// CRM
app.use('/api/leads', leadsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/quotes', quotesRoutes);
// ERP
app.use('/api/suppliers', authenticate, requireFeature('erp'), suppliersRoutes);
app.use('/api/products', authenticate, requireFeature('erp'), productsRoutes);
app.use('/api/invoices', authenticate, requireFeature('erp'), invoicesRoutes);
// Webhook
app.use('/api/webhook', webhookRoutes);
// Reports
app.use('/api/reports', reportsRoutes);
// Landing Pages
app.use('/api/landing-pages', authenticate, requireFeature('landing'), landingRoutes);
// Marketing
app.use('/api/campaigns', authenticate, requireFeature('marketing'), campaignsRoutes);
// AI
app.use('/api/ai', authenticate, requireFeature('ai'), aiRoutes);
// Apollo
app.use('/api/apollo', apolloRoutes);
// Invitations
app.use('/api/invitations', invitationsRoutes);
// Tickets
app.use('/api/tickets', ticketsRoutes);
// Commissions
app.use('/api/commissions', commissionsRoutes);
// Cost Centers
app.use('/api/cost-centers', costCentersRoutes);
// Operations
app.use('/api/projects', projectsRoutes);
app.use('/api/cuadrillas', cuadrillasRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/notifications', notificationsRoutes);
// Inventory
app.use('/api/inventory', authenticate, requireFeature('erp'), inventoryRoutes);
// WhatsApp
app.use('/api/whatsapp', whatsappSessionRoutes);
app.use('/api/whatsapp-agent', whatsappAgentRoutes);
app.use('/api/whatsapp', whatsappInboxRoutes);

// ─── Frontend compilado (modo compartido) ──────────────────────────────────────
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, {
    maxAge: isProd ? '1y' : 0,
    etag: true,
  }));
  app.get(/^(?!\/api|\/health).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
