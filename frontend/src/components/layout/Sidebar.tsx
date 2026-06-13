import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Target, UserCircle,
  Megaphone, BarChart3, Settings, Boxes,
  Zap, Globe, Package, Bot, Lock, MessageCircle,
  CheckSquare, FileText, ReceiptText, Truck, Users2,
  ChevronDown,
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

// ─── Logo ─────────────────────────────────────────────────────────────────────

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
      <rect width="34" height="34" rx="9" fill="url(#bg-g)" />
      <g clipPath="url(#clip-logo)">
        <path d="M6 24 C10 20, 14 22, 18 17 C21 13, 24 12, 28 8 L28 32 L6 32 Z" fill="url(#fill-g)" />
      </g>
      <path d="M6 24 C10 20, 14 22, 18 17 C21 13, 24 12, 28 8" stroke="url(#line-g)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="28" cy="8" r="3.5" fill="#3b82f6" fillOpacity="0.25" />
      <circle cx="28" cy="8" r="2" fill="#60a5fa" />
    </svg>
  );
}

// ─── Nav leaf item ─────────────────────────────────────────────────────────────

interface NavItemProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
  badge?: number;
  locked?: boolean;
  onLockedClick?: () => void;
  indent?: boolean;
}

function NavItem({ to, icon: Icon, label, collapsed, badge, locked, onLockedClick, indent }: NavItemProps) {
  if (locked) {
    return (
      <button
        onClick={onLockedClick}
        title={collapsed ? label : undefined}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-[7px] rounded-lg text-[13px] transition-all duration-150',
          'text-gray-700 opacity-40 hover:opacity-60 hover:bg-white/[0.04]',
          indent && !collapsed && 'pl-4',
          collapsed && 'justify-center'
        )}
      >
        <Icon className="w-[17px] h-[17px] flex-shrink-0" />
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
          indent && !collapsed && 'pl-4',
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
        <Icon className="w-[17px] h-[17px]" />
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

// ─── Collapsible section ───────────────────────────────────────────────────────

interface SectionItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  feature?: string;
}

