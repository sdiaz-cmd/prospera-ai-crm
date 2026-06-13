import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/utils/helpers';
import { useAppStore } from '@/store/appStore';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const theme = useAppStore(s => s.theme);

  return (
    <div
      className={cn('min-h-screen transition-colors duration-200', theme === 'dark' ? 'dark' : '')}
      style={{ background: theme === 'dark' ? '#0d1117' : '#f0f2f7' }}
    >
      <Sidebar collapsed={sidebarCollapsed} />
      <Header
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarCollapsed={sidebarCollapsed}
      />
      <main
        className={cn(
          'transition-all duration-300 pt-14 min-h-screen',
          sidebarCollapsed ? 'ml-[60px]' : 'ml-[240px]'
        )}
      >
        <div className="p-6 max-w-[1440px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
