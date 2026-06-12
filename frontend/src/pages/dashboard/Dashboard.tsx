import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Target, CheckSquare, Phone,
  Mail, Calendar, FileText, ArrowRight, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { dashboardService } from '@/services/dashboard.service';
import { useAuthStore } from '@/store/authStore';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Avatar } from '@/components/ui/Avatar';
import { formatCurrency, getRelativeTime, ACTIVITY_TYPES } from '@/utils/helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterMode = 'day' | 'month' | 'range';

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone, email: Mail, meeting: Calendar,
  note: FileText, demo: Target, visit: Users,
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function toInputMonth(d: Date) {
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function startOfDay(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000`).toISOString();
}
function endOfDay(dateStr: string) {
  return new Date(`${dateStr}T23:59:59.999`).toISOString();
}
function startOfMonth(yearMonth: string) {
  return new Date(`${yearMonth}-01T00:00:00.000`).toISOString();
}
function endOfMonth(yearMonth: string) {
  const [y, m] = yearMonth.split('-').map(Number);
  const last = new Date(y, m, 0); // last day of month
  return new Date(`${toInputDate(last)}T23:59:59.999`).toISOString();
}

function formatPeriodLabel(mode: FilterMode, day: string, month: string, rangeFrom: string, rangeTo: string) {
  if (mode === 'day') {
    return new Date(`${day}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (mode === 'month') {
    const [y, m] = month.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  }
  if (rangeFrom && rangeTo) {
    const from = new Date(`${rangeFrom}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const to = new Date(`${rangeTo}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${from} – ${to}`;
  }
  return '';
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { user, company } = useAuthStore();
  const now = new Date();

  // Filter state
  const [mode, setMode] = useState<FilterMode>('month');
  const [selectedDay, setSelectedDay] = useState(toInputDate(now));
  const [selectedMonth, setSelectedMonth] = useState(toInputMonth(now));
  const [rangeFrom, setRangeFrom] = useState(toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [rangeTo, setRangeTo] = useState(toInputDate(now));

  // Compute startDate / endDate from current filter
  const { startDate, endDate } = useMemo(() => {
    if (mode === 'day') return { startDate: startOfDay(selectedDay), endDate: endOfDay(selectedDay) };
    if (mode === 'month') return { startDate: startOfMonth(selectedMonth), endDate: endOfMonth(selectedMonth) };
    return { startDate: startOfDay(rangeFrom), endDate: endOfDay(rangeTo) };
  }, [mode, selectedDay, selectedMonth, rangeFrom, rangeTo]);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-overview', startDate, endDate],
    queryFn: () => dashboardService.getOverview(startDate, endDate),
    refetchInterval: 60000,
  });

  if (isLoading) return <LoadingSpinner message="Cargando dashboard..." />;

  const kpis = data?.kpis;
  const sourceColors = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  const periodLabel = formatPeriodLabel(mode, selectedDay, selectedMonth, rangeFrom, rangeTo);

  // Month navigation helpers
  function shiftMonth(delta: number) {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(toInputMonth(d));
  }
  function shiftDay(delta: number) {
    const d = new Date(`${selectedDay}T12:00:00`);
    d.setDate(d.getDate() + delta);
    setSelectedDay(toInputDate(d));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hola, {user?.firstName} 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {company?.name} · <span className="text-primary-600 font-medium">{periodLabel}</span>
          </p>
        </div>
        <Button leftIcon={<Target className="w-4 h-4" />}>Nuevo Lead</Button>
      </div>

      {/* ── Date Filter Bar ── */}
      <Card className="!p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Mode pills */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
            {(['day', 'month', 'range'] as FilterMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m === 'day' ? 'Día' : m === 'month' ? 'Mes' : 'Rango'}
              </button>
            ))}
          </div>

          {/* Day picker */}
          {mode === 'day' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftDay(-1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDay}
                max={toInputDate(now)}
                onChange={(e) => e.target.value && setSelectedDay(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={() => shiftDay(1)}
                disabled={selectedDay >= toInputDate(now)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedDay(toInputDate(now))}
                className="text-xs text-primary-600 hover:underline font-medium"
              >
                Hoy
              </button>
            </div>
          )}

          {/* Month picker */}
          {mode === 'month' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftMonth(-1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="month"
                value={selectedMonth}
                max={toInputMonth(now)}
                onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={() => shiftMonth(1)}
                disabled={selectedMonth >= toInputMonth(now)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedMonth(toInputMonth(now))}
                className="text-xs text-primary-600 hover:underline font-medium"
              >
                Este mes
              </button>
            </div>
          )}

          {/* Range picker */}
          {mode === 'range' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={rangeFrom}
                max={rangeTo}
                onChange={(e) => e.target.value && setRangeFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-gray-400 text-sm">hasta</span>
              <input
                type="date"
                value={rangeTo}
                min={rangeFrom}
                max={toInputDate(now)}
                onChange={(e) => e.target.value && setRangeTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {/* Quick range shortcuts */}
              <div className="flex gap-1">
                {[
                  { label: '7d', days: 7 },
                  { label: '30d', days: 30 },
                  { label: '90d', days: 90 },
                ].map(({ label, days }) => (
                  <button
                    key={label}
                    onClick={() => {
                      const to = new Date();
                      const from = new Date();
                      from.setDate(from.getDate() - days + 1);
                      setRangeFrom(toInputDate(from));
                      setRangeTo(toInputDate(to));
                    }}
                    className="px-2.5 py-1 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-600 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Leads en el período"
          value={kpis?.totalLeads.value || 0}
          growth={kpis?.totalLeads.growth}
          icon={<Users className="w-5 h-5 text-primary-600" />}
          color="bg-primary-50"
        />
        <KpiCard
          title="Total Contactos"
          value={kpis?.totalContacts.value || 0}
          icon={<Users className="w-5 h-5 text-purple-600" />}
          color="bg-purple-50"
        />
        <KpiCard
          title="Oportunidades Abiertas"
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
        {/* Timeline chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Leads {data?.isDaily ? 'por día' : 'por mes'}
            </CardTitle>
            <Badge variant="info" size="sm">
              {data?.timeline.reduce((acc, p) => acc + p.leads, 0) || 0} total
            </Badge>
          </CardHeader>
          <ResponsiveContainer width="100%" height={220}>
            {data?.isDaily ? (
              <BarChart data={data?.timeline || []} barSize={data?.timeline.length > 15 ? 6 : 14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={data?.timeline.length > 14 ? 2 : 0} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 600, color: '#111827' }}
                />
                <Bar dataKey="leads" fill="#6366f1" radius={[4, 4, 0, 0]} name="Leads" />
              </BarChart>
            ) : (
              <AreaChart data={data?.timeline || []}>
                <defs>
                  <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 600, color: '#111827' }}
                />
                <Area type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={2.5} fill="url(#leadGradient)" name="Leads" />
              </AreaChart>
            )}
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
            <div className="text-center py-8 text-gray-400 text-sm">Sin leads en este período</div>
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
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: stage.color }} />
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
                      <span className="text-xs text-gray-400">{getRelativeTime(activity.createdAt)}</span>
                    </div>
                    <Avatar name={activity.owner} src={activity.ownerAvatar} size="xs" />
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">Sin actividades en este período</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

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
