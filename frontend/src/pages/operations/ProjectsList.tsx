import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Filter, X, ChevronRight,
  ClipboardList, AlertTriangle, CalendarClock, User,
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { cn } from '@/utils/helpers';
import {
  Project, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS,
  PROJECT_STATUSES, PROJECT_TYPES, TYPE_LABELS,
} from './types';

// ─── Create Project Modal ──────────────────────────────────────────────────────

interface UserOption { id: string; firstName: string; lastName: string; email: string; }

function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Project) => void }) {
  const [form, setForm] = useState({
    name: '', type: 'led', priority: 'media', origin: 'manual',
    clientName: '', clientPhone: '', address: '', city: '',
    commitmentDate: '', installationDate: '',
    saleAmount: '', estimatedCost: '', estimatedHours: '',
    description: '',
  });

  const { data: users = [] } = useQuery<UserOption[]>({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users?limit=200').then(r => r.data.data),
  });

  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/projects', data),
    onSuccess: (res) => {
      toast.success('Proyecto creado');
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['ops-dashboard'] });
      onCreated(res.data.data as Project);
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message || 'Error al crear proyecto'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nombre requerido'); return; }
    mut.mutate({
      ...form,
      saleAmount: Number(form.saleAmount) || 0,
      estimatedCost: Number(form.estimatedCost) || 0,
      estimatedHours: Number(form.estimatedHours) || 0,
    });
  };

  const inputCls = 'w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500';
  const labelCls = 'text-xs text-gray-500 font-medium';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white border border-gray-300 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-gray-200 z-10">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-400" /> Nuevo Proyecto
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Nombre */}
          <div className="space-y-1">
            <label className={labelCls}>Nombre del proyecto *</label>
            <input className={inputCls} placeholder="Ej: Instalación LED sala de reuniones" value={form.name} onChange={set('name')} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>Tipo</label>
              <select className={inputCls} value={form.type} onChange={set('type')}>
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Prioridad</label>
              <select className={inputCls} value={form.priority} onChange={set('priority')}>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>Origen</label>
              <select className={inputCls} value={form.origin} onChange={set('origin')}>
                <option value="manual">Manual</option>
                <option value="opportunity">Oportunidad CRM</option>
                <option value="warranty">Garantía</option>
                <option value="maintenance_preventive">Mantención preventiva</option>
                <option value="maintenance_corrective">Mantención correctiva</option>
                <option value="ticket">Ticket soporte</option>
                <option value="internal">Interno</option>
                <option value="demo">Demo</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Vendedor / Ejecutivo</label>
              <select className={inputCls} value={(form as Record<string, string>).sellerId || ''} onChange={set('sellerId')}>
                <option value="">Sin asignar</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Cliente</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={labelCls}>Nombre cliente</label>
                <input className={inputCls} placeholder="Nombre o empresa" value={form.clientName} onChange={set('clientName')} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Teléfono</label>
                <input className={inputCls} placeholder="+56 9 XXXX XXXX" value={form.clientPhone} onChange={set('clientPhone')} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Dirección</label>
                <input className={inputCls} placeholder="Calle y número" value={form.address} onChange={set('address')} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Ciudad</label>
                <input className={inputCls} placeholder="Santiago" value={form.city} onChange={set('city')} />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Fechas & Finanzas</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={labelCls}>Fecha compromiso</label>
                <input type="date" className={inputCls} value={form.commitmentDate} onChange={set('commitmentDate')} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Fecha instalación estimada</label>
                <input type="date" className={inputCls} value={form.installationDate} onChange={set('installationDate')} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Monto de venta ($)</label>
                <input type="number" className={inputCls} placeholder="0" value={form.saleAmount} onChange={set('saleAmount')} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Costo estimado ($)</label>
                <input type="number" className={inputCls} placeholder="0" value={form.estimatedCost} onChange={set('estimatedCost')} />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Descripción / Notas comerciales</label>
            <textarea className={cn(inputCls, 'h-20 resize-none')} placeholder="Detalle del proyecto..." value={form.description} onChange={set('description')} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={mut.isPending} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
              {mut.isPending ? 'Creando...' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Project Row ──────────────────────────────────────────────────────────────

function ProjectRow({ p }: { p: Project }) {
  const isDelayed = p.commitmentDate && new Date(p.commitmentDate) < new Date() && !['entregado', 'cerrado', 'cancelado'].includes(p.status);
  const checkPct = p.checklistTotal ? Math.round(((p.checklistDone ?? 0) / p.checklistTotal) * 100) : null;

  return (
    <Link
      to={`/operations/projects/${p.id}`}
      className="group flex items-center gap-4 px-5 py-4 border-b border-gray-100 hover:bg-white transition-colors"
    >
      {/* Code + name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-blue-400 flex-shrink-0">{p.code}</span>
          {isDelayed && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
          <span className="text-sm text-gray-800 font-medium truncate group-hover:text-gray-900 transition-colors">{p.name}</span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          {p.clientName && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <User className="w-3 h-3" /> {p.clientName}
            </span>
          )}
          {p.city && <span className="text-xs text-gray-700">{p.city}</span>}
          {p.installationDate && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <CalendarClock className="w-3 h-3" /> {new Date(p.installationDate).toLocaleDateString('es-CL')}
            </span>
          )}
        </div>
      </div>

      {/* Type */}
      <span className="hidden md:block text-xs text-gray-400 w-28 flex-shrink-0 truncate">{TYPE_LABELS[p.type] || p.type}</span>

      {/* Checklist progress */}
      {checkPct !== null ? (
        <div className="hidden lg:flex items-center gap-2 w-24 flex-shrink-0">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${checkPct}%` }} />
          </div>
          <span className="text-[10px] text-gray-400">{checkPct}%</span>
        </div>
      ) : <div className="hidden lg:block w-24" />}

      {/* Priority */}
      <span className={cn('hidden sm:inline text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0', PRIORITY_COLORS[p.priority] || 'bg-gray-500/20 text-gray-500')}>
        {PRIORITY_LABELS[p.priority] || p.priority}
      </span>

      {/* Status */}
      <span className={cn('text-[10px] px-2.5 py-1 rounded-full font-medium flex-shrink-0', STATUS_COLORS[p.status] || 'bg-gray-500/20 text-gray-500')}>
        {STATUS_LABELS[p.status] || p.status}
      </span>

      <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-500 transition-colors flex-shrink-0" />
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProjectsList() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (search)   params.set('search', search);
  if (status)   params.set('status', status);
  if (type)     params.set('type', type);
  if (priority) params.set('priority', priority);
  params.set('page', String(page));
  params.set('limit', '25');

  const { data, isLoading } = useQuery<{ projects: Project[]; total: number }>({
    queryKey: ['projects', search, status, type, priority, page],
    queryFn: () => api.get(`/projects?${params}`).then(r => r.data.data),
    staleTime: 15000,
  });

  const projects = data?.projects ?? [];
  const total    = data?.total ?? 0;
  const pages    = Math.ceil(total / 25);

  const filtersActive = !!(search || status || type || priority);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-400" /> Proyectos
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{total} proyecto{total !== 1 ? 's' : ''} en total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo proyecto
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500"
            placeholder="Buscar por nombre, código, cliente..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <select
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-500 focus:outline-none focus:border-blue-500"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">Todos los estados</option>
          {PROJECT_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
        </select>

        <select
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-500 focus:outline-none focus:border-blue-500"
          value={type}
          onChange={e => { setType(e.target.value); setPage(1); }}
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-500 focus:outline-none focus:border-blue-500"
          value={priority}
          onChange={e => { setPriority(e.target.value); setPage(1); }}
        >
          <option value="">Todas las prioridades</option>
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
          <option value="critica">Crítica</option>
        </select>

        {filtersActive && (
          <button
            onClick={() => { setSearch(''); setStatus(''); setType(''); setPriority(''); setPage(1); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-400 hover:text-red-700 border border-red-500/30 rounded-xl transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}

        {filtersActive && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500 px-2">
            <Filter className="w-3.5 h-3.5" /> {total} resultado{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
          <span className="flex-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Proyecto</span>
          <span className="hidden md:block text-xs font-medium text-gray-400 uppercase tracking-wider w-28">Tipo</span>
          <span className="hidden lg:block text-xs font-medium text-gray-400 uppercase tracking-wider w-24">Checklist</span>
          <span className="hidden sm:block text-xs font-medium text-gray-400 uppercase tracking-wider w-16">Prior.</span>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider w-36">Estado</span>
          <span className="w-4" />
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Cargando proyectos...</div>
        ) : projects.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay proyectos</p>
            <p className="text-gray-700 text-xs mt-1">
              {filtersActive ? 'Intenta con otros filtros' : 'Crea el primer proyecto con el botón de arriba'}
            </p>
          </div>
        ) : (
          projects.map(p => <ProjectRow key={p.id} p={p} />)
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 border border-gray-200 rounded-lg transition-colors"
          >← Anterior</button>
          <span className="text-xs text-gray-400 px-2">Pág {page} de {pages}</span>
          <button
            disabled={page >= pages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 border border-gray-200 rounded-lg transition-colors"
          >Siguiente →</button>
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={() => {}} />}
    </div>
  );
}
