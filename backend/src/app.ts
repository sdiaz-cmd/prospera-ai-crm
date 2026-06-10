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

// Routes
import authRoutes from './modules/auth/auth.routes';
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

// Inicializar schema de base de datos
createSchema();

const app = express();

app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));

// CORS: acepta localhost en dev y cualquier dominio configurado en CORS_ORIGIN
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Sin origin (requests del mismo servidor) o wildcard → permitir
    if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permisivo: frontend servido desde el mismo Express
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { success: false, message: 'Demasiadas solicitudes' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Demasiados intentos de autenticación' } });

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.get('/health', (_, res) => res.json({ status: 'ok', app: 'PROSPERA.AI API', version: '1.0.0', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
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
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/invoices', invoicesRoutes);
// Webhook
app.use('/api/webhook', webhookRoutes);
// Reports
app.use('/api/reports', reportsRoutes);
// Landing Pages
app.use('/api/landing-pages', landingRoutes);
// Marketing
app.use('/api/campaigns', campaignsRoutes);
// AI
app.use('/api/ai', aiRoutes);
// Apollo
app.use('/api/apollo', apolloRoutes);
// Invitations
app.use('/api/invitations', invitationsRoutes);

// ─── Servir frontend compilado (modo compartido/público) ─────────────────────
// Cuando el frontend está compilado (npm run build en /frontend),
// Express lo sirve directamente. Así solo necesitas exponer el puerto 4000.
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // Catch-all para React Router: cualquier ruta no-API devuelve index.html
  app.get(/^(?!\/api|\/health).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
