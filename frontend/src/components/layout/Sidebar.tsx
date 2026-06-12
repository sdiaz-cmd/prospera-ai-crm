import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Target, UserCircle,
  ShoppingBag, BarChart3, Megaphone, Settings, ChevronRight,
  Boxes, Zap, Globe, Package, Bot, Lock, MessageCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/utils/helpers';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '../ui/Avatar';
import api from '@/services/api';
import toast from 'react-hot-toast';

type PlanName = 'trial' | 'starter' | 'growth' | 'enterprise';

const PLAN_FEATURES: Record<PlanName, Record<string, boolean>> = {
  trial:      { crm: true, erp: false, marketing: false, landing: false, ai: false },
  starter:    { crm: true, erp: false, marketing: false, landing: false, ai: false },
  growth:     { crm: true, erp: true,  marketing: true,  landing: true,  ai: false },
  enterprise: { crm: true, erp: true,  marketing: true,  landing: true,  ai: true  },
};

const PLAN_COLORS: Record<PlanName, string> = {
  trial: 'text-gray-400',
  starter: 'text-blue-400',
  growth: 'text-emerald-400',
  enterprise: 'text-violet-400',
};

function getPlanFeatures(plan: string) {
  return PLAN_FEATURES[plan as PlanName] ?? PLAN_FEATURES.trial;
}
function getPlanColor(plan: string) {
  return PLAN_COLORS[plan as PlanName] ?? PLAN_COLORS.trial;
}

// ─── Minimalist PROSPERA Logo Mark ────────────────────────────────────────────

function ProspLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id="prosp-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      {/* Rounded square background */}
      <rect width="32" height="32" rx="8" fill="url(#prosp-grad)" />
      {/* P — vertical bar */}
      <rect x="8.5" y="7" width="3.5" height="18" rx="1.75" fill="white" />
      {/* P — bowl (semicircle right side) */}
      <path
        d="M12 7h3.5a5.5 5.5 0 0 1 0 11H12V7z"
        fill="white"
        fillOpacity="0.95"
      />
      {/* Growth accent — small rising dot */}
      <circle cx="22.5" cy="8.5" r="2" fill="white" fillOpacity="0.45" />
      <circle cx="22.5" cy="8.5" r="1.1" fill="white" fillOpacity="0.8" />
    </svg>
  );
}

// ─── Collapsed logo mark (24px, no label) ─────────────────────────────────────

function ProspLogoSmall() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id="prosp-grad-sm" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#prosp-grad-sm)" />
      <rect x="8.5" y="7" width="3.5" height="18" rx="1.75" fill="white" />
      <path d="M12 7h3.5a5.5 5.5 0 0 1 0 11H12V7z" fill="white" fillOpacity="0.95" />
      <circle cx="22.5" cy="8.5" r="2" fill="white" fillOpacity="0.45" />
      <circle cx="22.5" cy="8.5" r="1.1" fill="white" fillOpacity="0.8" />
    </svg>
  );
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeCount?: number;
  soon?: boolean;
  feature?: string;
  children?: NavItem[];
}

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { user, company } = useAuthStore();
  const location = useLocation();
  const features = getPlanFeatures(company?.plan || 'trial');

  const { data: waUnread } = useQuery<{ count: number }>({
    queryKey: ['wa-unread-sidebar'],
    queryFn: () => api.get('/whatsapp/unread-count').then(r => r.data.data),
    refetchInterval: 60000,
    staleTime: 30000,
  });
  const unreadCount = waUnread?.count ?? 0;

  const navItems: NavItem[] = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    {
      label: 'CRM',
      to: '/crm',
      icon: Target,
      children: [
        { label: 'Leads', to: '/crm/leads', icon: UserCircle },
        { label: 'Contactos', to: '/crm/contacts', icon: Users },
        { label: 'Empresas', to: '/crm/accounts', icon: Building2 },
        { label: 'Oportunidades', to: '/crm/opportunities', icon: Target },
        { label: 'Actividades', to: '/crm/activities', icon: Zap },
        { label: 'Tareas', to: '/crm/tasks', icon: Boxes },
        { label: 'Cotizaciones', to: '/crm/quotes', icon: Package },
      ],
    },
    {
      label: 'ERP',
      to: '/erp',
      icon: ShoppingBag,
      feature: 'erp',
      children: [
        { label: 'Productos', to: '/erp/products', icon: Package },
        { label: 'Proveedores', to: '/erp/suppliers', icon: Building2 },
        { label: 'Facturas', to: '/erp/invoices', icon: BarChart3 },
        { label: 'Inventario', to: '/erp/inventory', icon: Boxes },
      ],
    },
    { label: 'Usuarios', to: '/users', icon: Users },
    { label: 'Marketing', to: '/marketing', icon: Megaphone, feature: 'marketing' },
    { label: 'IA & Automatización', to: '/ai', icon: Bot, feature: 'ai' },
    { label: 'Agente WhatsApp', to: '/whatsapp-agent', icon: MessageCircle, badgeCount: unreadCount > 0 ? unreadCount : undefined },
    { label: 'Landing Pages', to: '/landing', icon: Globe, feature: 'landing' },
    { label: 'Reportes', to: '/reports', icon: BarChart3 },
  ];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col transition-all duration-300 z-40',
        'bg-[#0d1117] border-r border-white/[0.06]',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]',
          collapsed && 'justify-center px-0'
        )}
      >
        {collapsed ? (
          <ProspLogoSmall />
        ) : (
          <>
            <ProspLogo size={32} />
            <div className="leading-tight">
              <span className="text-white font-bold text-[15px] tracking-wide">PROSPERA</span>
              <span className="text-blue-400/70 font-semibold text-[15px] tracking-wide">.AI</span>
            </div>
          </>
        )}
      </div>

      {/* Empresa activa */}
      {!collapsed && company && (
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-1">Empresa activa</p>
          <p className="text-sm font-medium text-gray-200 truncate">{company.name}</p>
          <span className={cn('text-xs font-medium capitalize', getPlanColor(company.plan))}>
            {company.plan}
          </span>
        </div>
      )}

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => (
          <NavGroup
            key={item.to}
            item={item}
            collapsed={collapsed}
            currentPath={location.pathname}
            features={features}
          />
        ))}
      </nav>

      {/* Configuración */}
      <div className="border-t border-white/[0.06] p-2 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
              'border-l-2',
              isActive
                ? 'bg-blue-500/[0.12] text-blue-300 border-blue-400/80'
                : 'text-gray-500 hover:bg-white/[0.05] hover:text-gray-200 border-transparent',
              collapsed && 'justify-center'
            )
          }
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Configuración</span>}
        </NavLink>

        {/* Usuario actual */}
        {!collapsed && user && (
          <NavLink
            to="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-all duration-200"
          >
            <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-600 truncate">{user.email}</p>
            </div>
          </NavLink>
        )}
      </div>
    </aside>
  );
}

