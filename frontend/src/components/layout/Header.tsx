import { useState } from 'react';
import { Bell, Search, Menu, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth.service';
import { Avatar } from '../ui/Avatar';
import { cn } from '@/utils/helpers';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export function Header({ onToggleSidebar, sidebarCollapsed }: HeaderProps) {
  const { user, company, clearAuth, refreshToken } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } finally {
      clearAuth();
      navigate('/login');
      toast.success('Sesión cerrada');
    }
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-14 z-30 flex items-center px-5 gap-4 transition-all duration-300',
        sidebarCollapsed ? 'left-[60px]' : 'left-[240px]'
      )}
      style={{
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 1px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg text-gray-400 hover:bg-black/[0.05] hover:text-gray-600 transition-all duration-150"
      >
        <Menu className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
      </button>

      {/* Global search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search
            style={{ width: 14, height: 14 }}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar leads, contactos, oportunidades..."
            className="w-full pl-9 pr-12 py-[7px] text-[13px] rounded-full transition-all duration-150 outline-none"
            style={{
              background: 'rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.08)',
              color: '#374151',
            }}
            onFocus={e => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)';
            }}
            onBlur={e => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 border border-gray-200 rounded-md px-1.5 py-0.5 bg-white/70 hidden md:flex items-center gap-0.5 font-sans leading-none">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-gray-400 hover:bg-black/[0.05] hover:text-gray-600 transition-all duration-150">
          <Bell style={{ width: 18, height: 18 }} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-xl hover:bg-black/[0.05] transition-all duration-150"
          >
            {user && (
              <Avatar name={`${user.firstName} ${user.lastName}`} src={user.avatarUrl} size="sm" />
            )}
            <div className="hidden md:block text-left leading-none">
              <p className="text-[13px] font-semibold text-gray-800 leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[120px]">{company?.name}</p>
            </div>
            <ChevronDown
              style={{ width: 14, height: 14 }}
              className={cn('text-gray-400 transition-transform duration-200 hidden md:block', dropdownOpen && 'rotate-180')}
            />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0" onClick={() => setDropdownOpen(false)} />
              <div
                className="absolute right-0 top-full mt-2 w-60 rounded-2xl overflow-hidden z-50"
                style={{
                  background: 'rgba(255,255,255,0.96)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0,0,0,0.09)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
                }}
              >
                {/* User info */}
                <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center gap-3">
                    {user && <Avatar name={`${user.firstName} ${user.lastName}`} size="md" />}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1.5">
                  {[
                    { icon: User, label: 'Mi Perfil', onClick: () => { navigate('/profile'); setDropdownOpen(false); } },
                    { icon: Settings, label: 'Configuración', onClick: () => { navigate('/settings'); setDropdownOpen(false); } },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-black/[0.04] transition-colors text-left"
                    >
                      <item.icon className="w-4 h-4 text-gray-400" />
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="py-1.5" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50/80 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
