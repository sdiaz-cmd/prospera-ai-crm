import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Target, UserCircle,
  Megaphone, BarChart3, Settings, Boxes,
  Zap, Globe, Package, Bot, Lock, MessageCircle,
  CheckSquare, FileText, ReceiptText, Truck, Users2,
  ChevronDown, TicketIcon, ChevronsUpDown, Plus, Check, Coins, FolderKanban,
  Wrench, ClipboardList, CalendarDays, HardHat, Activity,
} from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { cn } from '@/utils/helpers';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '../ui/Avatar';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';

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

// ─── Company Switcher ─────────────────────────────────────────────────────────

interface MyCompany {
  id: string; name: string; slug: string; plan: string;
  isOwner: boolean; role: { id: string; name: string };
}

function CompanySwitcher({ collapsed }: { collapsed: boolean }) {
  const { company, user, setAuth, isOwner } = useAuthStore();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const { data: companies = [] } = useQuery<MyCompany[]>({
    queryKey: ['my-companies'],
    queryFn: () => api.get('/auth/companies').then(r => r.data.data),
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const switchMut = useMutation({
    mutationFn: (companyId: string) => api.post('/auth/switch-company', { companyId }),
    onSuccess: async (res, companyId) => {
      const data = res.data.data;
      // Fetch user info (we need user object - it's the same user)
      setAuth({
        user: user!,
        company: data.company,
        role: data.role,
        permissions: data.permissions,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isOwner: data.isOwner,
      });
      qc.clear(); // Invalida todo el caché
      setOpen(false);
      toast.success(`Cambiado a ${data.company.name}`);
      window.location.href = '/dashboard';
    },
    onError: () => toast.error('Error al cambiar empresa'),
  });

  const createMut = useMutation({
    mutationFn: () => api.post('/auth/create-branch', { companyName: newName }),
    onSuccess: (res) => {
      toast.success(`Empresa "${newName}" creada`);
      setNewName(''); setShowCreate(false);
      qc.invalidateQueries({ queryKey: ['my-companies'] });
      // Switch to new company
      switchMut.mutate(res.data.data.id);
    },
    onError: () => toast.error('Error al crear empresa'),
  });

  if (collapsed) {
    return (
      <div
        className="mx-2 my-1 px-1.5 py-1.5 rounded-lg cursor-pointer hover:bg-white/[0.05] transition-colors flex items-center justify-center"
        title={company?.name}
      >
        <div className="w-6 h-6 rounded-md bg-primary-600/30 flex items-center justify-center text-[11px] font-bold text-primary-300">
          {company?.name?.[0]?.toUpperCase() || 'E'}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative mx-2 my-1.5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/[0.06] transition-colors group"
      >
        <div className="w-7 h-7 rounded-lg bg-primary-600/25 flex items-center justify-center text-[12px] font-bold text-primary-300 flex-shrink-0">
          {company?.name?.[0]?.toUpperCase() || 'E'}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[12px] font-semibold text-gray-300 truncate leading-none">{company?.name || '—'}</p>
          <p className="text-[10px] text-gray-600 mt-0.5">{companies.length > 1 ? `${companies.length} empresas` : 'Mi empresa'}</p>
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 group-hover:text-gray-400 transition-colors" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#111827] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="py-1">
            {companies.map(c => (
              <button
                key={c.id}
                disabled={c.id === company?.id || switchMut.isPending}
                onClick={() => switchMut.mutate(c.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                  c.id === company?.id
                    ? 'bg-white/[0.06] cursor-default'
                    : 'hover:bg-white/[0.04]'
                )}
              >
                <div className="w-6 h-6 rounded-md bg-primary-600/20 flex items-center justify-center text-[11px] font-bold text-primary-400 flex-shrink-0">
                  {c.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-gray-300 truncate">{c.name}</p>
                  <p className="text-[10px] text-gray-600">{c.role.name}</p>
                </div>
                {c.id === company?.id && <Check className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />}
              </button>
            ))}
          </div>

          {isOwner && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} className="p-2">
              {showCreate ? (
                <div className="flex gap-1.5">
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) createMut.mutate(); if (e.key === 'Escape') setShowCreate(false); }}
                    placeholder="Nombre de la empresa..."
                    className="flex-1 text-[12px] bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1.5 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-primary-600/50"
                  />
                  <button
                    onClick={() => { if (newName.trim()) createMut.mutate(); }}
                    disabled={!newName.trim() || createMut.isPending}
                    className="px-2.5 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white rounded-lg text-[11px] font-medium transition-colors"
                  >
                    {createMut.isPending ? '...' : 'Crear'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[12px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Nueva empresa / sucursal
                </button>
              )}
            </div>
          )}
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
  const { t } = useLanguage();

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

      {/* ── Company Switcher ── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
        <CompanySwitcher collapsed={collapsed} />
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5 sidebar-scroll">

        {/* Dashboard — siempre visible */}
        <NavItem to="/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} collapsed={collapsed} />

        {/* CRM */}
        {!collapsed && <div className="pt-3 pb-1 px-1">
          <span className="text-[10px] font-bold tracking-[0.14em] text-gray-700 uppercase select-none">{t('nav.crm')}</span>
        </div>}
        {collapsed && <div className="my-1.5 mx-3 h-px bg-white/[0.06]" />}

        <CollapsibleSection
          label={t('nav.crm')}
          icon={Target}
          collapsed={collapsed}
          features={features}
          onLockedClick={handleLocked}
          defaultOpen={true}
          items={[
            { to: '/crm/leads',         icon: UserCircle,  label: t('nav.leads') },
            { to: '/crm/contacts',      icon: Users,       label: t('nav.contacts') },
            { to: '/crm/accounts',      icon: Building2,   label: t('nav.accounts') },
            { to: '/crm/opportunities', icon: Target,      label: t('nav.opportunities') },
            { to: '/crm/activities',    icon: Zap,         label: t('nav.activities') },
            { to: '/crm/tasks',         icon: CheckSquare, label: t('nav.tasks') },
            { to: '/crm/quotes',        icon: FileText,    label: t('nav.quotes') },
          ]}
        />

        {/* ERP */}
        {!collapsed && <div className="pt-3 pb-1 px-1">
          <span className="text-[10px] font-bold tracking-[0.14em] text-gray-700 uppercase select-none">{t('nav.financeErp')}</span>
        </div>}
        {collapsed && <div className="my-1.5 mx-3 h-px bg-white/[0.06]" />}

        <CollapsibleSection
          label={t('nav.financeErp')}
          icon={ReceiptText}
          collapsed={collapsed}
          features={features}
          onLockedClick={handleLocked}
          items={[
            { to: '/erp/products',  icon: Package,     label: t('nav.products'),   feature: 'erp' },
            { to: '/erp/suppliers', icon: Truck,       label: t('nav.suppliers'),  feature: 'erp' },
            { to: '/erp/invoices',  icon: ReceiptText, label: t('nav.invoices'),   feature: 'erp' },
            { to: '/erp/inventory', icon: Boxes,       label: t('nav.inventory'),  feature: 'erp' },
          ]}
        />

        {/* Operaciones */}
        {!collapsed && <div className="pt-3 pb-1 px-1">
          <span className="text-[10px] font-bold tracking-[0.14em] text-gray-700 uppercase select-none">{t('nav.operations')}</span>
        </div>}
        {collapsed && <div className="my-1.5 mx-3 h-px bg-white/[0.06]" />}

        <CollapsibleSection
          label={t('nav.operations')}
          icon={Wrench}
          collapsed={collapsed}
          features={features}
          onLockedClick={handleLocked}
          items={[
            { to: '/operations/dashboard', icon: Activity,      label: t('nav.dashboardOps') },
            { to: '/operations/projects',  icon: ClipboardList, label: t('nav.projects') },
            { to: '/operations/calendar',  icon: CalendarDays,  label: t('nav.calendar') },
            { to: '/operations/teams',     icon: HardHat,       label: t('nav.teams') },
          ]}
        />

        {/* Marketing */}
        {!collapsed && <div className="pt-3 pb-1 px-1">
          <span className="text-[10px] font-bold tracking-[0.14em] text-gray-700 uppercase select-none">{t('nav.marketing')}</span>
        </div>}
        {collapsed && <div className="my-1.5 mx-3 h-px bg-white/[0.06]" />}

        <CollapsibleSection
          label={t('nav.marketing')}
          icon={Megaphone}
          collapsed={collapsed}
          features={features}
          onLockedClick={handleLocked}
          items={[
            { to: '/marketing', icon: Megaphone, label: t('nav.campaigns'),    feature: 'marketing' },
            { to: '/landing',   icon: Globe,     label: t('nav.landingPages'), feature: 'landing' },
          ]}
        />

        {/* Herramientas */}
        {!collapsed && <div className="pt-3 pb-1 px-1">
          <span className="text-[10px] font-bold tracking-[0.14em] text-gray-700 uppercase select-none">{t('nav.tools')}</span>
        </div>}
        {collapsed && <div className="my-1.5 mx-3 h-px bg-white/[0.06]" />}

        <CollapsibleSection
          label={t('nav.tools')}
          icon={Zap}
          collapsed={collapsed}
          features={features}
          onLockedClick={handleLocked}
          items={[
            { to: '/whatsapp-agent', icon: MessageCircle, label: t('nav.whatsapp'),    badge: unreadCount > 0 ? unreadCount : undefined },
            { to: '/ai',             icon: Bot,           label: t('nav.ai'),           feature: 'ai' },
            { to: '/reports',        icon: BarChart3,     label: t('nav.reports') },
            { to: '/tickets',        icon: TicketIcon,    label: t('nav.support') },
            { to: '/commissions',    icon: Coins,         label: t('nav.commissions') },
            { to: '/cost-centers',   icon: FolderKanban,  label: t('nav.costCenters') },
            { to: '/users',          icon: Users2,        label: t('nav.users') },
          ]}
        />
      </nav>

      {/* ── Bottom ── */}
      <div className="relative px-2 py-3 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
        <NavItem to="/settings" icon={Settings} label={t('nav.settings')} collapsed={collapsed} />

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
