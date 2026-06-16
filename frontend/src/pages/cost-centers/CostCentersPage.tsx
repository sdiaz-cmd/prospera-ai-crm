import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderKanban, Plus, X, Trash2, ArrowLeft,
  TrendingUp, TrendingDown, Minus, ArrowUpRight,
  ArrowDownRight, Search, ChevronRight, Calendar,
  DollarSign, Target, AlertTriangle,
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { cn } from '@/utils/helpers';
import { useAuthStore } from '@/store/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type Profitability = 'excelente' | 'bueno' | 'bajo' | 'negativo';
type Status = 'activo' | 'cerrado' | 'pausado';
type EntryType = 'ingreso' | 'gasto';

interface CostCenter {
  id: string; name: string; description: string | null; client: string | null;
  status: Status; startDate: string | null; endDate: string | null; budget: number;
  totalIngresos: number; totalGastos: number; utilidad: number; margen: number;
  profitability: Profitability; createdAt: string;
}

interface CostEntry {
  id: string; type: EntryType; category: string; description: string;
  amount: number; date: string; notes: string | null; createdAt: string;
}

interface Summary {
  totalCentros: number; activos: number;
  totalIngresos: number; totalGastos: number; utilidad: number; margen: number;
  porRentabilidad: Record<Profitability, number>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROFIT_CONFIG: Record<Profitability, {
  label: string; color: string; bg: string; ring: string; dot: string;
}> = {
  excelente: { label: 'Excelente',  color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/30', dot: 'bg-emerald-400' },
  bueno:     { label: 'Bueno',      color: 'text-blue-400',    bg: 'bg-blue-500/10',    ring: 'ring-blue-500/30',    dot: 'bg-blue-400'    },
  bajo:      { label: 'Bajo',       color: 'text-amber-400',   bg: 'bg-amber-500/10',   ring: 'ring-amber-500/30',   dot: 'bg-amber-400'   },
  negativo:  { label: 'Negativo',   color: 'text-red-400',     bg: 'bg-red-500/10',     ring: 'ring-red-500/30',     dot: 'bg-red-400'     },
};

const STATUS_LABELS: Record<Status, string> = {
  activo: 'Activo', cerrado: 'Cerrado', pausado: 'Pausado',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── ProfitabilityBadge ───────────────────────────────────────────────────────

function ProfitabilityBadge({ p, margen }: { p: Profitability; margen: number }) {
  const cfg = PROFIT_CONFIG[p];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', cfg.bg, cfg.color, cfg.ring)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label} · {margen > 0 ? '+' : ''}{margen.toFixed(1)}%
    </span>
  );
}

// ─── CenterModal (create) ─────────────────────────────────────────────────────

function CenterModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', description: '', client: '', status: 'activo', startDate: '', endDate: '', budget: '' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const mut = useMutation({
    mutationFn: () => api.post('/cost-centers', { ...form, budget: Number(form.budget || 0) }),
    onSuccess: () => { toast.success('Centro creado'); onSaved(); onClose(); },
    onError: () => toast.error('Error al crear'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h3 className="text-base font-semibold text-white">Nuevo centro de costos</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Nombre del proyecto *</label>
              <input value={form.name} onChange={set('name')} placeholder="ej. Proyecto Implementación ERP"
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-600/50" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Cliente</label>
              <input value={form.client} onChange={set('client')} placeholder="Nombre del cliente..."
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-600/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Fecha inicio</label>
              <input type="date" value={form.startDate} onChange={set('startDate')}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-primary-600/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Fecha fin</label>
              <input type="date" value={form.endDate} onChange={set('endDate')}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-primary-600/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Presupuesto</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input type="number" min="0" value={form.budget} onChange={set('budget')} placeholder="0"
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-6 pr-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-600/50" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Estado</label>
              <select value={form.status} onChange={set('status')}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-primary-600/50">
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Descripción (opcional)</label>
              <textarea rows={2} value={form.description} onChange={set('description')} placeholder="Descripción del proyecto..."
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-600/50 resize-none" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-white/10">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] text-gray-300 hover:bg-white/[0.08] text-sm font-medium transition-colors">Cancelar</button>
          <button onClick={() => mut.mutate()} disabled={!form.name.trim() || mut.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium transition-colors">
            {mut.isPending ? 'Creando...' : 'Crear proyecto'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EntryModal ───────────────────────────────────────────────────────────────

function EntryModal({ centerId, onClose, onSaved }: { centerId: string; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ type: 'ingreso' as EntryType, category: '', description: '', amount: '', date: today, notes: '' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const mut = useMutation({
    mutationFn: () => api.post(`/cost-centers/${centerId}/entries`, { ...form, amount: Number(form.amount) }),
    onSuccess: () => { toast.success('Movimiento registrado'); onSaved(); onClose(); },
    onError: () => toast.error('Error al registrar'),
  });

  const isIngreso = form.type === 'ingreso';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h3 className="text-base font-semibold text-white">Registrar movimiento</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Type toggle */}
          <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            {(['ingreso', 'gasto'] as EntryType[]).map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                  form.type === t
                    ? t === 'ingreso' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                )}>
                {t === 'ingreso' ? '↑ Ingreso' : '↓ Gasto'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Categoría</label>
              <input value={form.category} onChange={set('category')} placeholder="ej. Consultoría, Materiales..."
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-600/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Fecha</label>
              <input type="date" value={form.date} onChange={set('date')}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-primary-600/50" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Descripción *</label>
              <input value={form.description} onChange={set('description')} placeholder="Describe el movimiento..."
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-600/50" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Monto *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input type="number" min="0" value={form.amount} onChange={set('amount')} placeholder="0.00"
                  className={cn('w-full bg-white/[0.05] border rounded-xl pl-6 pr-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none',
                    isIngreso ? 'border-emerald-500/20 focus:border-emerald-500/50' : 'border-red-500/20 focus:border-red-500/50'
                  )} />
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Notas (opcional)</label>
              <textarea rows={2} value={form.notes} onChange={set('notes')} placeholder="Observaciones adicionales..."
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-600/50 resize-none" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-white/10">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] text-gray-300 hover:bg-white/[0.08] text-sm font-medium transition-colors">Cancelar</button>
          <button onClick={() => mut.mutate()} disabled={!form.description.trim() || !form.amount || mut.isPending}
            className={cn('flex-1 px-4 py-2.5 rounded-xl disabled:opacity-40 text-white text-sm font-medium transition-colors',
              isIngreso ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            )}>
            {mut.isPending ? 'Guardando...' : isIngreso ? 'Registrar ingreso' : 'Registrar gasto'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CenterDetail ─────────────────────────────────────────────────────────────

function CenterDetail({ center, isAdmin, onBack, onRefresh }: {
  center: CostCenter; isAdmin: boolean; onBack: () => void; onRefresh: () => void;
}) {
  const qc = useQueryClient();
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [filterType, setFilterType] = useState('');

  const { data: entries = [] } = useQuery<CostEntry[]>({
    queryKey: ['cost-entries', center.id, filterType],
    queryFn: () => api.get(`/cost-centers/${center.id}/entries${filterType ? `?type=${filterType}` : ''}`).then(r => r.data.data),
  });

  const deleteMut = useMutation({
    mutationFn: (entryId: string) => api.delete(`/cost-centers/${center.id}/entries/${entryId}`),
    onSuccess: () => {
      toast.success('Movimiento eliminado');
      qc.invalidateQueries({ queryKey: ['cost-entries', center.id] });
      onRefresh();
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const cfg = PROFIT_CONFIG[center.profitability];
  const budgetPct = center.budget > 0 ? Math.min((center.totalGastos / center.budget) * 100, 100) : 0;

  return (
    <div>
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">{center.name}</h2>
            <ProfitabilityBadge p={center.profitability} margen={center.margen} />
          </div>
          {center.client && <p className="text-sm text-gray-500 mt-0.5">Cliente: {center.client}</p>}
        </div>
        {isAdmin && (
          <button onClick={() => setShowEntryModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Agregar movimiento
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-gray-500">Ingresos</span>
          </div>
          <p className="text-lg font-bold text-emerald-400">{fmt(center.totalIngresos)}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownRight className="w-4 h-4 text-red-400" />
            <span className="text-xs text-gray-500">Gastos</span>
          </div>
          <p className="text-lg font-bold text-red-400">{fmt(center.totalGastos)}</p>
        </div>
        <div className={cn('border rounded-2xl p-4', cfg.bg, cfg.ring.replace('ring-', 'border-').replace('/30', '/20'))}>
          <div className="flex items-center gap-2 mb-1">
            {center.utilidad >= 0 ? <TrendingUp className={cn('w-4 h-4', cfg.color)} /> : <TrendingDown className={cn('w-4 h-4', cfg.color)} />}
            <span className="text-xs text-gray-500">Utilidad</span>
          </div>
          <p className={cn('text-lg font-bold', cfg.color)}>{fmt(center.utilidad)}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">Presupuesto</span>
          </div>
          <p className="text-lg font-bold text-gray-300">{fmt(center.budget)}</p>
          {center.budget > 0 && (
            <div className="mt-2">
              <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-emerald-500')}
                  style={{ width: `${budgetPct}%` }} />
              </div>
              <p className="text-[11px] text-gray-600 mt-1">{budgetPct.toFixed(0)}% utilizado</p>
            </div>
          )}
        </div>
      </div>

      {/* Entries table */}
      <div className="bg-[#0d1626] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300">Movimientos</h3>
          <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            {[['', 'Todos'], ['ingreso', 'Ingresos'], ['gasto', 'Gastos']].map(([val, label]) => (
              <button key={val} onClick={() => setFilterType(val)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  filterType === val ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-gray-300')}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Sin movimientos registrados</p>
          </div>
        ) : (
          <div className="space-y-1">
            {entries.map(e => (
              <div key={e.id} className="group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  e.type === 'ingreso' ? 'bg-emerald-500/15' : 'bg-red-500/15')}>
                  {e.type === 'ingreso'
                    ? <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    : <ArrowDownRight className="w-4 h-4 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{e.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-600">{e.category}</span>
                    <span className="text-gray-700">·</span>
                    <span className="text-xs text-gray-600">{fmtDate(e.date)}</span>
                    {e.notes && <><span className="text-gray-700">·</span><span className="text-xs text-gray-600 italic truncate max-w-[150px]">{e.notes}</span></>}
                  </div>
                </div>
                <p className={cn('text-sm font-semibold flex-shrink-0',
                  e.type === 'ingreso' ? 'text-emerald-400' : 'text-red-400')}>
                  {e.type === 'ingreso' ? '+' : '-'}{fmt(e.amount)}
                </p>
                {isAdmin && (
                  <button onClick={() => deleteMut.mutate(e.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showEntryModal && (
        <EntryModal centerId={center.id} onClose={() => setShowEntryModal(false)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['cost-entries', center.id] }); onRefresh(); }} />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CostCentersPage() {
  const { role, isOwner } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = isOwner || ['Administrador', 'Gerente', 'Finanzas'].includes(role?.name || '');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selected, setSelected] = useState<CostCenter | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: summary } = useQuery<Summary>({
    queryKey: ['cost-centers-summary'],
    queryFn: () => api.get('/cost-centers/summary').then(r => r.data.data),
  });

  const { data: centers = [], refetch } = useQuery<CostCenter[]>({
    queryKey: ['cost-centers', search, filterStatus],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (filterStatus) p.set('status', filterStatus);
      return api.get(`/cost-centers?${p}`).then(r => r.data.data);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/cost-centers/${id}`),
    onSuccess: () => {
      toast.success('Centro eliminado');
      setDeleteConfirm(null);
      qc.invalidateQueries({ queryKey: ['cost-centers'] });
      qc.invalidateQueries({ queryKey: ['cost-centers-summary'] });
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['cost-centers'] });
    qc.invalidateQueries({ queryKey: ['cost-centers-summary'] });
    if (selected) {
      const updated = centers.find(c => c.id === selected.id);
      if (updated) setSelected(updated);
    }
    refetch().then(r => {
      if (selected && r.data) {
        const refreshed = r.data.find((c: CostCenter) => c.id === selected.id);
        if (refreshed) setSelected(refreshed);
      }
    });
  };

  if (selected) {
    return (
      <div className="min-h-screen bg-[#080d18] p-6">
        <CenterDetail
          center={selected} isAdmin={isAdmin}
          onBack={() => { setSelected(null); refetch(); }}
          onRefresh={invalidateAll}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d18] p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-violet-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Centro de Costos</h1>
          </div>
          <p className="text-sm text-gray-500 ml-12">Rentabilidad por proyecto con indicadores en tiempo real</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Nuevo proyecto
          </button>
        )}
      </div>

      {/* Summary strip */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">Proyectos activos</p>
            <p className="text-xl font-bold text-white">{summary.activos}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">Ingresos totales</p>
            <p className="text-lg font-bold text-emerald-400">{fmt(summary.totalIngresos)}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">Gastos totales</p>
            <p className="text-lg font-bold text-red-400">{fmt(summary.totalGastos)}</p>
          </div>
          <div className={cn('border rounded-2xl p-4',
            summary.utilidad >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20')}>
            <p className="text-xs text-gray-500 mb-1">Utilidad neta</p>
            <p className={cn('text-lg font-bold', summary.utilidad >= 0 ? 'text-blue-400' : 'text-red-400')}>{fmt(summary.utilidad)}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">Margen promedio</p>
            <p className={cn('text-lg font-bold',
              summary.margen >= 40 ? 'text-emerald-400' : summary.margen >= 20 ? 'text-blue-400' : summary.margen >= 0 ? 'text-amber-400' : 'text-red-400')}>
              {summary.margen.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proyecto..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-primary-600/40" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-gray-400 focus:outline-none">
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="pausado">Pausado</option>
          <option value="cerrado">Cerrado</option>
        </select>
      </div>

      {/* Profitability legend */}
      <div className="flex items-center gap-4 mb-5">
        <span className="text-xs text-gray-600">Rentabilidad:</span>
        {(Object.entries(PROFIT_CONFIG) as [Profitability, typeof PROFIT_CONFIG[Profitability]][]).map(([k, cfg]) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
            {cfg.label}
            {summary && <span className="text-gray-700">({summary.porRentabilidad[k]})</span>}
          </span>
        ))}
      </div>

      {/* Centers grid */}
      {centers.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/[0.06] rounded-2xl">
          <FolderKanban className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No hay proyectos registrados</p>
          {isAdmin && <button onClick={() => setShowCreateModal(true)} className="mt-3 text-sm text-primary-400 hover:text-primary-300">Crear el primero</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {centers.map(c => {
            const cfg = PROFIT_CONFIG[c.profitability];
            const budgetPct = c.budget > 0 ? Math.min((c.totalGastos / c.budget) * 100, 100) : 0;
            return (
              <div key={c.id} onClick={() => setSelected(c)}
                className="group bg-[#0d1626] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg hover:shadow-black/20">

                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-sm font-semibold text-white truncate">{c.name}</h3>
                    {c.client && <p className="text-xs text-gray-600 mt-0.5 truncate">{c.client}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                  </div>
                </div>

                {/* Profitability badge */}
                <ProfitabilityBadge p={c.profitability} margen={c.margen} />

                {/* Financials */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-gray-600 mb-0.5">Ingresos</p>
                    <p className="text-xs font-semibold text-emerald-400">{fmt(c.totalIngresos)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 mb-0.5">Gastos</p>
                    <p className="text-xs font-semibold text-red-400">{fmt(c.totalGastos)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 mb-0.5">Utilidad</p>
                    <p className={cn('text-xs font-semibold', c.utilidad >= 0 ? 'text-blue-400' : 'text-red-400')}>{fmt(c.utilidad)}</p>
                  </div>
                </div>

                {/* Budget bar */}
                {c.budget > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                      <span>Presupuesto {fmt(c.budget)}</span>
                      <span>{budgetPct.toFixed(0)}% utilizado</span>
                    </div>
                    <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-emerald-500')}
                        style={{ width: `${budgetPct}%` }} />
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between">
                  <span className={cn('text-[11px] px-2 py-0.5 rounded-full',
                    c.status === 'activo' ? 'bg-emerald-500/10 text-emerald-500' :
                    c.status === 'pausado' ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-500/10 text-gray-500')}>
                    {STATUS_LABELS[c.status]}
                  </span>
                  <div className="flex items-center gap-2">
                    {c.startDate && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-600">
                        <Calendar className="w-3 h-3" /> {fmtDate(c.startDate)}
                      </span>
                    )}
                    {isAdmin && (
                      <button onClick={e => { e.stopPropagation(); setDeleteConfirm(c.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CenterModal onClose={() => setShowCreateModal(false)} onSaved={() => {
          qc.invalidateQueries({ queryKey: ['cost-centers'] });
          qc.invalidateQueries({ queryKey: ['cost-centers-summary'] });
        }} />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <h3 className="text-base font-semibold text-white">¿Eliminar proyecto?</h3>
            </div>
            <p className="text-sm text-gray-400 mb-5">Se eliminarán también todos los movimientos registrados. Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] text-gray-300 hover:bg-white/[0.08] text-sm font-medium transition-colors">Cancelar</button>
              <button onClick={() => deleteMut.mutate(deleteConfirm)} disabled={deleteMut.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-medium transition-colors">
                {deleteMut.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
