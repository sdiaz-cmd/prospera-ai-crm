import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Target, CheckSquare, Phone,
  Mail, Calendar, FileText, ArrowRight, AlertCircle
} from 'lucide-react';
import { dashboardService } from '@/services/dashboard.service';
import { useAuthStore } from '@/store/authStore';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Avatar } from '@/components/ui/Avatar';
import { formatCurrency, getRelativeTime, ACTIVITY_TYPES } from '@/utils/helpers';

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  demo: Target,
  visit: Users,
};

export function Dashboard() {
  const { user, company } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardService.getOverview,
    refetchInterval: 60000,
  });

  if (isLoading) return <LoadingSpinner message="Cargando dashboard..." />;

  const kpis = data?.kpis;
  const sourceColors = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hola, {user?.firstName} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Aquí está el resumen de {company?.name} hoy
          </p>
        </div>
        <Button leftIcon={<Target className="w-4 h-4" />}>
          Nuevo Lead
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Leads"
          value={kpis?.totalLeads.value || 0}
          growth={kpis?.totalLeads.growth}
          icon={<Users className="w-5 h-5 text-primary-600" />}
          color="bg-primary-50"
        />
        <KpiCard
          title="Contactos"
          value={kpis?.totalContacts.value || 0}
          icon={<Users className="w-5 h-5 text-purple-600" />}
          color="bg-purple-50"
        />
        <KpiCard
          title="Oportunidades"
          value={kpis?.openOpportunities.value || 0}
          subtitle={formatCurrency(kpis?.openOpportunities.totalValue || 0, company?.currency)}
          icon={<Target className="w-5 h-5 text-emerald-600" />}
          color="bg-emerald-50"
        />
        <KpiCard
          title="Tareas Pendientes"
          value={kpis?.pendingTasks.value || 0}
          alert={(kpis?.overdueTasks.value || 0) > 0 ? `${kpis?.overdueTasks.value} vencidas` : undefined}
          icon={<CheckSquare className="w-5 h-5 text-amber-600" />}
          color="bg-amber-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads por mes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Leads últimos 6 meses</CardTitle>
            <Badge variant="info" size="sm">{data?.monthlyLeads.reduce((acc, m) => acc + m.leads, 0) || 0} total</Badge>
          </CardHeader>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.monthlyLeads || []}>
              <defs>
                <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                labelStyle={{ fontWeight: 600, color: '#111827' }}
              />
              <Area type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={2.5} fill="url(#leadGradient)" name="Leads" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Leads por fuente */}
        <Card>
          <CardHeader>
            <CardTitle>Por fuente</CardTitle>
          </CardHeader>
          {data?.leadsBySource && data.leadsBySource.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={data.leadsBySource}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {data.leadsBySource.map((_, i) => (
                      <Cell key={i} fill={sourceColors[i % sourceColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v, 'Leads']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {data.leadsBySource.slice(0, 4).map((item, i) => (
                  <div key={item.source} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: sourceColors[i % sourceColors.length] }} />
                      <span className="text-gray-600 capitalize">{item.source}</span>
                    </div>
                    <span className="font-medium text-gray-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">Sin datos de fuentes</div>
          )}
        </Card>
      </div>

      {/* Pipeline + Actividades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline de Ventas</CardTitle>
            <Button variant="ghost" size="xs" rightIcon={<ArrowRight className="w-3 h-3" />}>
              Ver todo
            </Button>
          </CardHeader>
          <div className="space-y-3">
            {data?.opportunitiesByStage && data.opportunitiesByStage.length > 0 ? (
              data.opportunitiesByStage.map((stage) => (
                <div key={stage.stageId} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: stage.color }}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{stage.stageName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">{stage.count} opp</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(stage.value)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: stage.color,
                          width: `${Math.min(100, (stage.value / (kpis?.openOpportunities.totalValue || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">Sin oportunidades abiertas</div>
            )}
          </div>
        </Card>

        {/* Actividad reciente */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <Button variant="ghost" size="xs" rightIcon={<ArrowRight className="w-3 h-3" />}>
              Ver todo
            </Button>
          </CardHeader>
          <div className="space-y-4">
            {data?.recentActivities && data.recentActivities.length > 0 ? (
              data.recentActivities.map((activity) => {
                const IconComponent = ACTIVITY_ICONS[activity.type] || Mail;
                const typeInfo = ACTIVITY_TYPES[activity.type] || { label: activity.type, color: 'text-gray-500' };
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-gray-50 ${typeInfo.color} flex-shrink-0`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.subject}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {activity.entity && (
                          <span className="text-xs text-gray-500">{activity.entity}</span>
                        )}
                        <span className="text-xs text-gray-400">• {getRelativeTime(activity.createdAt)}</span>
                      </div>
                    </div>
                    <Avatar name={activity.owner} src={activity.ownerAvatar} size="xs" />
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">Sin actividades recientes</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// KPI Card Component
interface KpiCardProps {
  title: string;
  value: number;
  growth?: number;
  subtitle?: string;
  alert?: string;
  icon: React.ReactNode;
  color: string;
}

function KpiCard({ title, value, growth, subtitle, alert, icon, color }: KpiCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
        {growth !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${growth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(growth)}%
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900">{value.toLocaleString('es-MX')}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
      {subtitle && <p className="text-xs font-medium text-primary-600 mt-0.5">{subtitle}</p>}
      {alert && (
        <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
          <AlertCircle className="w-3 h-3" />
          {alert}
        </div>
      )}
    </Card>
  );
}
