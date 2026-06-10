import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone, Plus, Send, Copy, Trash2, Eye, Users,
  Mail, BarChart3, ChevronRight, ArrowLeft, CheckCircle,
  Clock, FileText, X
} from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/utils/helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CampaignStats {
  total: number; sent: number; draft: number;
  totalSent: number; totalOpened: number; avgOpenRate: number;
}

interface Campaign {
  id: string; name: string; type: string; status: string;
  subject: string; previewText: string; body: string;
  segmentSource: string; segmentStatus: string;
  scheduledAt: string; sentAt: string;
  stats: {
    recipients: number; sent: number; opened: number; clicked: number;
    bounced: number; unsubscribed: number; openRate: number; clickRate: number;
  };
  creator?: string; createdAt: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const mktApi = {
  stats: () => api.get<CampaignStats>('/campaigns/stats').then(r => r.data),
  list: () => api.get<{ data: Campaign[] }>('/campaigns').then(r => r.data.data),
  get: (id: string) => api.get<Campaign>(`/campaigns/${id}`).then(r => r.data),
  create: (b: Partial<Campaign>) => api.post<Campaign>('/campaigns', b).then(r => r.data),
  update: (id: string, b: Partial<Campaign>) => api.put<Campaign>(`/campaigns/${id}`, b).then(r => r.data),
  send: (id: string) => api.post<Campaign>(`/campaigns/${id}/send`).then(r => r.data),
  duplicate: (id: string) => api.post<Campaign>(`/campaigns/${id}/duplicate`).then(r => r.data),
  delete: (id: string) => api.delete(`/campaigns/${id}`).then(r => r.data),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Borrador',   color: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Programada', color: 'bg-blue-100 text-blue-700' },
  sending:   { label: 'Enviando',   color: 'bg-yellow-100 text-yellow-700' },
  sent:      { label: 'Enviada',    color: 'bg-green-100 text-green-700' },
  paused:    { label: 'Pausada',    color: 'bg-red-100 text-red-700' },
};

const SOURCE_OPTS = [
  { value: '', label: 'Todos los leads' },
  { value: 'referral', label: 'Referidos' },
  { value: 'web', label: 'Web / Orgánico' },
  { value: 'social', label: 'Redes sociales' },
  { value: 'event', label: 'Evento' },
  { value: 'cold_call', label: 'Llamada en frío' },
];

const STATUS_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'qualified', label: 'Calificado' },
];

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', s.color)}>{s.label}</span>;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Campaign Form Modal ──────────────────────────────────────────────────────

