import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Ticket, Plus, X, ChevronDown, CheckCircle2,
  Clock, AlertCircle, XCircle, Search, Trash2,
  MessageSquare, User, Filter, RefreshCw
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { cn } from '@/utils/helpers';
import { useAuthStore } from '@/store/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'bug' | 'mejora' | 'consulta' | 'urgente';
type Priority  = 'baja' | 'media' | 'alta' | 'critica';
type Status    = 'abierto' | 'en_revision' | 'resuelto' | 'cerrado';

interface SupportTicket {
  id: string; userId: string; userName: string; userEmail: string;
  title: string; description: string;
  category: Category; priority: Priority; status: Status;
  adminNotes: string | null; resolvedAt: string | null;
  createdAt: string; updatedAt: string;
}

interface Stats { total: number; abierto: number; en_revision: number; resuelto: number; cerrado: number; }

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<Category, string> = {
  bug: 'Error / Bug', mejora: 'Mejora', consulta: 'Consulta', urgente: 'Urgente',
};
const PRIORITY_LABELS: Record<Priority, string> = {
  baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica',
};
const STATUS_LABELS: Record<Status, string> = {
  abierto: 'Abierto', en_revision: 'En revisión', resuelto: 'Resuelto', cerrado: 'Cerrado',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  baja:    'bg-gray-100 text-gray-600',
  media:   'bg-blue-100 text-blue-700',
  alta:    'bg-amber-100 text-amber-700',
  critica: 'bg-red-100 text-red-700',
};

