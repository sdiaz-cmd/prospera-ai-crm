import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Target, UserCircle,
  ShoppingBag, BarChart3, Megaphone, Settings, ChevronRight,
  Boxes, Zap, Globe, Package, Bot
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '../ui/Avatar';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  soon?: boolean;
  children?: NavItem[];
}

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
    children: [
      { label: 'Productos', to: '/erp/products', icon: Package },
      { label: 'Proveedores', to: '/erp/suppliers', icon: Building2 },
      { label: 'Facturas', to: '/erp/invoices', icon: BarChart3 },
      { label: 'Inventario', to: '/erp/inventory', icon: Boxes, soon: true },
    ],
  },
  { label: 'Usuarios', to: '/users', icon: Users },
  { label: 'Marketing', to: '/marketing', icon: Megaphone },
  { label: 'IA & Automatización', to: '/ai', icon: Bot },
  { label: 'Landing Pages', to: '/landing', icon: Globe },
  { label: 'Reportes', to: '/reports', icon: BarChart3 },
];

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { user, company } = useAuthStore();
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-gray-900 flex flex-col transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-gray-800', collapsed && 'justify-center')}>
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">P</span>
        </div>
        {!collapsed && (
          <div>
            <span className="text-white font-bold text-base">PROSPERA</span>
            <span className="text-primary-400 font-bold text-base">.AI</span>
          </div>
        )}
      </div>

      {/* Empresa activa */}
      {!collapsed && company && (
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-xs text-gray-500 mb-1">Empresa activa</p>
          <p className="text-sm font-medium text-gray-200 truncate">{company.name}</p>
          <span className="text-xs text-primary-400 capitalize">{company.plan}</span>
        </div>
      )}

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map((item) => (
          <NavGroup
            key={item.to}
            item={item}
            collapsed={collapsed}
            currentPath={location.pathname}
          />
        ))}
      </nav>

      {/* Configuración */}
      <div className="border-t border-gray-800 p-2 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100',
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
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
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
}: {
  item: NavItem;
  collapsed: boolean;
  currentPath: string;
}) {
  if (!item.children) {
    return (
      <NavLink
        to={item.to}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative group',
            isActive ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100',
            item.soon && 'opacity-60 cursor-not-allowed pointer-events-none',
            collapsed && 'justify-center'
          )
        }
        onClick={item.soon ? (e) => e.preventDefault() : undefined}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.soon && (
              <span className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">Pronto</span>
            )}
          </>
        )}
        {collapsed && (
          <div className="absolute left-full ml-2 bg-gray-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            {item.label}
          </div>
        )}
      </NavLink>
    );
  }

  const isGroupActive = item.children.some((child) => currentPath.startsWith(child.to));
  const [open, setOpen] = useState(isGroupActive);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
          isGroupActive ? 'text-gray-100' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-100',
          collapsed && 'justify-center'
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 font-medium text-left">{item.label}</span>
            {item.soon && (
              <span className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">Pronto</span>
            )}
            <ChevronRight className={cn('w-4 h-4 transition-transform', open && 'rotate-90')} />
          </>
        )}
      </button>

      {!collapsed && open && (
        <div className="ml-4 pl-3 border-l border-gray-700 mt-0.5 space-y-0.5">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100',
                  child.soon && 'opacity-60 cursor-not-allowed pointer-events-none'
                )
              }
              onClick={child.soon ? (e) => e.preventDefault() : undefined}
            >
              <child.icon className="w-4 h-4 flex-shrink-0" />
              <span>{child.label}</span>
              {child.soon && (
                <span className="ml-auto text-xs bg-gray-700 text-gray-400 px-1 py-0.5 rounded">Pronto</span>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