function CampaignModal({
  initial, onClose, onSave,
}: {
  initial?: Partial<Campaign>;
  onClose: () => void;
  onSave: (data: Partial<Campaign>) => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    subject: initial?.subject || '',
    previewText: initial?.previewText || '',
    body: initial?.body || '',
    segmentSource: initial?.segmentSource || '',
    segmentStatus: initial?.segmentStatus || '',
  });

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial?.id ? 'Editar campaña' : 'Nueva campaña'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre de la campaña *</label>
            <input value={form.name} onChange={f('name')} placeholder="Ej: Campaña Mayo 2025" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Segmento — Fuente</label>
              <select value={form.segmentSource} onChange={f('segmentSource')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {SOURCE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Segmento — Estado</label>
              <select value={form.segmentStatus} onChange={f('segmentStatus')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Asunto del correo *</label>
            <input value={form.subject} onChange={f('subject')} placeholder="Asunto que verá el destinatario" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Texto de preview</label>
            <input value={form.previewText} onChange={f('previewText')} placeholder="Breve descripción visible en el inbox" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cuerpo del correo</label>
            <p className="text-xs text-gray-400 mb-1">Usa {'{{nombre}}'} y {'{{remitente}}'} como variables dinámicas.</p>
            <textarea value={form.body} onChange={f('body')} rows={8} placeholder="Escribe el contenido de tu correo..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none font-mono" />
          </div>
        </div>

        <div className="flex gap-3 justify-end p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.name || !form.subject}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
          >
            Guardar campaña
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Campaign Detail ──────────────────────────────────────────────────────────

function CampaignDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { data: campaign, isLoading } = useQuery({ queryKey: ['campaign', id], queryFn: () => mktApi.get(id) });
  const [editing, setEditing] = useState(false);

  const sendMut = useMutation({
    mutationFn: () => mktApi.send(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign', id] }),
  });

  const updateMut = useMutation({
    mutationFn: (body: Partial<Campaign>) => mktApi.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign', id] }); setEditing(false); },
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400">Cargando campaña...</div>;
  if (!campaign) return <div className="p-8 text-center text-gray-400">Campaña no encontrada</div>;

  const { stats } = campaign;

  return (
    <div className="space-y-6">
      {editing && (
        <CampaignModal
          initial={campaign}
          onClose={() => setEditing(false)}
          onSave={(data) => updateMut.mutate(data)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-500" /></button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 truncate">{campaign.name}</h2>
          <p className="text-sm text-gray-400">{campaign.subject}</p>
        </div>
        <StatusBadge status={campaign.status} />
        {campaign.status === 'draft' && (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Editar</button>
            <button
              onClick={() => sendMut.mutate()}
              disabled={sendMut.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              <Send className="w-4 h-4" />
              {sendMut.isPending ? 'Enviando...' : 'Enviar campaña'}
            </button>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.recipients}</p>
          <p className="text-xs text-gray-400 mt-1">Destinatarios</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
          <p className="text-xs text-gray-400 mt-1">Enviados</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.openRate}%</p>
          <p className="text-xs text-gray-400 mt-1">Tasa apertura</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{stats.clickRate}%</p>
          <p className="text-xs text-gray-400 mt-1">Tasa de clics</p>
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Body preview */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary-500" /> Contenido del correo
          </h3>
          {campaign.previewText && (
            <p className="text-xs text-gray-400 mb-3 italic">"{campaign.previewText}"</p>
          )}
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
            {campaign.body || 'Sin contenido'}
          </pre>
        </div>

        {/* Info panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-900">Configuración</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Tipo</span>
                <span className="text-gray-700 capitalize">{campaign.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Segmento fuente</span>
                <span className="text-gray-700">{campaign.segmentSource ? SOURCE_OPTS.find(o => o.value === campaign.segmentSource)?.label : 'Todos'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Segmento estado</span>
                <span className="text-gray-700">{campaign.segmentStatus ? STATUS_OPTS.find(o => o.value === campaign.segmentStatus)?.label : 'Todos'}</span>
              </div>
              {campaign.sentAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Enviada</span>
                  <span className="text-gray-700">{new Date(campaign.sentAt).toLocaleDateString('es-MX')}</span>
                </div>
              )}
              {campaign.creator && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Creada por</span>
                  <span className="text-gray-700">{campaign.creator}</span>
                </div>
              )}
            </div>
          </div>

          {campaign.status === 'sent' && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
              <h3 className="font-semibold text-gray-900">Desglose</h3>
              {[
                { label: 'Abiertos', value: stats.opened, color: 'bg-green-500' },
                { label: 'Clics', value: stats.clicked, color: 'bg-purple-500' },
                { label: 'Rebotes', value: stats.bounced, color: 'bg-red-400' },
                { label: 'Bajas', value: stats.unsubscribed, color: 'bg-gray-400' },
              ].map(row => (
                <div key={row.label}>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{row.label}</span>
                    <span>{row.value}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', row.color)} style={{ width: `${Math.min(100, (row.value / (stats.sent || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Campaign List ────────────────────────────────────────────────────────────

export function Marketing() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data: stats } = useQuery({ queryKey: ['campaign-stats'], queryFn: mktApi.stats });
  const { data: campaigns = [], isLoading } = useQuery({ queryKey: ['campaigns'], queryFn: mktApi.list });

  const createMut = useMutation({
    mutationFn: mktApi.create,
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      qc.invalidateQueries({ queryKey: ['campaign-stats'] });
      setShowModal(false);
      if (c?.id) setSelected(c.id);
    },
  });

  const dupMut = useMutation({
    mutationFn: mktApi.duplicate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); qc.invalidateQueries({ queryKey: ['campaign-stats'] }); },
  });

  const delMut = useMutation({
    mutationFn: mktApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); qc.invalidateQueries({ queryKey: ['campaign-stats'] }); },
  });

  if (selected) {
    return (
      <div className="p-6">
        <CampaignDetail id={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {showModal && (
        <CampaignModal
          onClose={() => setShowModal(false)}
          onSave={(data) => createMut.mutate(data as Partial<Campaign>)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
          <p className="text-gray-500 text-sm mt-1">Campañas de email y segmentación de leads</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva campaña
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total campañas" value={stats.total} />
          <StatCard label="Enviadas" value={stats.sent} />
          <StatCard label="Borradores" value={stats.draft} />
          <StatCard label="Emails enviados" value={stats.totalSent.toLocaleString('es-MX')} />
          <StatCard label="Emails abiertos" value={stats.totalOpened.toLocaleString('es-MX')} />
          <StatCard label="Apertura promedio" value={`${stats.avgOpenRate}%`} />
        </div>
      )}

      {/* Campaign list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary-500" />
          <h2 className="font-semibold text-gray-900">Campañas</h2>
        </div>

        {isLoading && <div className="p-8 text-center text-gray-400">Cargando campañas...</div>}

        {!isLoading && campaigns.length === 0 && (
          <div className="p-12 text-center">
            <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay campañas. ¡Crea tu primera!</p>
            <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Nueva campaña
            </button>
          </div>
        )}

        {!isLoading && campaigns.length > 0 && (
          <div className="divide-y divide-gray-50">
            {campaigns.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelected(c.id)}
              >
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  c.status === 'sent' ? 'bg-green-100' : c.status === 'draft' ? 'bg-gray-100' : 'bg-blue-100'
                )}>
                  {c.status === 'sent' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                    c.status === 'draft' ? <FileText className="w-5 h-5 text-gray-500" /> :
                      <Clock className="w-5 h-5 text-blue-600" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{c.name}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{c.subject}</p>
                </div>

                {c.status === 'sent' && (
                  <div className="hidden sm:flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">{c.stats.recipients}</p>
                      <p className="text-xs text-gray-400">Envíos</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-green-600">{c.stats.openRate}%</p>
                      <p className="text-xs text-gray-400">Apertura</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-purple-600">{c.stats.clickRate}%</p>
                      <p className="text-xs text-gray-400">Clics</p>
                    </div>
                  </div>
                )}

                {c.status === 'draft' && (
                  <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
                    <Users className="w-3.5 h-3.5" />
                    {c.stats.recipients} destinatarios estimados
                  </div>
                )}

                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => dupMut.mutate(c.id)}
                    className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600"
                    title="Duplicar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {c.status === 'draft' && (
                    <button
                      onClick={() => { if (confirm('¿Eliminar esta campaña?')) delMut.mutate(c.id); }}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300 ml-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