const STATUS_CONFIG: Record<Status, { icon: React.ComponentType<{className?:string}>; cls: string; bg: string }> = {
  abierto:     { icon: AlertCircle,   cls: 'text-amber-600',  bg: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  en_revision: { icon: Clock,         cls: 'text-blue-600',   bg: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  resuelto:    { icon: CheckCircle2,  cls: 'text-green-600',  bg: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  cerrado:     { icon: XCircle,       cls: 'text-gray-400',   bg: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

// ─── Create Ticket Modal ──────────────────────────────────────────────────────

function CreateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '', description: '',
    category: 'consulta' as Category,
    priority: 'media' as Priority,
  });

  const mut = useMutation({
    mutationFn: () => api.post('/tickets', form),
    onSuccess: () => {
      toast.success('Ticket creado');
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket-stats'] });
      onClose();
    },
    onError: () => toast.error('Error al crear el ticket'),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-primary-600" /> Nuevo ticket de soporte
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Describe brevemente el problema..."
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 bg-white"
                >
                  {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prioridad</label>
              <div className="relative">
                <select
                  value={form.priority}
                  onChange={e => set('priority', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 bg-white"
                >
                  {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripción detallada *</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={5}
              placeholder="Explica el problema con el mayor detalle posible: qué estabas haciendo, qué esperabas que ocurriera, qué ocurrió en su lugar..."
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={!form.title.trim() || !form.description.trim() || mut.isPending}
            className="flex-1 py-2.5 text-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40 rounded-xl transition-colors"
          >
            {mut.isPending ? 'Enviando...' : 'Enviar ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Detail Modal ──────────────────────────────────────────────────────

function DetailModal({ ticket, isAdmin, onClose }: {
  ticket: SupportTicket; isAdmin: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState(ticket.adminNotes || '');
  const [status, setStatus] = useState<Status>(ticket.status);

  const updateMut = useMutation({
    mutationFn: () => api.patch(`/tickets/${ticket.id}`, { status, adminNotes: notes }),
    onSuccess: () => {
      toast.success('Ticket actualizado');
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket-stats'] });
      onClose();
    },
    onError: () => toast.error('Error al actualizar el ticket'),
  });

  const { icon: StatusIcon, cls } = STATUS_CONFIG[ticket.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_CONFIG[ticket.status].bg)}>
                {STATUS_LABELS[ticket.status]}
              </span>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', PRIORITY_COLORS[ticket.priority])}>
                {PRIORITY_LABELS[ticket.priority]}
              </span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {CATEGORY_LABELS[ticket.category]}
              </span>
            </div>
            <h2 className="text-base font-semibold text-gray-900">{ticket.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Reporter info */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <User className="w-3.5 h-3.5" />
            <span className="font-medium text-gray-700">{ticket.userName}</span>
            <span>·</span>
            <span>{ticket.userEmail}</span>
            <span>·</span>
            <span>{timeAgo(ticket.createdAt)}</span>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Descripción</p>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </div>
          </div>

          {/* Admin area */}
          {isAdmin && (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gestión (admin)</p>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                <div className="relative">
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as Status)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 bg-white"
                  >
                    {(Object.entries(STATUS_LABELS) as [Status, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notas internas</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Agrega notas sobre la solución, próximos pasos o contexto..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none"
                />
              </div>
            </div>
          )}

          {/* Admin notes visible to all (read-only) */}
          {!isAdmin && ticket.adminNotes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Respuesta del equipo</p>
              <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {ticket.adminNotes}
              </div>
            </div>
          )}

          {ticket.resolvedAt && (
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Resuelto el {new Date(ticket.resolvedAt).toLocaleDateString('es-CL')}
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="flex gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
              Cerrar
            </button>
            <button
              onClick={() => updateMut.mutate()}
              disabled={updateMut.isPending}
              className="flex-1 py-2.5 text-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40 rounded-xl transition-colors"
            >
              {updateMut.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TicketsPage() {
  const { role, isOwner } = useAuthStore();
  const isAdmin = isOwner || role?.name === 'Administrador';
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const { data: tickets = [], isLoading } = useQuery<SupportTicket[]>({
    queryKey: ['tickets', filterStatus, filterPriority],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterStatus)   params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      return api.get(`/tickets?${params}`).then(r => r.data.data);
    },
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ['ticket-stats'],
    queryFn: () => api.get('/tickets/stats').then(r => r.data.data),
    enabled: isAdmin,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/tickets/${id}`),
    onSuccess: () => {
      toast.success('Ticket eliminado');
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket-stats'] });
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const filtered = tickets.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.userName.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary-600" />
            {isAdmin ? 'Soporte — Gestión de Tickets' : 'Mis Tickets de Soporte'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdmin
              ? 'Revisa, gestiona y resuelve los tickets reportados por los usuarios'
              : 'Reporta problemas o consultas al equipo de soporte'}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-primary-600/20"
        >
          <Plus className="w-4 h-4" /> Nuevo ticket
        </button>
      </div>

      {/* Stats (admin only) */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { key: 'total',       label: 'Total',        color: 'bg-gray-50 border-gray-200 text-gray-700' },
            { key: 'abierto',     label: 'Abiertos',     color: 'bg-amber-50 border-amber-200 text-amber-700' },
            { key: 'en_revision', label: 'En revisión',  color: 'bg-blue-50 border-blue-200 text-blue-700' },
            { key: 'resuelto',    label: 'Resueltos',    color: 'bg-green-50 border-green-200 text-green-700' },
            { key: 'cerrado',     label: 'Cerrados',     color: 'bg-gray-50 border-gray-200 text-gray-500' },
          ].map(s => (
            <div key={s.key} className={cn('rounded-xl border p-3 text-center', s.color)}>
              <p className="text-2xl font-bold">{stats[s.key as keyof Stats] ?? 0}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar tickets..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
          />
        </div>

        <div className="relative">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
          >
            <option value="">Todos los estados</option>
            {(Object.entries(STATUS_LABELS) as [Status, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
          >
            <option value="">Todas las prioridades</option>
            {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['tickets'] })}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tickets list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
            <Ticket className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-600">
            {tickets.length === 0 ? 'Sin tickets aún' : 'No hay resultados'}
          </p>
          <p className="text-xs text-gray-400">
            {tickets.length === 0 ? 'Crea un ticket cuando necesites reportar un problema' : 'Prueba con otros filtros'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ticket => {
            const { icon: StatusIcon, cls, bg } = STATUS_CONFIG[ticket.status];
            return (
              <div
                key={ticket.id}
                className="group bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:border-primary-200 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => setSelected(ticket)}
              >
                <div className="flex items-start gap-3">
                  <StatusIcon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', cls)} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{ticket.title}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5 max-w-lg">{ticket.description}</p>
                      </div>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(ticket.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', bg)}>
                        {STATUS_LABELS[ticket.status]}
                      </span>
                      <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', PRIORITY_COLORS[ticket.priority])}>
                        {PRIORITY_LABELS[ticket.priority]}
                      </span>
                      <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {CATEGORY_LABELS[ticket.category]}
                      </span>
                      {isAdmin && (
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <User className="w-3 h-3" /> {ticket.userName}
                        </span>
                      )}
                      {ticket.adminNotes && (
                        <span className="text-[11px] text-primary-600 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Respuesta
                        </span>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={e => { e.stopPropagation(); if (confirm('¿Eliminar este ticket?')) deleteMut.mutate(ticket.id); }}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
      {selected && <DetailModal ticket={selected} isAdmin={isAdmin} onClose={() => setSelected(null)} />}
    </div>
  );
}
