import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Telescope, Play, Plus, Trash2, Clock, Users, Target, Search,
  ChevronDown, ChevronUp, Edit2, Check, X, Loader2, BookOpen, History,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apolloService } from '@/services/crm.service';
import { ApolloSearchCriteria, SavedSearch, ImportLog } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { formatDate, cn } from '@/utils/helpers';

// ─── ICP (Ideal Customer Profile) stored in localStorage ────────────────────

const ICP_KEY = 'prospera_icp';

interface ICP {
  industries: string[];
  titles: string[];
  locations: string[];
}

function loadIcp(): ICP {
  try { return JSON.parse(localStorage.getItem(ICP_KEY) || 'null') || { industries: [], titles: [], locations: [] }; }
  catch { return { industries: [], titles: [], locations: [] }; }
}
function saveIcp(icp: ICP) { localStorage.setItem(ICP_KEY, JSON.stringify(icp)); }

// ─── Tag input ───────────────────────────────────────────────────────────────

function TagInput({ label, values, onChange, placeholder }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) { onChange([...values, v]); setInput(''); }
  };
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={input} placeholder={placeholder}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <Button size="sm" onClick={add} disabled={!input.trim()}>Agregar</Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map(v => (
            <span key={v} className="flex items-center gap-1 text-xs bg-primary-50 text-primary-700 border border-primary-200 rounded-full px-2.5 py-1">
              {v}
              <button onClick={() => onChange(values.filter(x => x !== v))} className="hover:text-primary-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ICP Panel ───────────────────────────────────────────────────────────────

function IcpPanel() {
  const [icp, setIcp] = useState<ICP>(loadIcp);
  const [saved, setSaved] = useState(false);

  const update = (k: keyof ICP, v: string[]) => setIcp(prev => ({ ...prev, [k]: v }));

  const handleSave = () => {
    saveIcp(icp);
    setSaved(true);
    toast.success('Perfil ICP guardado');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary-500" />
            Perfil del Cliente Ideal (ICP)
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Define las industrias, cargos y ubicaciones que te interesan. Se usarán como filtros predeterminados en las búsquedas.
          </p>
        </div>
        <Button size="sm" onClick={handleSave} leftIcon={saved ? <Check className="w-3.5 h-3.5" /> : undefined}>
          {saved ? 'Guardado' : 'Guardar ICP'}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TagInput label="Industrias objetivo" values={icp.industries} onChange={v => update('industries', v)} placeholder="Ej: Fintech, Salud..." />
        <TagInput label="Cargos de interés" values={icp.titles} onChange={v => update('titles', v)} placeholder="Ej: Director de Ventas..." />
        <TagInput label="Ubicaciones" values={icp.locations} onChange={v => update('locations', v)} placeholder="Ej: México, Chile..." />
      </div>
    </Card>
  );
}

// ─── Search criteria form ────────────────────────────────────────────────────

function CriteriaForm({ initial, onSubmit, onCancel, submitLabel, loading }: {
  initial?: ApolloSearchCriteria;
  onSubmit: (c: ApolloSearchCriteria) => void;
  onCancel?: () => void;
  submitLabel: string;
  loading?: boolean;
}) {
  const icp = loadIcp();
  const [form, setForm] = useState<ApolloSearchCriteria>({
    title: icp.titles[0] || '',
    industry: icp.industries[0] || '',
    location: icp.locations[0] || '',
    organization: '',
    name: '',
    ...initial,
  });
  const set = (k: keyof ApolloSearchCriteria, v: string) => setForm(f => ({ ...f, [k]: v }));
  const cls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cargo</label>
          {icp.titles.length > 0 ? (
            <select className={cls} value={form.title || ''} onChange={e => set('title', e.target.value)}>
              <option value="">— Cualquier cargo —</option>
              {icp.titles.map(t => <option key={t} value={t}>{t}</option>)}
              <option value="__custom__">Otro (escribir)...</option>
            </select>
          ) : (
            <input className={cls} placeholder="Ej: Director de Ventas" value={form.title || ''} onChange={e => set('title', e.target.value)} />
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Industria</label>
          {icp.industries.length > 0 ? (
            <select className={cls} value={form.industry || ''} onChange={e => set('industry', e.target.value)}>
              <option value="">— Cualquier industria —</option>
              {icp.industries.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          ) : (
            <input className={cls} placeholder="Ej: Fintech" value={form.industry || ''} onChange={e => set('industry', e.target.value)} />
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ubicación</label>
          {icp.locations.length > 0 ? (
            <select className={cls} value={form.location || ''} onChange={e => set('location', e.target.value)}>
              <option value="">— Cualquier ubicación —</option>
              {icp.locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          ) : (
            <input className={cls} placeholder="Ej: México" value={form.location || ''} onChange={e => set('location', e.target.value)} />
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Empresa (opcional)</label>
          <input className={cls} placeholder="Ej: Grupo Bimbo" value={form.organization || ''} onChange={e => set('organization', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        {onCancel && <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>}
        <Button size="sm" loading={loading} onClick={() => onSubmit(form)} leftIcon={<Play className="w-3.5 h-3.5" />}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

// ─── Saved search card ───────────────────────────────────────────────────────

function SavedSearchCard({ search, onRun, onDelete, onEdit }: {
  search: SavedSearch;
  onRun: () => void;
  onDelete: () => void;
  onEdit: (data: { name: string; criteria: ApolloSearchCriteria }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(search.name);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const criteriaEntries = Object.entries(search.criteria).filter(([, v]) => v);

  const handleRun = async () => {
    setRunning(true);
    await onRun();
    setRunning(false);
  };

  const handleSaveEdit = () => {
    onEdit({ name, criteria: search.criteria });
    setEditing(false);
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditing(false); }}
                autoFocus
              />
              <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
              <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <h3 className="font-medium text-gray-900 truncate">{search.name}</h3>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" /> {search.totalImported} importados
            </span>
            {search.lastRunAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatDate(search.lastRunAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {!editing && (
            <button onClick={() => setEditing(true)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          <Button size="sm" onClick={handleRun} loading={running} leftIcon={<Play className="w-3.5 h-3.5" />}>
            Ejecutar
          </Button>
        </div>
      </div>

      {expanded && criteriaEntries.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
          {criteriaEntries.map(([k, v]) => (
            <span key={k} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">
              <span className="font-medium capitalize">{k}:</span> {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type Tab = 'searches' | 'new' | 'history';

export function Prospecting() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('searches');
  const [newName, setNewName] = useState('');
  const [newCriteria, setNewCriteria] = useState<ApolloSearchCriteria | null>(null);
  const [savingNew, setSavingNew] = useState(false);
  const [runningQuick, setRunningQuick] = useState(false);

  const { data: perm } = useQuery({
    queryKey: ['apollo-permission'],
    queryFn: apolloService.checkPermission,
    staleTime: 60_000,
  });

  const { data: searches = [], isLoading: loadingSearches } = useQuery({
    queryKey: ['apollo-saved-searches'],
    queryFn: apolloService.listSavedSearches,
    enabled: !!perm?.allowed,
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['apollo-import-logs'],
    queryFn: apolloService.listImportLogs,
    enabled: !!perm?.allowed && tab === 'history',
  });

  const deleteMut = useMutation({
    mutationFn: apolloService.deleteSavedSearch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apollo-saved-searches'] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; criteria?: ApolloSearchCriteria } }) =>
      apolloService.updateSavedSearch(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apollo-saved-searches'] }),
  });

  const handleRunSaved = async (id: string) => {
    try {
      const res = await apolloService.runSavedSearch(id);
      toast.success(res.message || `${res.data?.imported ?? 0} prospectos importados`);
      qc.invalidateQueries({ queryKey: ['apollo-saved-searches'] });
      qc.invalidateQueries({ queryKey: ['apollo-import-logs'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Error al ejecutar búsqueda');
    }
  };

  const handleSaveNew = async () => {
    if (!newName.trim() || !newCriteria) return;
    setSavingNew(true);
    try {
      await apolloService.createSavedSearch({ name: newName.trim(), criteria: newCriteria });
      toast.success('Búsqueda guardada');
      qc.invalidateQueries({ queryKey: ['apollo-saved-searches'] });
      setNewName('');
      setNewCriteria(null);
      setTab('searches');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Error al guardar');
    }
    setSavingNew(false);
  };

  const handleQuickRun = async (criteria: ApolloSearchCriteria) => {
    setRunningQuick(true);
    try {
      const res = await apolloService.quickImport(criteria);
      toast.success(res.message || `${res.data?.imported ?? 0} prospectos importados`);
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['apollo-import-logs'] });
      setTab('history');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Error al importar');
    }
    setRunningQuick(false);
  };

  if (!perm?.allowed) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Telescope className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700">Sin acceso a Prospección</h2>
        <p className="text-sm text-gray-400 mt-1">Tu rol no tiene permiso para usar Apollo. Contacta al administrador.</p>
      </div>
    );
  }

  if (!perm?.hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Telescope className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700">API Key de Apollo no configurada</h2>
        <p className="text-sm text-gray-400 mt-1">Ve a <strong>Configuración → Integraciones</strong> y agrega tu API Key de Apollo.io.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'searches', label: 'Búsquedas guardadas', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'new', label: 'Nueva búsqueda', icon: <Plus className="w-4 h-4" /> },
    { id: 'history', label: 'Historial', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Telescope className="w-6 h-6 text-primary-500" />
            Prospección Apollo
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Busca y captura prospectos automáticamente desde Apollo.io</p>
        </div>
      </div>

      {/* ICP Panel */}
      <IcpPanel />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                tab === t.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'searches' && (
        <div className="space-y-3">
          {loadingSearches ? (
            <div className="py-12 text-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Cargando búsquedas...</p>
            </div>
          ) : searches.length === 0 ? (
            <div className="py-16 text-center">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aún no tienes búsquedas guardadas</p>
              <p className="text-sm text-gray-400 mt-1">Crea una en la pestaña "Nueva búsqueda" para ejecutarla con un clic.</p>
              <Button className="mt-4" size="sm" onClick={() => setTab('new')} leftIcon={<Plus className="w-4 h-4" />}>
                Crear primera búsqueda
              </Button>
            </div>
          ) : (
            searches.map(s => (
              <SavedSearchCard
                key={s.id}
                search={s}
                onRun={() => handleRunSaved(s.id)}
                onDelete={() => { if (confirm(`¿Eliminar "${s.name}"?`)) deleteMut.mutate(s.id); }}
                onEdit={data => updateMut.mutate({ id: s.id, data })}
              />
            ))
          )}
        </div>
      )}

      {tab === 'new' && (
        <Card className="space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Nueva búsqueda de prospectos</h2>
            <p className="text-sm text-gray-500">Define los criterios. Los filtros de tu ICP se usan como valores predeterminados.</p>
          </div>

          <CriteriaForm
            submitLabel="Importar ahora (sin guardar)"
            loading={runningQuick}
            onSubmit={handleQuickRun}
          />

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">O guarda esta búsqueda para ejecutarla después</p>
            <div className="flex gap-2">
              <input
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Nombre de la búsqueda (ej: CFOs México Fintech)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                loading={savingNew}
                disabled={!newName.trim()}
                onClick={() => {
                  // We need criteria from the form — capture via a shared state
                  const icp = loadIcp();
                  setNewCriteria({
                    title: icp.titles[0] || '',
                    industry: icp.industries[0] || '',
                    location: icp.locations[0] || '',
                  });
                  handleSaveNew();
                }}
                leftIcon={<BookOpen className="w-3.5 h-3.5" />}
              >
                Guardar búsqueda
              </Button>
            </div>
          </div>
        </Card>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {loadingLogs ? (
            <div className="py-12 text-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center">
              <History className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Sin historial todavía</p>
              <p className="text-sm text-gray-400 mt-1">Las importaciones aparecerán aquí.</p>
            </div>
          ) : (
            <Card padding="none" className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Búsqueda</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Filtros</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Importados</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Omitidos</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log: ImportLog) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {log.searchName || <span className="text-gray-400 italic">Búsqueda rápida</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(log.criteria).filter(([, v]) => v).map(([k, v]) => (
                            <span key={k} className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{v}</span>
                          ))}
                          {Object.values(log.criteria).filter(Boolean).length === 0 && (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('font-semibold', log.imported > 0 ? 'text-green-600' : 'text-gray-400')}>
                          {log.imported}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400">{log.skipped}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
