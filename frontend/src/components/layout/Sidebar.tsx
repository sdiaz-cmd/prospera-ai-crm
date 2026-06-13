import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Target, UserCircle,
  Megaphone, BarChart3, Settings, Boxes,
  Zap, Globe, Package, Bot, Lock, MessageCircle,
  CheckSquare, FileText, ReceiptText, Truck, Users2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/utils/helpers';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '../ui/Avatar';
import api from '@/services/api';
import toast from 'react-hot-toast';

// ─── Plan config ──────────────────────────────────────────────────────────────

type PlanName = 'trial' | 'starter' | 'growth' | 'enterprise';

const PLAN_FEATURES: Record<PlanName, Record<string, boolean>> = {
  trial:      { crm: true, erp: false, marketing: false, landing: false, ai: false },
  starter:    { crm: true, erp: false, marketing: false, landing: false, ai: false },
  growth:     { crm: true, erp: true,  marketing: true,  landing: true,  ai: false },
  enterprise: { crm: true, erp: true,  marketing: true,  landing: true,  ai: true  },
};

const PLAN_BADGE: Record<PlanName, { label: string; cls: string }> = {
  trial:      { label: 'Trial',      cls: 'bg-gray-500/20 text-gray-400 ring-1 ring-gray-500/30' },
  starter:    { label: 'Starter',    cls: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30' },
  growth:     { label: 'Growth',     cls: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30' },
  enterprise: { label: 'Enterprise', cls: 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30' },
};

function getPlanFeatures(plan: string) {
  return PLAN_FEATURES[plan as PlanName] ?? PLAN_FEATURES.trial;
}
function getPlanBadge(plan: string) {
  return PLAN_BADGE[plan as PlanName] ?? PLAN_BADGE.trial;
}

// ─── Logo mark ────────────────────────────────────────────────────────────────

function ProspLogo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <defs>
        <linearGradient id="bg-g" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#0a1628" />
        </linearGradient>
        <linearGradient id="line-g" x1="6" y1="24" x2="28" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="fill-g" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
        <clipPath id="clip-logo">
          <rect width="34" height="34" rx="9" />
        </clipPath>
      </defs>

      {/* Background */}
      <rect width="34" height="34" rx="9" fill="url(#bg-g)" />

      {/* Inner area fill */}
      <g clipPath="url(#clip-logo)">
        <path
          d="M6 24 C10 20, 14 22, 18 17 C21 13, 24 12, 28 8 L28 32 L6 32 Z"
          fill="url(#fill-g)"
        />
      </g>

      {/* Rising sparkline */}
      <path
        d="M6 24 C10 20, 14 22, 18 17 C21 13, 24 12, 28 8"
        stroke="url(#line-g)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Endpoint glow */}
      <circle cx="28" cy="8" r="3.5" fill="#3b82f6" fillOpacity="0.25" />
      <circle cx="28" cy="8" r="2" fill="#60a5fa" />
    </svg>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-4 pt-5 pb-1.5 text-[10px] font-bold tracking-[0.14em] text-gray-600 uppercase select-none">
      {label}
    </p>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
  badge?: number;
  locked?: boolean;
  onLockedClick?: () => void;
}

function NavItem({ to, icon: Icon, label, collapsed, badge, locked, onLockedClick }: NavItemProps) {
  if (locked) {
    return (
      <button
        onClick={onLockedClick}
        title={collapsed ? label : undefined}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-[7px] rounded-lg text-[13px] transition-all duration-150',
          'text-gray-700 opacity-40 hover:opacity-60 hover:bg-white/[0.04]',
          collapsed && 'justify-center'
        )}
      >
        <Icon className="w-[18px] h-[18px] flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{label}</span>
            <Lock className="w-3 h-3 text-gray-700" />
          </>
        )}
      </button>
    );
  }

  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 px-3 py-[7px] rounded-lg text-[13px] transition-all duration-150 group',
          isActive
            ? 'text-blue-200 font-medium'
            : 'text-gray-500 hover:text-gray-100 hover:bg-white/[0.05]',
          collapsed && 'justify-center'
        )
      }
      style={({ isActive }) =>
        isActive
          ? {
              background: 'linear-gradient(90deg, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0.06) 100%)',
              boxShadow: 'inset 2px 0 0 #60a5fa',
            }
          : {}
      }
    >
      <span className="relative flex-shrink-0">
        <Icon className="w-[18px] h-[18px]" />
        {collapsed && badge ? (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 leading-none">{label}</span>
          {badge ? (
            <span className="min-w-[20px] h-5 bg-red-500/90 text-white text-[11px] font-semibold rounded-full flex items-center justify-center px-1.5 leading-none">
              {badge > 99 ? '99+' : badge}
            </span>
          ) : null}
        </>
      )}

      {/* Collapsed tooltip */}
      {collapsed && (
        <div className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-gray-800 border border-white/[0.1] px-2.5 py-1.5 text-xs text-gray-100 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {label}
          {badge ? <span className="ml-1.5 text-red-400 font-semibold">({badge})</span> : null}
        </div>
      )}
    </NavLink>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { user, company } = useAuthStore();
  const navigate = useNavigate();
  const features = getPlanFeatures(company?.plan || 'trial');
  const planBadge = getPlanBadge(company?.plan || 'trial');

  const { data: waUnread } = useQuery<{ count: number }>({
    queryKey: ['wa-unread-sidebar'],
    queryFn: () => api.get('/whatsapp/unread-count').then(r => r.data.data),
    refetchInterval: 60000,
    staleTime: 30000,
  });
  const unreadCount = waUnread?.count ?? 0;

  const handleLocked = () => {
    toast.error('Actualiza tu plan para acceder a esta función', { icon: '🔒' });
    navigate('/settings?tab=plan');
  };

  const navItem = (to: string, icon: React.ComponentType<{ className?: string }>, label: string, opts?: { badge?: number; feature?: string }) => (
    <NavItem
      key={to}
      to={to}
      icon={icon}
      label={label}
      collapsed={collapsed}
      badge={opts?.badge}
      locked={opts?.feature ? !features[opts.feature] : false}
      onLockedClick={handleLocked}
    />
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-300',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
      style={{
        background: 'linear-gradient(175deg, #0c1220 0%, #080d18 60%, #060a12 100%)',
        borderRight: '1px solid rgba(255,255,255,0.055)',
      }}
    >
      {/* Top glow accent */}
      <div
        className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 120% 60% at 50% -10%, rgba(59,130,246,0.10) 0%, transparent 70%)',
        }}
      />

      {/* ── Logo ── */}
      <div
        className={cn(
          'relative flex items-center gap-3 px-4 py-4',
          collapsed && 'justify-center px-0'
        )}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}
      >
        <ProspLogo size={collapsed ? 30 : 34} />
        {!collapsed && (
          <div className="flex flex-col leading-none">
            <span
              className="font-extrabold text-[15px] tracking-wide"
              style={{
                background: 'linear-gradient(90deg, #e2e8f0 0%, #cbd5e1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              PROSPERA
              <span
                style={{
                  background: 'linear-gradient(90deg, #60a5fa, #22d3ee)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                .AI
              </span>
            </span>
            {company && (
              <span className={cn('mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full self-start', planBadge.cls)}>
                {planBadge.label}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5 sidebar-scroll">

        {/* Dashboard */}
        {navItem('/dashboard', LayoutDashboard, 'Dashboard')}

        {/* CRM */}
        {!collapsed && <SectionLabel label="CRM" />}
        {collapsed && <div className="my-1.5 mx-3 h-px bg-white/[0.06]" />}
        {navItem('/crm/leads', UserCircle, 'Leads')}
        {navItem('/crm/contacts', Users, 'Contactos')}
        {navItem('/crm/accounts', Building2, 'Empresas')}
        {navItem('/crm/opportunities', Target, 'Oportunidades')}
        {navItem('/crm/activities', Zap, 'Actividades')}
        {navItem('/crm/tasks', CheckSquare, 'Tareas')}
        {navItem('/crm/quotes', FileText, 'Cotizaciones')}

        {/* ERP */}
        {!collapsed && <SectionLabel label="Finanzas & ERP" />}
        {collapsed && <div className="my-1.5 mx-3 h-px bg-white/[0.06]" />}
        {navItem('/erp/products', Package, 'Productos', { feature: 'erp' })}
        {navItem('/erp/suppliers', Truck, 'Proveedores', { feature: 'erp' })}
        {navItem('/erp/invoices', ReceiptText, 'Facturas', { feature: 'erp' })}
        {navItem('/erp/inventory', Boxes, 'Inventario', { feature: 'erp' })}

        {/* Marketing */}
        {!collapsed && <SectionLabel label="Marketing" />}
        {collapsed && <div className="my-1.5 mx-3 h-px bg-white/[0.06]" />}
        {navItem('/marketing', Megaphone, 'Campañas', { feature: 'marketing' })}
        {navItem('/landing', Globe, 'Landing Pages', { feature: 'landing' })}

        {/* Herramientas */}
        {!collapsed && <SectionLabel label="Herramientas" />}
        {collapsed && <div className="my-1.5 mx-3 h-px bg-white/[0.06]" />}
        {navItem('/whatsapp-agent', MessageCircle, 'WhatsApp Agent', { badge: unreadCount > 0 ? unreadCount : undefined })}
        {navItem('/ai', Bot, 'IA & Automatización', { feature: 'ai' })}
        {navItem('/reports', BarChart3, 'Reportes')}
        {navItem('/users', Users2, 'Usuarios')}
      </nav>

      {/* ── Bottom: Configuración + User ── */}
      <div className="relative px-2 py-3 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
        <NavItem
          to="/settings"
          icon={Settings}
          label="Configuración"
          collapsed={collapsed}
        />

        {!collapsed && user && (
          <NavLink
            to="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-all duration-150 group mt-1"
          >
            <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-gray-300 truncate leading-none mb-0.5">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[11px] text-gray-600 truncate">{user.email}</p>
            </div>
          </NavLink>
        )}
      </div>
    </aside>
  );
}
