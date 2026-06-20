import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute, PublicRoute } from '@/components/common/ProtectedRoute';
import { Login } from '@/pages/auth/Login';
import { Register } from '@/pages/auth/Register';
import { ForgotPassword } from '@/pages/auth/ForgotPassword';
import { ResetPassword } from '@/pages/auth/ResetPassword';
import { AcceptInvitation } from '@/pages/auth/AcceptInvitation';
import { GoogleCallback } from '@/pages/auth/GoogleCallback';
import TrialExpired from '@/pages/TrialExpired';
import { Dashboard } from '@/pages/dashboard/Dashboard';
import { Users } from '@/pages/users/Users';
import { Settings } from '@/pages/settings/Settings';
import { ComingSoon } from '@/pages/ComingSoon';
// CRM
import { Leads } from '@/pages/crm/Leads';
import { Contacts } from '@/pages/crm/Contacts';
import { Prospecting } from '@/pages/crm/Prospecting';
import { Accounts } from '@/pages/crm/Accounts';
import { Opportunities } from '@/pages/crm/Opportunities';
import { Activities } from '@/pages/crm/Activities';
import { Tasks } from '@/pages/crm/Tasks';
import { Quotes } from '@/pages/crm/Quotes';
// ERP
import { Products } from '@/pages/erp/Products';
import { Suppliers } from '@/pages/erp/Suppliers';
import { Invoices } from '@/pages/erp/Invoices';
import { Inventory } from '@/pages/erp/Inventory';
import { AIPage } from '@/pages/ai/AIPage';
import { WhatsAppAgentPage } from '@/pages/whatsapp-agent/WhatsAppAgentPage';
import { Marketing } from '@/pages/marketing/Marketing';
import { LandingPages } from '@/pages/landing/LandingPages';
import { PublicLanding } from '@/pages/landing/PublicLanding';
import { Reports } from '@/pages/reports/Reports';
import { TicketsPage } from '@/pages/tickets/TicketsPage';
import { CommissionsPage } from '@/pages/commissions/CommissionsPage';
import { CostCentersPage } from '@/pages/cost-centers/CostCentersPage';
// Operations
import { OperationsDashboard } from '@/pages/operations/OperationsDashboard';
import { ProjectsList } from '@/pages/operations/ProjectsList';
import { ProjectDetail } from '@/pages/operations/ProjectDetail';
import { OperationsCalendar } from '@/pages/operations/OperationsCalendar';
import { TeamsPage } from '@/pages/operations/TeamsPage';

export const router = createBrowserRouter([
  // Rutas públicas
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
      { path: '/reset-password', element: <ResetPassword /> },
      { path: '/trial-expired', element: <TrialExpired /> },
      { path: '/invite/:token', element: <AcceptInvitation /> },
      { path: '/auth/google/callback', element: <GoogleCallback /> },
    ],
  },

  // Rutas protegidas
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/users', element: <Users /> },
          { path: '/settings', element: <Settings /> },

          // CRM — Fase 2
          {
            path: '/crm',
            children: [
              { index: true, element: <Navigate to="/crm/leads" replace /> },
              { path: 'leads', element: <Leads /> },
              { path: 'prospecting', element: <Prospecting /> },
              { path: 'contacts', element: <Contacts /> },
              { path: 'accounts', element: <Accounts /> },
              { path: 'opportunities', element: <Opportunities /> },
              { path: 'activities', element: <Activities /> },
              { path: 'tasks', element: <Tasks /> },
              { path: 'quotes', element: <Quotes /> },
            ],
          },

          // ERP — Fase 3
          {
            path: '/erp',
            children: [
              { index: true, element: <Navigate to="/erp/products" replace /> },
              { path: 'products', element: <Products /> },
              { path: 'suppliers', element: <Suppliers /> },
              { path: 'invoices', element: <Invoices /> },
              { path: 'inventory', element: <Inventory /> },
            ],
          },

          // Marketing — Fase 4
          { path: '/marketing', element: <Marketing /> },

          // IA — Fase 5
          { path: '/ai', element: <AIPage /> },

          // Agente WhatsApp
          { path: '/whatsapp-agent', element: <WhatsAppAgentPage /> },

          // Landing — Fase 6
          { path: '/landing', element: <LandingPages /> },

          // Reportes — Fase 7
          { path: '/reports', element: <Reports /> },

          // Soporte — Tickets
          { path: '/tickets', element: <TicketsPage /> },

          // Comisiones
          { path: '/commissions', element: <CommissionsPage /> },

          // Centro de costos
          { path: '/cost-centers', element: <CostCentersPage /> },

          // Operaciones
          {
            path: '/operations',
            children: [
              { index: true, element: <Navigate to="/operations/dashboard" replace /> },
              { path: 'dashboard', element: <OperationsDashboard /> },
              { path: 'projects',  element: <ProjectsList /> },
              { path: 'projects/:id', element: <ProjectDetail /> },
              { path: 'calendar', element: <OperationsCalendar /> },
              { path: 'teams',    element: <TeamsPage /> },
            ],
          },

          // Perfil
          { path: '/profile', element: <ComingSoon title="Mi Perfil" description="Gestiona tu información personal, foto de perfil y preferencias." phase="Próximamente" /> },

          // Redirect
          { path: '/', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },

  // Public landing pages (no auth required)
  { path: '/p/:slug', element: <PublicLanding /> },

  // 404
  { path: '*', element: <Navigate to="/" replace /> },
]);
