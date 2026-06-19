import { useQuery } from '@tanstack/react-query';
import {
  Activity, Clock, CalendarCheck, AlertTriangle,
  ClipboardList, TrendingUp, Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import { cn } from '@/utils/helpers';
import {
  DashboardStats, Project, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS,
} from './types';

function fmt(n: number) { return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }); }

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className={cn('rounded-xl p-4 flex items-center gap-3', color)}>
      <Icon className="w-6 h-6 flex-shrink-0 opacity-80" />
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs opacity-70 mt-1">{label}</p>
      </div>
    </div>
  );
}

export function OperationsDashboard() {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['ops-dashboard'],
    queryFn: () => api.get('/projects/dashboard').then(r => r.data.data),
    staleTime: 30000,
  });

  const { data: recentData } = useQuery<{ projects: Project[] }>({
    queryKey: ['ops-recent'],
    queryFn: () => api.get('/projects?limit=8').then(r => r.data.data),
    staleTime: 30000,
  });

  const recent = recentData?.projects ?? [];
  const byStatus = stats?.byStatus ?? {};

  // Top statuses for bar chart
  const topStatuses = Object.entries(byStatus)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);
  const maxCount = topStatuses[0]?.[1] ?? 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-400" /> Operaciones
          </h1>
          <p className="text-gray-500 text-sm mt-1">Proyectos, instalaciones y gestión técnica</p>
        </div>
        <Link
          to="/operations/projects"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <ClipboardList className="w-4 h-4" /> Ver proyectos
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total proyectos"
          value={stats?.total ?? 0}
          icon={ClipboardList}
          color="bg-blue-500/10 text-blue-300 border border-blue-500/20"
        />
        <KpiCard
          label="Proyectos activos"
          value={stats?.active ?? 0}
          icon={Activity}
          color="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
        />
        <KpiCard
          label="Instalaciones hoy"
          value={stats?.installToday ?? 0}
          icon={CalendarCheck}
          color="bg-violet-500/10 text-violet-300 border border-violet-500/20"
        />
        <KpiCard
          label="Atrasados"
          value={stats?.delayed ?? 0}
          icon={AlertTriangle}
          color={stats?.delayed ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status distribution */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" /> Distribución por estado
          </h2>
          {topStatuses.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">Sin proyectos aún</p>
          ) : (
            <div className="space-y-2">
              {topStatuses.map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium w-36 text-center flex-shrink-0', STATUS_COLORS[status] || 'bg-gray-500/20 text-gray-400')}>
                    {STATUS_LABELS[status] || status}
                  </span>
                  <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500/60 rounded-full transition-all"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-gray-400 text-xs w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent projects */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-400" /> Proyectos recientes
          </h2>
          {recent.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">Sin proyectos aún</p>
          ) : (
            <div className="space-y-2">
              {recent.map(p => (
                <Link
                  key={p.id}
                  to={`/operations/projects/${p.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-blue-400">{p.code}</span>
                      <span className="text-sm text-gray-300 truncate group-hover:text-white transition-colors">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.clientName && <span className="text-xs text-gray-600 truncate">{p.clientName}</span>}
                    </div>
                  </div>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0', PRIORITY_COLORS[p.priority] || 'bg-gray-500/20 text-gray-400')}>
                    {PRIORITY_LABELS[p.priority] || p.priority}
                  </span>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0', STATUS_COLORS[p.status] || 'bg-gray-500/20 text-gray-400')}>
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/operations/projects', label: 'Ver todos los proyectos', icon: ClipboardList, color: 'text-blue-400' },
          { to: '/operations/calendar', label: 'Calendario de instalaciones', icon: CalendarCheck, color: 'text-violet-400' },
          { to: '/operations/teams', label: 'Gestionar cuadrillas', icon: Wrench, color: 'text-emerald-400' },
          { to: '/operations/projects?status=atrasados', label: 'Proyectos atrasados', icon: AlertTriangle, color: 'text-red-400' },
        ].map(({ to, label, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] transition-colors group"
          >
            <Icon className={cn('w-5 h-5 flex-shrink-0', color)} />
            <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