interface CollapsibleSectionProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: SectionItem[];
  collapsed: boolean;      // sidebar collapsed
  features: Record<string, boolean>;
  onLockedClick: () => void;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  label, icon: SectionIcon, items, collapsed, features, onLockedClick, defaultOpen = false,
}: CollapsibleSectionProps) {
  const location = useLocation();
  const isAnyActive = items.some(item => location.pathname.startsWith(item.to));
  const [open, setOpen] = useState(defaultOpen || isAnyActive);

  // When sidebar is collapsed, show icon-only with tooltip; no expand/collapse
  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {items.map(item => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            collapsed={true}
            badge={item.badge}
            locked={item.feature ? !features[item.feature] : false}
            onLockedClick={onLockedClick}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Section header — clickable to expand/collapse */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-[7px] rounded-lg text-[13px] transition-all duration-150',
          isAnyActive
            ? 'text-gray-200 font-medium'
            : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.05]'
        )}
      >
        <SectionIcon className="w-[17px] h-[17px] flex-shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform duration-200 text-gray-600',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Items — slide in/out */}
      {open && (
        <div className="mt-0.5 ml-2 pl-3 border-l border-white/[0.07] space-y-0.5">
          {items.map(item => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              collapsed={false}
              badge={item.badge}
              locked={item.feature ? !features[item.feature] : false}
              onLockedClick={onLockedClick}
            />
          ))}
        </div>
      )}
    </div>
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
      {/* Top glow */}
      <div
        className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 120% 60% at 50% -10%, rgba(59,130,246,0.10) 0%, transparent 70%)' }}
      />

      {/* ── Logo ── */}
      <div
        className={cn('relative flex items-center gap-3 px-4 py-4', collapsed && 'justify-center px-0')}
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
              <span style={{ background: 'linear-gradient(90deg, #60a5fa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5 sidebar-scroll">

        {/* Dashboard — siempre visible */}
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />

        {/* CRM */}
        {!collapsed && <div className="pt-3 pb-1 px-1">
          <span className="text-[10px] font-bold tracking-[0.14em] text-gray-700 uppercase select-none">CRM</span>
        </div>}
        {collapsed && <div className="my-1.5 mx-3 h-px bg-white/[0.06]" />}

        <CollapsibleSection
          label="CRM"
          icon={Target}
          collapsed={collapsed}
          features={features}
          onLockedClick={handleLocked}
          defaultOpen={true}
          items={[
            { to: '/crm/leads',         icon: UserCircle,  label: 'Leads' },
            { to: '/crm/contacts',      icon: Users,       label: 'Contactos' },
            { to: '/crm/accounts',      icon: Building2,   label: 'Empresas' },
            { to: '/crm/opportunities', icon: Target,      label: 'Oportunidades' },
            { to: '/crm/activities',    icon: Zap,         label: 'Actividades' },
            { to: '/crm/tasks',         icon: CheckSquare, label: 'Tareas' },
            { to: '/crm/quotes',        icon: FileText,    label: 'Cotizaciones' },
          ]}
        />

        {/* ERP */}
        {!collapsed && <div className="pt-3 pb-1 px-1">
          <span className="text-[10px] font-bold tracking-[0.14em] text-gray-700 uppercase select-none">Finanzas & ERP</span>
        </div>}
        {collapsed && <div className="my-1.5 mx-3 h-px bg-white/[0.06]" />}

        <CollapsibleSection
          label="Finanzas & ERP"
          icon={ReceiptText}
          collapsed={collapsed}
          features={features}
          onLockedClick={handleLocked}
          items={[
            { to: '/erp/products',   icon: Package,     label: 'Productos',   feature: 'erp' },
            { to: '/erp/suppliers',  icon: Truck,       label: 'Proveedores', feature: 'erp' },
            { to: '/erp/invoices',   icon: ReceiptText, label: 'Facturas',    feature: 'erp' },
            { to: '/erp/inventory',  icon: Boxes,       label: 'Inventario',  feature: 'erp' },
          ]}
        />

        {/* Marketing */}
        {!collapsed && <div className="pt-3 pb-1 px-1">
          <span className="text-[10px] font-bold tracking-[0.14em] text-gray-700 uppercase select-none">Marketing</span>
        </div>}
        {collapsed && <div className="my-1.5 mx-3 h-px bg-white/[0.06]" />}

        <CollapsibleSection
          label="Marketing"
          icon={Megaphone}
          collapsed={collapsed}
          features={features}
          onLockedClick={handleLocked}
          items={[
            { to: '/marketing', icon: Megaphone, label: 'Campañas',      feature: 'marketing' },
            { to: '/landing',   icon: Globe,     label: 'Landing Pages', feature: 'landing' },
          ]}
        />

        {/* Herramientas */}
        {!collapsed && <div className="pt-3 pb-1 px-1">
          <span className="text-[10px] font-bold tracking-[0.14em] text-gray-700 uppercase select-none">Herramientas</span>
        </div>}
        {collapsed && <div className="my-1.5 mx-3 h-px bg-white/[0.06]" />}

        <CollapsibleSection
          label="Herramientas"
          icon={Zap}
          collapsed={collapsed}
          features={features}
          onLockedClick={handleLocked}
          items={[
            { to: '/whatsapp-agent', icon: MessageCircle, label: 'WhatsApp Agent',    badge: unreadCount > 0 ? unreadCount : undefined },
            { to: '/ai',             icon: Bot,           label: 'IA & Automatización', feature: 'ai' },
            { to: '/reports',        icon: BarChart3,     label: 'Reportes' },
            { to: '/users',          icon: Users2,        label: 'Usuarios' },
          ]}
        />
      </nav>

      {/* ── Bottom ── */}
      <div className="relative px-2 py-3 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
        <NavItem to="/settings" icon={Settings} label="Configuración" collapsed={collapsed} />

        {!collapsed && user && (
          <NavLink
            to="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-all duration-150 mt-1"
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
