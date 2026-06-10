import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { BarChart3, TrendingUp, Users, Target, DollarSign, Award } from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/utils/helpers';

// ─── API ──────────────────────────────────────────────────────────────────────

const rApi = {
  sales:    () => api.get('/reports/sales').then(r => r.data),
  leads:    () => api.get('/reports/leads').then(r => r.data),
  pipeline: () => api.get('/reports/pipeline').then(r => r.data),
  team:     () => api.get('/reports/team').then(r => r.data),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

const TABS = [
  { id: 'sales',    label: 'Ventas',   icon: DollarSign },
  { id: 'leads',    label: 'Leads',    icon: Target },
  { id: 'pipeline', label: 'Pipeline', icon: TrendingUp },
  { id: 'team',     label: 'Equipo',   icon: Users },
] as const;
type Tab = typeof TABS[number]['id'];

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];

function KpiCard({ label, value, sub, icon: Icon, color = 'text-primary-600' }: {
  label: string; value: string | number; sub?: string;
  icon?: React.ComponentType<{ className?: string }>; color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400">{label}</p>
        {Icon && <Icon className={cn('w-4 h-4', color)} />}
      </div>
      <p className={cn('text-2xl font-bold', color === 'text-primary-600' ? 'text-gray-900' : color)}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Sales Tab ────────────────────────────────────────────────────────────────

function SalesTab() {
  const { data, isLoading } = useQuery({ queryKey: ['rep-sales'], queryFn: rApi.sales });
  if (isLoading) return <Loader />;
  const { kpis, monthlyRevenue } = data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Ingresos totales" value={fmt(kpis.totalRevenue)} icon={DollarSign} color="text-green-600" />
        <KpiCard label="Negocios ganados" value={kpis.wonDeals} icon={Award} color="text-primary-600" />
        <KpiCard label="Tasa de cierre" value={`${kpis.winRate}%`} sub="Ganados vs perdidos" icon={TrendingUp} color="text-blue-600" />
        <KpiCard label="Pipeline abierto" value={fmt(kpis.openPipelineValue)} sub={`${kpis.openDeals} negocios activos`} />
        <KpiCard label="Forecast estimado" value={fmt(kpis.forecast)} sub="Basado en probabilidad" icon={Target} color="text-purple-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Ingresos por mes (últimos 6 meses)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyRevenue} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Bar dataKey="revenue" name="Ingresos" fill="#6366f1" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Negocios cerrados por mes</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Line dataKey="deals" name="Negocios" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Leads Tab ────────────────────────────────────────────────────────────────

function LeadsTab() {
  const { data, isLoading } = useQuery({ queryKey: ['rep-leads'], queryFn: rApi.leads });
  if (isLoading) return <Loader />;
  const { kpis, monthlyLeads, bySource, scoreDistribution } = data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total leads" value={kpis.totalLeads} icon={Target} />
        <KpiCard label="Convertidos" value={kpis.converted} color="text-green-600" />
        <KpiCard label="Tasa conversión" value={`${kpis.conversionRate}%`} icon={TrendingUp} color="text-blue-600" />
        <KpiCard label="Score promedio" value={kpis.avgScore} sub="/100" color="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Leads por mes</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyLeads} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="leads" name="Nuevos" fill="#6366f1" radius={[4,4,0,0]} />
              <Bar dataKey="converted" name="Convertidos" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Fuente de leads</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={bySource} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={80} label={({ source, percent }) => `${source} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {bySource.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Distribución de score</h3>
        <div className="space-y-3">
          {scoreDistribution.map((s: { label: string; value: number; color: string }) => {
            const total = scoreDistribution.reduce((a: number, b: { value: number }) => a + b.value, 0);
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
            return (
              <div key={s.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{s.label}</span>
                  <span className="font-medium">{s.value} leads ({pct}%)</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline Tab ─────────────────────────────────────────────────────────────

function PipelineTab() {
  const { data, isLoading } = useQuery({ queryKey: ['rep-pipeline'], queryFn: rApi.pipeline });
  if (isLoading) return <Loader />;
  const { byStage, kpis } = data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <KpiCard label="Valor promedio de negocio" value={fmt(kpis.avgDealSize)} icon={DollarSign} color="text-green-600" />
        <KpiCard label="Días promedio para cerrar" value={kpis.avgCloseDays || '—'} sub={kpis.avgCloseDays ? 'días' : 'Sin datos aún'} icon={TrendingUp} color="text-blue-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Negocios por etapa</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byStage} layout="vertical" barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
            <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={120} />
            <Tooltip formatter={(v: number, name: string) => name === 'value' ? fmt(v) : v} />
            <Bar dataKey="count" name="Negocios" radius={[0,4,4,0]}>
              {byStage.map((s: { color: string }, i: number) => <Cell key={i} fill={s.color || COLORS[i]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Valor del pipeline por etapa</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {byStage.map((s: { stage: string; color: string; count: number; value: number; avgProbability: number }) => (
            <div key={s.stage} className="flex items-center gap-4 px-5 py-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color || '#6366f1' }} />
              <span className="flex-1 text-sm text-gray-700">{s.stage}</span>
              <span className="text-sm text-gray-400">{s.count} negocios</span>
              <span className="text-sm font-semibold text-gray-900 w-28 text-right">{fmt(s.value)}</span>
              <span className="text-xs text-gray-400 w-16 text-right">{s.avgProbability}% prob.</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

function TeamTab() {
  const { data, isLoading } = useQuery({ queryKey: ['rep-team'], queryFn: rApi.team });
  if (isLoading) return <Loader />;
  const { activityByUser, tasksByUser, wonByUser } = data;
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Actividades por ejecutivo</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={activityByUser} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="calls" name="Llamadas" fill="#6366f1" radius={[4,4,0,0]} stackId="a" />
            <Bar dataKey="emails" name="Correos" fill="#10b981" radius={[0,0,0,0]} stackId="a" />
            <Bar dataKey="meetings" name="Reuniones" fill="#f59e0b" radius={[4,4,0,0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Ventas por ejecutivo</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {wonByUser.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">Sin datos de cierre aún</p>}
            {wonByUser.map((u: { name: string; wonDeals: number; revenue: number }, i: number) => (
              <div key={u.name} className="flex items-center gap-3 px-5 py-3">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                <span className="flex-1 text-sm font-medium text-gray-800">{u.name}</span>
                <span className="text-xs text-gray-400">{u.wonDeals} negocios</span>
                <span className="text-sm font-bold text-gray-900">{fmt(u.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Tareas por ejecutivo</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {tasksByUser.map((u: { name: string; total: number; completed: number; pending: number }) => {
              const pct = u.total > 0 ? Math.round((u.completed / u.total) * 100) : 0;
              return (
                <div key={u.name} className="px-5 py-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800">{u.name}</span>
                    <span className="text-gray-400">{u.completed}/{u.total} completadas</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Loader() {
  return <div className="py-16 text-center text-gray-400 text-sm">Cargando reporte...</div>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Reports() {
  const [tab, setTab] = useState<Tab>('sales');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes & Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Métricas y análisis de rendimiento de tu negocio</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sales'    && <SalesTab />}
      {tab === 'leads'    && <LeadsTab />}
      {tab === 'pipeline' && <PipelineTab />}
      {tab === 'team'     && <TeamTab />}
    </div>
  );
}
