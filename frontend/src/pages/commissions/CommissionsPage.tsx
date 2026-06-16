import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, Plus, X, Trash2, CheckCircle2, Clock,
  User, ChevronDown, TrendingUp, Wallet, Calendar,
  Edit2, Check, AlertCircle,
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { cn } from '@/utils/helpers';
import { useAuthStore } from '@/store/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommissionRule {
  id: string; companyId: string; userId: string;
  categoryName: string; percentage: number;
  createdAt: string; updatedAt: string;
  userName?: string; userEmail?: string;
}

interface CommissionRecord {
  id: string; userId: string; ruleId: string | null;
  sourceType: 'quote' | 'opportunity' | 'manual';
  sourceId: string | null; sourceDescription: string;
  baseAmount: number; percentage: number; commissionAmount: number;
  status: 'pendiente' | 'pagado';
  notes: string | null; paidAt: string | null; createdAt: string;
  userName?: string; userEmail?: string;
}

interface Summary {
  totalPendiente: number; totalPagado: number; totalGeneral: number;
  esteMes: number; registros: number; registrosPendientes: number;
}

interface UserOption { id: string; firstName: string; lastName: string; email: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(n);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── RuleModal ────────────────────────────────────────────────────────────────

function RuleModal({
  users, onClose, onSaved,
}: {
  users: UserOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [userId, setUserId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [percentage, setPercentage] = useState('');

  const mut = useMutation({
    mutationFn: () => api.post('/commissions/rules', { userId, categoryName, percentage: Number(percentage) }),
    onSuccess: () => { toast.success('Regla creada'); onSaved(); onClose(); },
    onError: () => toast.error('Error al crear regla'),
  });

  const valid = userId && categoryName.trim() && Number(percentage) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h3 className="text-base font-semibold text-white">Nueva regla de comisión</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Usuario</label>
            <select
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-primary-600/50"
            >
              <option value="">Seleccionar usuario...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} — {u.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Categoría / Producto</label>
            <input
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
              placeholder="ej. Ventas CRM, Plan Enterprise..."
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-600/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Porcentaje de comisión</label>
            <div className="relative">
              <input
                type="number" min="0" max="100" step="0.5"
                value={percentage}
                onChange={e => setPercentage(e.target.value)}
                placeholder="0"
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 pr-8 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-600/50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-white/10">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] text-gray-300 hover:bg-white/[0.08] text-sm font-medium transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={!valid || mut.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium transition-colors"
          >
            {mut.isPending ? 'Guardando...' : 'Crear regla'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ManualRecordModal ────────────────────────────────────────────────────────

function ManualRecordModal({
  users, onClose, onSaved,
}: {
  users: UserOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [userId, setUserId] = useState('');
  const [sourceDescription, setSourceDescription] = useState('');
  const [baseAmount, setBaseAmount] = useState('');
  const [percentage, setPercentage] = useState('');
  const [notes, setNotes] = useState('');

  const commissionAmount = Number(baseAmount) * (Number(percentage) / 100);

  const mut = useMutation({
    mutationFn: () => api.post('/commissions', {
      userId, sourceDescription, baseAmount: Number(baseAmount),
      percentage: Number(percentage), notes: notes.trim() || undefined,
    }),
    onSuccess: () => { toast.success('Comisión registrada'); onSaved(); onClose(); },
    onError: () => toast.error('Error al registrar comisión'),
  });

  const valid = userId && sourceDescription.trim() && Number(baseAmount) > 0 && Number(percentage) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h3 className="text-base font-semibold text-white">Registrar comisión manual</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Usuario</label>
            <select
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-primary-600/50"
            >
              <option value="">Seleccionar usuario...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Descripción / Origen</label>
            <input
              value={sourceDescription}
              onChange={e => setSourceDescription(e.target.value)}
              placeholder="ej. Venta contrato anual cliente XYZ"
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-600/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Monto base</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number" min="0"
                  value={baseAmount}
                  onChange={e => setBaseAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-6 pr-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-600/50"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Porcentaje</label>
              <div className="relative">
                <input
                  type="number" min="0" max="100" step="0.5"
                  value={percentage}
                  onChange={e => setPercentage(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 pr-7 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-600/50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
            </div>
          </div>
          {commissionAmount > 0 && (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <span className="text-sm text-emerald-400">Comisión a registrar</span>
              <span className="text-base font-bold text-emerald-400">{fmt(commissionAmount)}</span>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Notas (opcional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones adicionales..."
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-600/50 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-white/10">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] text-gray-300 hover:bg-white/[0.08] text-sm font-medium transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={!valid || mut.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium transition-colors"
          >
            {mut.isPending ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SummaryCards ─────────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: 'Total pendiente', value: fmt(summary.totalPendiente), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        { label: 'Total pagado', value: fmt(summary.totalPagado), icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        { label: 'Este mes', value: fmt(summary.esteMes), icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
        { label: 'Total acumulado', value: fmt(summary.totalGeneral), icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
      ].map(c => (
        <div key={c.label} className={cn('border rounded-2xl p-4', c.bg)}>
          <div className="flex items-center gap-2 mb-2">
            <c.icon className={cn('w-4 h-4', c.color)} />
            <span className="text-xs text-gray-500">{c.label}</span>
          </div>
          <p className={cn('text-xl font-bold', c.color)}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── RecordsTable ─────────────────────────────────────────────────────────────

function RecordsTable({
  records, isAdmin, onStatusChange, onDelete,
}: {
  records: CommissionRecord[];
  isAdmin: boolean;
  onStatusChange: (id: string, status: 'pendiente' | 'pagado') => void;
  onDelete: (id: string) => void;
}) {
  if (records.length === 0) {
    return (
      <div className="text-center py-16">
        <Wallet className="w-10 h-10 text-gray-700 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No hay registros de comisiones</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {isAdmin && <th className="text-left text-xs font-medium text-gray-600 pb-3 pr-4">Usuario</th>}
            <th className="text-left text-xs font-medium text-gray-600 pb-3 pr-4">Descripción</th>
            <th className="text-left text-xs font-medium text-gray-600 pb-3 pr-4">Tipo</th>
            <th className="text-right text-xs font-medium text-gray-600 pb-3 pr-4">Base</th>
            <th className="text-right text-xs font-medium text-gray-600 pb-3 pr-4">%</th>
            <th className="text-right text-xs font-medium text-gray-600 pb-3 pr-4">Comisión</th>
            <th className="text-left text-xs font-medium text-gray-600 pb-3 pr-4">Estado</th>
            <th className="text-left text-xs font-medium text-gray-600 pb-3">Fecha</th>
            {isAdmin && <th className="text-right text-xs font-medium text-gray-600 pb-3">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {records.map(r => (
            <tr key={r.id} className="group hover:bg-white/[0.02] transition-colors">
              {isAdmin && (
                <td className="py-3 pr-4">
                  <p className="text-gray-300 font-medium text-xs truncate max-w-[120px]">{r.userName || '—'}</p>
                  <p className="text-gray-600 text-[11px] truncate">{r.userEmail}</p>
                </td>
              )}
              <td className="py-3 pr-4">
                <p className="text-gray-300 text-xs leading-snug max-w-[200px]">{r.sourceDescription}</p>
                {r.notes && <p className="text-gray-600 text-[11px] mt-0.5 italic">{r.notes}</p>}
              </td>
              <td className="py-3 pr-4">
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
                  r.sourceType === 'quote' ? 'bg-blue-500/10 text-blue-400' :
                  r.sourceType === 'opportunity' ? 'bg-purple-500/10 text-purple-400' :
                  'bg-gray-500/10 text-gray-400'
                )}>
                  {r.sourceType === 'quote' ? 'Cotización' : r.sourceType === 'opportunity' ? 'Oportunidad' : 'Manual'}
                </span>
              </td>
              <td className="py-3 pr-4 text-right text-gray-400 text-xs">{fmt(r.baseAmount)}</td>
              <td className="py-3 pr-4 text-right text-gray-500 text-xs">{r.percentage}%</td>
              <td className="py-3 pr-4 text-right font-semibold text-emerald-400 text-sm">{fmt(r.commissionAmount)}</td>
              <td className="py-3 pr-4">
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                  r.status === 'pagado'
                    ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'
                )}>
                  {r.status === 'pagado' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {r.status === 'pagado' ? 'Pagado' : 'Pendiente'}
                </span>
              </td>
              <td className="py-3 text-gray-600 text-xs">{fmtDate(r.createdAt)}</td>
              {isAdmin && (
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onStatusChange(r.id, r.status === 'pagado' ? 'pendiente' : 'pagado')}
                      title={r.status === 'pagado' ? 'Marcar pendiente' : 'Marcar pagado'}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        r.status === 'pagado'
                          ? 'text-amber-400 hover:bg-amber-500/10'
                          : 'text-emerald-400 hover:bg-emerald-500/10'
                      )}
                    >
                      {r.status === 'pagado' ? <Clock className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => onDelete(r.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── RulesPanel ───────────────────────────────────────────────────────────────

function RulesPanel({
  rules, onAdd, onDelete,
}: {
  rules: CommissionRule[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  // Group by user
  const grouped = rules.reduce<Record<string, { name: string; email: string; rules: CommissionRule[] }>>((acc, r) => {
    const key = r.userId;
    if (!acc[key]) acc[key] = { name: r.userName || r.userId, email: r.userEmail || '', rules: [] };
    acc[key].rules.push(r);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300">Reglas configuradas</h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Nueva regla
        </button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
          <AlertCircle className="w-8 h-8 text-gray-700 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Sin reglas configuradas</p>
          <p className="text-gray-700 text-xs mt-1">Crea una regla para que los ejecutivos acumulen comisiones automáticamente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([, g]) => (
            <div key={g.email} className="border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02]">
                <div className="w-7 h-7 rounded-full bg-primary-600/20 flex items-center justify-center text-xs font-bold text-primary-400">
                  {g.name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">{g.name}</p>
                  <p className="text-xs text-gray-600">{g.email}</p>
                </div>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {g.rules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between px-4 py-2.5 group hover:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300">{rule.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-emerald-400">{rule.percentage}%</span>
                      <button
                        onClick={() => onDelete(rule.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ExecutiveSelfModal ───────────────────────────────────────────────────────

function ExecutiveSelfModal({
  myRules, onClose, onSaved,
}: {
  myRules: CommissionRule[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [ruleId, setRuleId] = useState('');
  const [sourceDescription, setSourceDescription] = useState('');
  const [baseAmount, setBaseAmount] = useState('');
  const [notes, setNotes] = useState('');

  const selectedRule = myRules.find(r => r.id === ruleId);
  const commissionAmount = selectedRule ? Number(baseAmount) * (selectedRule.percentage / 100) : 0;

  const mut = useMutation({
    mutationFn: () => api.post('/commissions/self', {
      ruleId, sourceDescription, baseAmount: Number(baseAmount),
      notes: notes.trim() || undefined,
    }),
    onSuccess: () => { toast.success('Comisión registrada'); onSaved(); onClose(); },
    onError: () => toast.error('Error al registrar'),
  });

  const valid = ruleId && sourceDescription.trim() && Number(baseAmount) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h3 className="text-base font-semibold text-white">Registrar comisión</h3>
            <p className="text-xs text-gray-500 mt-0.5">El porcentaje lo define tu administrador</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">

          {myRules.length === 0 ? (
            <div className="text-center py-6">
              <AlertCircle className="w-8 h-8 text-amber-500/60 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No tienes categorías de comisión asignadas.</p>
              <p className="text-xs text-gray-600 mt-1">Contacta a tu administrador para que configure tus reglas.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Categoría de venta</label>
                <select
                  value={ruleId}
                  onChange={e => setRuleId(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-primary-600/50"
                >
                  <option value="">Seleccionar categoría...</option>
                  {myRules.map(r => (
                    <option key={r.id} value={r.id}>{r.categoryName}</option>
                  ))}
                </select>
              </div>

              {selectedRule && (
                <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Tu porcentaje asignado</p>
                    <p className="text-lg font-bold text-emerald-400">{selectedRule.percentage}%</p>
                  </div>
                  <div className="w-px h-8 bg-white/[0.06]" />
                  <div className="flex-1 text-right">
                    <p className="text-xs text-gray-500">Categoría</p>
                    <p className="text-sm font-medium text-gray-300">{selectedRule.categoryName}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Descripción de la venta</label>
                <input
                  value={sourceDescription}
                  onChange={e => setSourceDescription(e.target.value)}
                  placeholder="ej. Venta plan Growth a Empresa ABC"
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-600/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Monto de la venta (base)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number" min="0"
                    value={baseAmount}
                    onChange={e => setBaseAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-6 pr-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-600/50"
                  />
                </div>
              </div>

              {commissionAmount > 0 && (
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                  <span className="text-sm text-emerald-400 font-medium">Tu comisión estimada</span>
                  <span className="text-xl font-bold text-emerald-400">{fmt(commissionAmount)}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Notas (opcional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Detalles adicionales..."
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-600/50 resize-none"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-white/10">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] text-gray-300 hover:bg-white/[0.08] text-sm font-medium transition-colors">
            Cancelar
          </button>
          {myRules.length > 0 && (
            <button
              onClick={() => mut.mutate()}
              disabled={!valid || mut.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-medium transition-colors"
            >
              {mut.isPending ? 'Registrando...' : 'Registrar comisión'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'cuenta' | 'gestion' | 'reglas';

export function CommissionsPage() {
  const { user, role, isOwner } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = isOwner || role?.name === 'Administrador' || role?.name === 'Gerente' || role?.name === 'Finanzas';

  const [tab, setTab] = useState<Tab>(isAdmin ? 'cuenta' : 'cuenta');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showSelfModal, setShowSelfModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Summary (own or filtered)
  const summaryParams = isAdmin && filterUserId ? `?userId=${filterUserId}` : '';
  const { data: summary } = useQuery<Summary>({
    queryKey: ['commissions-summary', filterUserId],
    queryFn: () => api.get(`/commissions/summary${summaryParams}`).then(r => r.data.data),
  });

  // Records
  const recordsParams = new URLSearchParams();
  if (filterStatus) recordsParams.set('status', filterStatus);
  if (isAdmin && filterUserId) recordsParams.set('userId', filterUserId);
  const { data: records = [] } = useQuery<CommissionRecord[]>({
    queryKey: ['commissions-records', filterStatus, filterUserId],
    queryFn: () => api.get(`/commissions?${recordsParams}`).then(r => r.data.data),
  });

  // Rules — admin gets all, executive gets only their own
  const { data: rules = [] } = useQuery<CommissionRule[]>({
    queryKey: ['commissions-rules'],
    queryFn: () => api.get('/commissions/rules').then(r => r.data.data),
  });

  // Users (for admin selects)
  const { data: users = [] } = useQuery<UserOption[]>({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users?limit=200').then(r => r.data.data),
    enabled: isAdmin,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['commissions-summary'] });
    qc.invalidateQueries({ queryKey: ['commissions-records'] });
    qc.invalidateQueries({ queryKey: ['commissions-rules'] });
  };

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/commissions/${id}/status`, { status }),
    onSuccess: () => { toast.success('Estado actualizado'); invalidate(); },
    onError: () => toast.error('Error al actualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/commissions/${id}`),
    onSuccess: () => { toast.success('Registro eliminado'); setDeleteConfirm(null); invalidate(); },
    onError: () => toast.error('Error al eliminar'),
  });

  const deleteRuleMut = useMutation({
    mutationFn: (id: string) => api.delete(`/commissions/rules/${id}`),
    onSuccess: () => { toast.success('Regla eliminada'); invalidate(); },
    onError: () => toast.error('Error al eliminar regla'),
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'cuenta', label: 'Mi cuenta' },
    ...(isAdmin ? [
      { id: 'gestion' as Tab, label: 'Gestión' },
      { id: 'reglas' as Tab, label: 'Reglas' },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-[#080d18] p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Comisiones</h1>
          </div>
          <p className="text-sm text-gray-500 ml-12">
            {isAdmin ? 'Gestiona y monitorea las comisiones del equipo' : 'Tu cuenta de comisiones personales'}
          </p>
        </div>

        <div className="flex gap-2">
          {!isAdmin && tab === 'cuenta' && (
            <button
              onClick={() => setShowSelfModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Registrar venta
            </button>
          )}
          {isAdmin && tab === 'gestion' && (
            <button
              onClick={() => setShowManualModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Registrar manual
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="flex gap-1 mb-6 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === t.id
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (tab === 'cuenta' || tab === 'gestion') && (
        <div className="mb-6">
          <SummaryCards summary={summary} />
        </div>
      )}

      {/* Tab: Mi Cuenta */}
      {tab === 'cuenta' && (
        <div className="bg-[#0d1626] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-300">Mis comisiones</h2>
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-gray-400 focus:outline-none"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
              </select>
            </div>
          </div>
          <RecordsTable
            records={records}
            isAdmin={false}
            onStatusChange={(id, status) => statusMut.mutate({ id, status })}
            onDelete={setDeleteConfirm}
          />
        </div>
      )}

      {/* Tab: Gestión (admin) */}
      {tab === 'gestion' && isAdmin && (
        <div className="bg-[#0d1626] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-300">Todos los registros</h2>
            <div className="flex items-center gap-2">
              <select
                value={filterUserId}
                onChange={e => setFilterUserId(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-gray-400 focus:outline-none"
              >
                <option value="">Todos los usuarios</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-gray-400 focus:outline-none"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
              </select>
            </div>
          </div>
          <RecordsTable
            records={records}
            isAdmin={true}
            onStatusChange={(id, status) => statusMut.mutate({ id, status })}
            onDelete={setDeleteConfirm}
          />
        </div>
      )}

      {/* Tab: Reglas (admin) */}
      {tab === 'reglas' && isAdmin && (
        <div className="bg-[#0d1626] border border-white/[0.06] rounded-2xl p-5">
          <RulesPanel
            rules={rules}
            onAdd={() => setShowRuleModal(true)}
            onDelete={id => deleteRuleMut.mutate(id)}
          />
        </div>
      )}

      {/* Modals */}
      {showRuleModal && (
        <RuleModal users={users} onClose={() => setShowRuleModal(false)} onSaved={invalidate} />
      )}
      {showManualModal && (
        <ManualRecordModal users={users} onClose={() => setShowManualModal(false)} onSaved={invalidate} />
      )}
      {showSelfModal && (
        <ExecutiveSelfModal myRules={rules} onClose={() => setShowSelfModal(false)} onSaved={invalidate} />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-2">¿Eliminar registro?</h3>
            <p className="text-sm text-gray-400 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] text-gray-300 hover:bg-white/[0.08] text-sm font-medium transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => deleteMut.mutate(deleteConfirm)}
                disabled={deleteMut.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-medium transition-colors"
              >
                {deleteMut.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
