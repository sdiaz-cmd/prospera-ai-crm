import { useState, useEffect, useCallback } from 'react';
import { Bell, Search, Menu, LogOut, User, Settings, ChevronDown, Moon, Sun, Languages, CheckCheck, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth.service';
import { notificationsService } from '@/services/crm.service';
import { Avatar } from '../ui/Avatar';
import { cn } from '@/utils/helpers';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AppNotification } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export function Header({ onToggleSidebar, sidebarCollapsed }: HeaderProps) {
  const { user, company, clearAuth, refreshToken } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const { isDark, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useLanguage();

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationsService.list();
      setNotifications(data.items);
      setUnread(data.unread);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch { /* silent */ }
  };

  const handleNotifClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await notificationsService.markRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    }
    if (notif.link) { navigate(notif.link); setNotifOpen(false); }
  };

  const handleLogout = async () => {
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } finally {
      clearAuth();
      navigate('/login');
      toast.success('Sesión cerrada');
    }
  };

  const headerBg = isDark
    ? 'rgba(13,17,23,0.92)'
    : 'rgba(255,255,255,0.82)';
  const headerBorder = isDark
    ? '1px solid rgba(255,255,255,0.06)'
    : '1px solid rgba(0,0,0,0.07)';
  const headerShadow = isDark
    ? '0 1px 0 rgba(255,255,255,0.03) inset, 0 1px 8px rgba(0,0,0,0.4)'
    : '0 1px 0 rgba(255,255,255,0.9) inset, 0 1px 8px rgba(0,0,0,0.04)';

  const dropdownBg = isDark
    ? 'rgba(22,29,45,0.98)'
    : 'rgba(255,255,255,0.96)';
  const dropdownBorder = isDark
    ? '1px solid rgba(255,255,255,0.08)'
    : '1px solid rgba(0,0,0,0.09)';
  const dropdownShadow = isDark
    ? '0 20px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)'
    : '0 20px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-14 z-30 flex items-center px-5 gap-4 transition-all duration-300',
        // Mobile: full width (sidebar is off-screen); desktop: offset by sidebar
        'left-0',
        sidebarCollapsed ? 'lg:left-[60px]' : 'lg:left-[240px]'
      )}
      style={{
        background: headerBg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: headerBorder,
        boxShadow: headerShadow,
      }}
    >
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg text-gray-400 hover:bg-black/[0.05] hover:text-gray-600 transition-all duration-150"
      >
        <Menu style={{ width: 18, height: 18 }} />
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
            placeholder={t('header.search')}
            className="w-full pl-9 pr-12 py-[7px] text-[13px] rounded-full transition-all duration-150 outline-none"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
              color: isDark ? '#e2e8f0' : '#374151',
            }}
            onFocus={e => {
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.09)' : '#fff';
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)';
            }}
            onBlur={e => {
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
              e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <kbd
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 border border-gray-200 rounded-md px-1.5 py-0.5 bg-white/70 hidden md:flex items-center gap-0.5 font-sans leading-none"
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.12)' : undefined, background: isDark ? 'rgba(255,255,255,0.05)' : undefined }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          className="p-2 rounded-lg text-gray-400 hover:bg-black/[0.05] hover:text-gray-600 transition-all duration-150 flex items-center gap-1"
        >
          <Languages style={{ width: 17, height: 17 }} />
          <span className="text-[10px] font-semibold uppercase hidden sm:block">{lang}</span>
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? t('header.lightMode') : t('header.darkMode')}
          className="p-2 rounded-lg text-gray-400 hover:bg-black/[0.05] hover:text-gray-600 transition-all duration-150"
        >
          {isDark
            ? <Sun style={{ width: 17, height: 17 }} />
            : <Moon style={{ width: 17, height: 17 }} />
          }
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(o => !o); setDropdownOpen(false); }}
            className="relative p-2 rounded-lg text-gray-400 hover:bg-black/[0.05] hover:text-gray-600 transition-all duration-150"
          >
            <Bell style={{ width: 18, height: 18 }} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div
                className="absolute right-0 top-10 z-20 w-80 rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  background: isDark ? 'rgba(22,29,45,0.98)' : 'rgba(255,255,255,0.98)',
                  border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.09)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-500" />
                    <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notificaciones</span>
                    {unread > 0 && <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">{unread} nueva{unread !== 1 ? 's' : ''}</span>}
                  </div>
                  {unread > 0 && (
                    <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors">
                      <CheckCheck className="w-3.5 h-3.5" /> Leer todas
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sin notificaciones</p>
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-black/[0.04] transition-colors border-b last:border-b-0 ${!notif.isRead ? (isDark ? 'bg-blue-900/20' : 'bg-blue-50/60') : ''}`}
                        style={{ borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }}
                      >
                        <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${!notif.isRead ? 'bg-blue-500' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-snug ${isDark ? 'text-gray-100' : 'text-gray-800'} ${notif.isRead ? 'opacity-70' : ''}`}>
                            {notif.title}
                          </p>
                          {notif.message && (
                            <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{notif.message}</p>
                          )}
                          <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 mx-1" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : undefined }} />

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
                  background: dropdownBg,
                  backdropFilter: 'blur(20px)',
                  border: dropdownBorder,
                  boxShadow: dropdownShadow,
                }}
              >
                {/* User info */}
                <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${dividerColor}` }}>
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
                    { icon: User, label: t('header.profile'), onClick: () => { navigate('/profile'); setDropdownOpen(false); } },
                    { icon: Settings, label: t('header.settings'), onClick: () => { navigate('/settings'); setDropdownOpen(false); } },
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

                <div className="py-1.5" style={{ borderTop: `1px solid ${dividerColor}` }}>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50/80 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('header.logout')}
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
