import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe, Plus, Eye, Trash2, ExternalLink, Users,
  ArrowLeft, X, Copy, ToggleLeft, ToggleRight,
  TrendingUp, FileText, ChevronRight
} from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/utils/helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LandingPage {
  id: string; name: string; slug: string;
  headline: string; subheadline: string; description: string;
  ctaText: string; primaryColor: string; bgColor: string; logoText: string;
  showPhone: boolean; showCompany: boolean; showMessage: boolean;
  isActive: boolean; views: number; submissions: number; conversionRate: number;
  creator?: string; createdAt: string; publicUrl: string;
}

interface LandingStats {
  total: number; active: number; totalViews: number;
  totalSubmissions: number; avgConversion: number;
}

interface Submission {
  id: string; name: string; email: string; phone: string;
  company: string; message: string; lead_score: number; created_at: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const lpApi = {
  stats: () => api.get<LandingStats>('/landing-pages/stats').then(r => r.data),
  list: () => api.get<{ data: LandingPage[] }>('/landing-pages').then(r => r.data.data),
  get: (id: string) => api.get<LandingPage>(`/landing-pages/${id}`).then(r => r.data),
  create: (b: Partial<LandingPage>) => api.post<LandingPage>('/landing-pages', b).then(r => r.data),
  update: (id: string, b: Partial<LandingPage>) => api.put<LandingPage>(`/landing-pages/${id}`, b).then(r => r.data),
  submissions: (id: string) => api.get<{ data: Submission[] }>(`/landing-pages/${id}/submissions`).then(r => r.data.data),
  delete: (id: string) => api.delete(`/landing-pages/${id}`),
};

// ─── Form Modal ───────────────────────────────────────────────────────────────

const DEFAULT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

function PageModal({
  initial, onClose, onSave,
}: {
  initial?: Partial<LandingPage>;
  onClose: () => void;
  onSave: (data: Partial<LandingPage>) => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    headline: initial?.headline || '',
    subheadline: initial?.subheadline || '',
    description: initial?.description || '',
    ctaText: initial?.ctaText || 'Enviar',
    primaryColor: initial?.primaryColor || '#6366f1',
    logoText: initial?.logoText || '',
    showPhone: initial?.showPhone ?? false,
    showCompany: initial?.showCompany ?? false,
    showMessage: initial?.showMessage ?? true,
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));
  const tog = (k: 'showPhone' | 'showCompany' | 'showMessage') => () =>
    setForm(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{initial?.id ? 'Editar página' : 'Nueva landing page'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre interno *</label>
            <input value={form.name} onChange={set('name')} placeholder="Ej: Demo Q3 2025" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Título principal *</label>
            <input value={form.headline} onChange={set('headline')} placeholder="El titular que verán los visitantes" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Subtítulo</label>
            <input value={form.subheadline} onChange={set('subheadline')} placeholder="Una frase que refuerce el título" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
            <textarea value={form.description} onChange={set('description')} rows={3} placeholder="Más detalles de tu oferta o evento..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Texto del botón</label>
              <input value={form.ctaText} onChange={set('ctaText')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Logo / Marca</label>
              <input value={form.logoText} onChange={set('logoText')} placeholder="Ej: MiEmpresa.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Color principal</label>
            <div className="flex gap-2 flex-wrap">
              {DEFAULT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(p => ({ ...p, primaryColor: c }))}
                  className={cn('w-8 h-8 rounded-full border-2 transition-transform', form.primaryColor === c ? 'border-gray-900 scale-110' : 'border-transparent')}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input type="color" value={form.primaryColor} onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))}
                className="w-8 h-8 rounded-full border-2 border-gray-200 cursor-pointer p-0 overflow-hidden" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Campos del formulario</label>
            <div className="space-y-2">
              {([
                { key: 'showPhone', label: 'Teléfono' },
                { key: 'showCompany', label: 'Empresa' },
                { key: 'showMessage', label: 'Mensaje' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{label}</span>
                  <button onClick={tog(key)}>
                    {form[key]
                      ? <ToggleRight className="w-6 h-6 text-primary-600" />
                      : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">Cancelar</button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.name || !form.headline}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
          >
            {initial?.id ? 'Guardar cambios' : 'Crear página'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page Detail ──────────────────────────────────────────────────────────────

function PageDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { data: page } = useQuery({ queryKey: ['lp', id], queryFn: () => lpApi.get(id) });
  const { data: subs = [] } = useQuery({ queryKey: ['lp-subs', id], queryFn: () => lpApi.submissions(id) });
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateMut = useMutation({
    mutationFn: (b: Partial<LandingPage>) => lpApi.update(id, b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lp', id] }); setEditing(false); },
  });

  const toggleMut = useMutation({
    mutationFn: () => lpApi.update(id, { isActive: !page?.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lp', id] }),
  });

  const publicUrl = `${window.location.origin}/p/${page?.slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!page) return <div className="p-8 text-center text-gray-400">Cargando...</div>;

  return (
    <div className="space-y-6">
      {editing && (
        <PageModal initial={page} onClose={() => setEditing(false)} onSave={data => updateMut.mutate(data)} />
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-500" /></button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 truncate">{page.name}</h2>
          <p className="text-sm text-gray-400 truncate">{page.headline}</p>
        </div>
        <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', page.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
          {page.isActive ? 'Activa' : 'Inactiva'}
        </span>
        <button onClick={() => toggleMut.mutate()} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
          {page.isActive ? 'Desactivar' : 'Activar'}
        </button>
        <button onClick={() => setEditing(true)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Editar</button>
      </div>

      {/* Link bar */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex items-center gap-3">
        <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-600 flex-1 truncate font-mono">{publicUrl}</span>
        <button onClick={copyLink} className="text-xs px-3 py-1.5 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 flex-shrink-0">
          {copied ? '✓ Copiado' : <><Copy className="w-3.5 h-3.5 inline mr-1" />Copiar</>}
        </button>
        <a href={`/p/${page.slug}`} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-gray-200 rounded-lg flex-shrink-0">
          <ExternalLink className="w-4 h-4 text-gray-500" />
        </a>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{page.views.toLocaleString('es-MX')}</p>
          <p className="text-xs text-gray-400 mt-1">Visitas totales</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-primary-600">{page.submissions}</p>
          <p className="text-xs text-gray-400 mt-1">Formularios enviados</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{page.conversionRate}%</p>
          <p className="text-xs text-gray-400 mt-1">Conversión</p>
        </div>
      </div>

      {/* Submissions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary-500" />
          <h3 className="font-semibold text-gray-900">Leads capturados ({subs.length})</h3>
        </div>
        {subs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Aún no hay envíos</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {subs.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary-600">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.email}{s.company ? ` · ${s.company}` : ''}</p>
                </div>
                {s.message && <p className="text-xs text-gray-400 truncate max-w-xs hidden sm:block italic">"{s.message}"</p>}
                <p className="text-xs text-gray-300 flex-shrink-0">{new Date(s.created_at).toLocaleDateString('es-MX')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function LandingPages() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data: stats } = useQuery({ queryKey: ['lp-stats'], queryFn: lpApi.stats });
  const { data: pages = [], isLoading } = useQuery({ queryKey: ['lp-list'], queryFn: lpApi.list });

  const createMut = useMutation({
    mutationFn: lpApi.create,
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['lp-list'] });
      qc.invalidateQueries({ queryKey: ['lp-stats'] });
      setShowModal(false);
      if (p?.id) setSelected(p.id);
    },
  });

  const delMut = useMutation({
    mutationFn: lpApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lp-list'] }); qc.invalidateQueries({ queryKey: ['lp-stats'] }); },
  });

  if (selected) {
    return <div className="p-6"><PageDetail id={selected} onBack={() => setSelected(null)} /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      {showModal && (
        <PageModal onClose={() => setShowModal(false)} onSave={data => createMut.mutate(data)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Landing Pages</h1>
          <p className="text-gray-500 text-sm mt-1">Páginas de captura conectadas directamente al CRM</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" /> Nueva página
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Total páginas', value: stats.total },
            { label: 'Activas', value: stats.active },
            { label: 'Visitas totales', value: stats.totalViews.toLocaleString('es-MX') },
            { label: 'Leads capturados', value: stats.totalSubmissions },
            { label: 'Conversión promedio', value: `${stats.avgConversion}%` },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary-500" />
          <h2 className="font-semibold text-gray-900">Tus páginas</h2>
        </div>

        {isLoading && <div className="p-8 text-center text-gray-400">Cargando...</div>}

        {!isLoading && pages.length === 0 && (
          <div className="p-12 text-center">
            <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No hay landing pages. ¡Crea tu primera!</p>
            <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">Nueva página</button>
          </div>
        )}

        {!isLoading && pages.length > 0 && (
          <div className="divide-y divide-gray-50">
            {pages.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelected(p.id)}
              >
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: p.primaryColor }}>
                  {p.logoText ? p.logoText.charAt(0).toUpperCase() : <Globe className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{p.name}</p>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400')}>
                      {p.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate font-mono mt-0.5">/p/{p.slug}</p>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">{p.views.toLocaleString('es-MX')}</p>
                    <p className="text-xs text-gray-400">Visitas</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-primary-600">{p.submissions}</p>
                    <p className="text-xs text-gray-400">Leads</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-green-600">{p.conversionRate}%</p>
                    <p className="text-xs text-gray-400">Conversión</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-gray-200 rounded-lg" title="Ver página">
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                  <button onClick={() => { if (confirm('¿Eliminar esta página?')) delMut.mutate(p.id); }} className="p-1.5 hover:bg-red-50 rounded-lg" title="Eliminar">
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                  </button>
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