function NavGroup({
  item,
  collapsed,
  currentPath,
  features,
}: {
  item: NavItem;
  collapsed: boolean;
  currentPath: string;
  features: Record<string, boolean>;
}) {
  const navigate = useNavigate();
  const isLocked = item.feature && !features[item.feature];

  const handleLockedClick = () => {
    toast.error('Actualiza tu plan para acceder a esta función', { icon: '🔒' });
    navigate('/settings?tab=plan');
  };

  if (!item.children) {
    if (isLocked) {
      return (
        <button
          onClick={handleLockedClick}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 opacity-40 cursor-pointer border-l-2 border-transparent',
            'text-gray-500 hover:bg-white/[0.04] hover:text-gray-400',
            collapsed && 'justify-center'
          )}
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <Lock className="w-3.5 h-3.5 text-gray-700" />
            </>
          )}
        </button>
      );
    }

    return (
      <NavLink
        to={item.to}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative group border-l-2',
            isActive
              ? 'bg-blue-500/[0.12] text-blue-300 border-blue-400/80 font-medium'
              : 'text-gray-500 hover:bg-white/[0.05] hover:text-gray-200 border-transparent',
            item.soon && 'opacity-50 cursor-not-allowed pointer-events-none',
            collapsed && 'justify-center'
          )
        }
        onClick={item.soon ? (e) => e.preventDefault() : undefined}
      >
        <span className="relative flex-shrink-0">
          <item.icon className="w-5 h-5" />
          {collapsed && item.badgeCount ? (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              {item.badgeCount > 9 ? '9+' : item.badgeCount}
            </span>
          ) : null}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badgeCount ? (
              <span className="min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                {item.badgeCount > 99 ? '99+' : item.badgeCount}
              </span>
            ) : null}
            {item.soon && (
              <span className="text-xs bg-white/[0.07] text-gray-500 px-1.5 py-0.5 rounded">Pronto</span>
            )}
          </>
        )}
        {/* Collapsed tooltip */}
        {collapsed && (
          <div className="absolute left-full ml-3 bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 shadow-lg border border-white/10">
            {item.label}
          </div>
        )}
      </NavLink>
    );
  }

  const isGroupActive = item.children.some((child) => currentPath.startsWith(child.to));
  const [open, setOpen] = useState(isGroupActive);

  if (isLocked) {
    return (
      <button
        onClick={handleLockedClick}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 opacity-40 border-l-2 border-transparent',
          'text-gray-500 hover:bg-white/[0.04] hover:text-gray-400',
          collapsed && 'justify-center'
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 font-medium text-left">{item.label}</span>
            <Lock className="w-3.5 h-3.5 text-gray-700" />
          </>
        )}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 border-l-2 border-transparent',
          isGroupActive
            ? 'text-gray-200 font-medium'
            : 'text-gray-500 hover:bg-white/[0.05] hover:text-gray-300',
          collapsed && 'justify-center'
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronRight className={cn('w-4 h-4 transition-transform duration-200', open && 'rotate-90')} />
          </>
        )}
      </button>

      {!collapsed && open && (
        <div className="ml-4 pl-3 border-l border-white/[0.08] mt-0.5 space-y-0.5">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 border-l-2',
                  isActive
                    ? 'bg-blue-500/[0.12] text-blue-300 border-blue-400/80 font-medium'
                    : 'text-gray-500 hover:bg-white/[0.05] hover:text-gray-200 border-transparent',
                  child.soon && 'opacity-50 cursor-not-allowed pointer-events-none'
                )
              }
              onClick={child.soon ? (e) => e.preventDefault() : undefined}
            >
              <child.icon className="w-4 h-4 flex-shrink-0" />
              <span>{child.label}</span>
              {child.soon && (
                <span className="ml-auto text-xs bg-white/[0.07] text-gray-500 px-1 py-0.5 rounded">Pronto</span>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
