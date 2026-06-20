import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ChevronDown, Plus, Check, Trash2,
  Clock, User, FileText, Wrench, CheckSquare,
  MessageSquare, Package, ChevronRight, X, Edit2, Save,
  Upload, Download, Link as LinkIcon, Image, File, Loader2,
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { cn } from '@/utils/helpers';
import {
  Project, ProjectTask, ChecklistItem, ProjectDocument,
  InstalledEquipment, ProjectLog,
  STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS,
  PROJECT_STATUSES, TYPE_LABELS,
} from './types';

type TabId = 'general' | 'tasks' | 'checklist' | 'documents' | 'equipment' | 'logs';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general',   label: 'General',    icon: Wrench },
  { id: 'tasks',     label: 'Tareas',     icon: CheckSquare },
  { id: 'checklist', label: 'Checklist',  icon: Check },
  { id: 'documents', label: 'Documentos', icon: FileText },
  { id: 'equipment', label: 'Equipos',    icon: Package },
  { id: 'logs',      label: 'Bitácora',   icon: MessageSquare },
];

const inputCls = 'w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500';

// ─── Status Changer ───────────────────────────────────────────────────────────

function StatusChanger({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (s: string) => api.patch(`/projects/${project.id}/status`, { status: s }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', project.id] }); toast.success('Estado actualizado'); setOpen(false); },
    onError: () => toast.error('Error al cambiar estado'),
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors', STATUS_COLORS[project.status] || 'bg-gray-500/20 text-gray-500')}
      >
        {STATUS_LABELS[project.status] || project.status}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl w-56 max-h-72 overflow-y-auto py-1">
          {PROJECT_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => mut.mutate(s)}
              disabled={s === project.status || mut.isPending}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                s === project.status ? 'opacity-40 cursor-default' : 'hover:bg-gray-100'
              )}
            >
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[s] || 'bg-gray-500/20 text-gray-500')}>
                {STATUS_LABELS[s]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── General Tab ──────────────────────────────────────────────────────────────

function GeneralTab({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: project.name, description: project.description || '',
    clientName: project.clientName || '', clientEmail: project.clientEmail || '',
    clientPhone: project.clientPhone || '', address: project.address || '',
    city: project.city || '', region: project.region || '',
    commitmentDate: project.commitmentDate?.slice(0, 10) || '',
    installationDate: project.installationDate?.slice(0, 10) || '',
    saleAmount: String(project.saleAmount || ''),
    estimatedCost: String(project.estimatedCost || ''),
    actualCost: String(project.actualCost || ''),
    commercialNotes: project.commercialNotes || '',
    technicalNotes: project.technicalNotes || '',
  });
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/projects/${project.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', project.id] }); toast.success('Guardado'); setEditing(false); },
    onError: () => toast.error('Error al guardar'),
  });

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  if (!editing) {
    return (
      <div className="space-y-5">
        <div className="flex justify-end">
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-700 transition-colors">
            <Edit2 className="w-3.5 h-3.5" /> Editar
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Tipo', value: TYPE_LABELS[project.type] || project.type },
            { label: 'Prioridad', value: PRIORITY_LABELS[project.priority] || project.priority },
            { label: 'Origen', value: project.origin },
            { label: 'Cliente', value: project.clientName },
            { label: 'Teléfono', value: project.clientPhone },
            { label: 'Email', value: project.clientEmail },
            { label: 'Dirección', value: project.address ? `${project.address}${project.city ? ', ' + project.city : ''}` : null },
            { label: 'Fecha compromiso', value: project.commitmentDate ? new Date(project.commitmentDate).toLocaleDateString('es-CL') : null },
            { label: 'Fecha instalación', value: project.installationDate ? new Date(project.installationDate).toLocaleDateString('es-CL') : null },
          ].filter(f => f.value).map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-sm text-gray-800">{value}</p>
            </div>
          ))}
        </div>

        {(project.saleAmount > 0 || project.estimatedCost > 0) && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <p className="text-xs text-emerald-400 mb-1">Venta</p>
              <p className="text-lg font-bold text-emerald-700">{project.saleAmount.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <p className="text-xs text-blue-400 mb-1">Costo estimado</p>
              <p className="text-lg font-bold text-blue-700">{project.estimatedCost.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
              <p className="text-xs text-orange-400 mb-1">Costo real</p>
              <p className="text-lg font-bold text-orange-700">{project.actualCost.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        )}

        {project.description && (
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-2">Descripción</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.description}</p>
          </div>
        )}

        {project.technicalNotes && (
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-2">Notas técnicas</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.technicalNotes}</p>
          </div>
        )}

        {project.chiefName || project.sellerName || project.leadTechName ? (
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-3">Equipo asignado</p>
            <div className="flex gap-4 flex-wrap">
              {project.sellerName && <div><p className="text-xs text-gray-400">Vendedor</p><p className="text-sm text-gray-700">{project.sellerName}</p></div>}
              {project.chiefName && <div><p className="text-xs text-gray-400">Jefe técnico</p><p className="text-sm text-gray-700">{project.chiefName}</p></div>}
              {project.leadTechName && <div><p className="text-xs text-gray-400">Técnico líder</p><p className="text-sm text-gray-700">{project.leadTechName}</p></div>}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={e => { e.preventDefault(); mut.mutate({ ...form, saleAmount: Number(form.saleAmount), estimatedCost: Number(form.estimatedCost), actualCost: Number(form.actualCost) }); }} className="space-y-4">
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
        <button type="submit" disabled={mut.isPending} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition-colors">
          <Save className="w-3.5 h-3.5" /> {mut.isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="text-xs text-gray-400">Nombre</label><input className={inputCls} value={form.name} onChange={f('name')} /></div>
        <div><label className="text-xs text-gray-400">Cliente</label><input className={inputCls} value={form.clientName} onChange={f('clientName')} /></div>
        <div><label className="text-xs text-gray-400">Teléfono</label><input className={inputCls} value={form.clientPhone} onChange={f('clientPhone')} /></div>
        <div><label className="text-xs text-gray-400">Email</label><input className={inputCls} value={form.clientEmail} onChange={f('clientEmail')} /></div>
        <div><label className="text-xs text-gray-400">Ciudad</label><input className={inputCls} value={form.city} onChange={f('city')} /></div>
        <div><label className="text-xs text-gray-400">Dirección</label><input className={inputCls} value={form.address} onChange={f('address')} /></div>
        <div><label className="text-xs text-gray-400">Región</label><input className={inputCls} value={form.region} onChange={f('region')} /></div>
        <div><label className="text-xs text-gray-400">Fecha compromiso</label><input type="date" className={inputCls} value={form.commitmentDate} onChange={f('commitmentDate')} /></div>
        <div><label className="text-xs text-gray-400">Fecha instalación</label><input type="date" className={inputCls} value={form.installationDate} onChange={f('installationDate')} /></div>
        <div><label className="text-xs text-gray-400">Monto venta</label><input type="number" className={inputCls} value={form.saleAmount} onChange={f('saleAmount')} /></div>
        <div><label className="text-xs text-gray-400">Costo estimado</label><input type="number" className={inputCls} value={form.estimatedCost} onChange={f('estimatedCost')} /></div>
        <div><label className="text-xs text-gray-400">Costo real</label><input type="number" className={inputCls} value={form.actualCost} onChange={f('actualCost')} /></div>
        <div className="col-span-2"><label className="text-xs text-gray-400">Descripción</label><textarea className={cn(inputCls, 'h-20 resize-none')} value={form.description} onChange={f('description')} /></div>
        <div className="col-span-2"><label className="text-xs text-gray-400">Notas técnicas</label><textarea className={cn(inputCls, 'h-16 resize-none')} value={form.technicalNotes} onChange={f('technicalNotes')} /></div>
        <div className="col-span-2"><label className="text-xs text-gray-400">Notas comerciales</label><textarea className={cn(inputCls, 'h-16 resize-none')} value={form.commercialNotes} onChange={f('commercialNotes')} /></div>
      </div>
    </form>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab({ projectId }: { projectId: string }) {
  const [title, setTitle] = useState('');
  const qc = useQueryClient();
  const { data: tasks = [] } = useQuery<ProjectTask[]>({
    queryKey: ['project-tasks', projectId],
    queryFn: () => api.get(`/projects/${projectId}/tasks`).then(r => r.data.data),
  });
  const create = useMutation({
    mutationFn: (t: string) => api.post(`/projects/${projectId}/tasks`, { title: t }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-tasks', projectId] }); setTitle(''); },
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/projects/${projectId}/tasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-tasks', projectId] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${projectId}/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-tasks', projectId] }),
  });

  const statusCycleMap: Record<string, string> = {
    pendiente: 'en_progreso', en_progreso: 'completada', completada: 'pendiente',
  };
  const statusColor: Record<string, string> = {
    pendiente: 'text-gray-500', en_progreso: 'text-blue-400', completada: 'text-emerald-400',
  };

  return (
    <div className="space-y-3">
      <form onSubmit={e => { e.preventDefault(); if (title.trim()) create.mutate(title.trim()); }} className="flex gap-2">
        <input className={cn(inputCls, 'flex-1')} placeholder="Añadir tarea..." value={title} onChange={e => setTitle(e.target.value)} />
        <button type="submit" disabled={!title.trim() || create.isPending} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm transition-colors flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {tasks.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No hay tareas. Agrega la primera arriba.</p>
      ) : (
        <div className="space-y-1">
          {tasks.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 group">
              <button
                onClick={() => update.mutate({ id: t.id, data: { status: statusCycleMap[t.status] || 'pendiente' } })}
                className={cn('w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors',
                  t.status === 'completada' ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600 hover:border-blue-400'
                )}
              >
                {t.status === 'completada' && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className={cn('flex-1 text-sm', t.status === 'completada' ? 'line-through text-gray-400' : 'text-gray-700')}>
                {t.title}
              </span>
              <span className={cn('text-xs flex-shrink-0', statusColor[t.status] || 'text-gray-500')}>
                {t.status === 'en_progreso' ? 'En progreso' : t.status === 'completada' ? 'Completada' : 'Pendiente'}
              </span>
              <button onClick={() => del.mutate(t.id)} className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Checklist Tab ────────────────────────────────────────────────────────────

function ChecklistTab({ projectId }: { projectId: string }) {
  const [item, setItem] = useState('');
  const [category, setCategory] = useState('General');
  const qc = useQueryClient();
  const { data: items = [] } = useQuery<ChecklistItem[]>({
    queryKey: ['project-checklist', projectId],
    queryFn: () => api.get(`/projects/${projectId}/checklist`).then(r => r.data.data),
  });
  const add = useMutation({
    mutationFn: (d: { item: string; category: string }) => api.post(`/projects/${projectId}/checklist`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-checklist', projectId] }); setItem(''); },
  });
  const toggle = useMutation({
    mutationFn: (id: string) => api.patch(`/projects/${projectId}/checklist/${id}/toggle`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-checklist', projectId] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${projectId}/checklist/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-checklist', projectId] }),
  });

  const done = items.filter(i => i.isCompleted).length;
  const pct  = items.length ? Math.round((done / items.length) * 100) : 0;

  const grouped = items.reduce<Record<string, ChecklistItem[]>>((acc, i) => {
    (acc[i.category] = acc[i.category] || []).push(i);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Progress */}
      {items.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-medium text-gray-700">{done}/{items.length}</span>
          <span className="text-xs text-gray-400">{pct}% completado</span>
        </div>
      )}

      {/* Add form */}
      <form onSubmit={e => { e.preventDefault(); if (item.trim()) add.mutate({ item: item.trim(), category }); }} className="flex gap-2">
        <input
          className="flex-shrink-0 bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 w-32 focus:outline-none focus:border-blue-500"
          placeholder="Categoría"
          value={category}
          onChange={e => setCategory(e.target.value)}
        />
        <input className={cn(inputCls, 'flex-1')} placeholder="Nuevo ítem del checklist..." value={item} onChange={e => setItem(e.target.value)} />
        <button type="submit" disabled={!item.trim() || add.isPending} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm flex items-center gap-1.5 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {/* Groups */}
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} className="space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">{cat}</p>
          {catItems.map(ci => (
            <div key={ci.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 group">
              <button
                onClick={() => toggle.mutate(ci.id)}
                className={cn('w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors',
                  ci.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600 hover:border-emerald-400'
                )}
              >
                {ci.isCompleted && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className={cn('flex-1 text-sm', ci.isCompleted ? 'line-through text-gray-400' : 'text-gray-700')}>
                {ci.item}
              </span>
              {ci.isRequired && <span className="text-[10px] text-orange-400 flex-shrink-0">Requerido</span>}
              <button onClick={() => del.mutate(ci.id)} className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ))}

      {items.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Sin ítems en el checklist</p>}
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

const DOC_TYPES = ['OC', 'Contrato', 'Plano', 'Acta de entrega', 'Manual', 'Garantía', 'Factura', 'Foto', 'Otro'];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocIcon({ mime }: { mime: string | null }) {
  if (!mime) return <FileText className="w-5 h-5 text-gray-400" />;
  if (mime.startsWith('image/')) return <Image className="w-5 h-5 text-purple-500" />;
  if (mime === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
  if (mime.includes('word') || mime.includes('document')) return <FileText className="w-5 h-5 text-blue-600" />;
  if (mime.includes('excel') || mime.includes('sheet')) return <FileText className="w-5 h-5 text-green-600" />;
  if (mime.includes('presentation') || mime.includes('powerpoint')) return <FileText className="w-5 h-5 text-orange-500" />;
  return <File className="w-5 h-5 text-gray-500" />;
}

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api';

function DocumentsTab({ projectId }: { projectId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [form, setForm] = useState({ type: 'OC', name: '', fileUrl: '', notes: '' });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const qc = useQueryClient();

  const { data: docs = [] } = useQuery<ProjectDocument[]>({
    queryKey: ['project-docs', projectId],
    queryFn: () => api.get(`/projects/${projectId}/documents`).then(r => r.data.data),
  });

  const addUrl = useMutation({
    mutationFn: (d: typeof form) => api.post(`/projects/${projectId}/documents`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-docs', projectId] });
      setForm({ type: 'OC', name: '', fileUrl: '', notes: '' });
      setShowForm(false);
      toast.success('Documento agregado');
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${projectId}/documents/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-docs', projectId] }); toast.success('Documento eliminado'); },
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', form.type);
      fd.append('name', form.name || file.name);
      if (form.notes) fd.append('notes', form.notes);
      await api.post(`/projects/${projectId}/documents/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['project-docs', projectId] });
      setFile(null); setForm({ type: 'OC', name: '', fileUrl: '', notes: '' }); setShowForm(false);
      toast.success('Archivo subido');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Error al subir archivo');
    }
    setUploading(false);
  };

  const getDocUrl = (d: ProjectDocument) => {
    if (d.filePath) return `${API_BASE}/projects/uploads/${d.filePath}`;
    if (d.fileUrl) return d.fileUrl;
    return null;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); if (!form.name) setForm(prev => ({ ...prev, name: f.name })); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">{docs.length} documento{docs.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowForm(s => !s)} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Agregar documento
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          {/* Mode toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs w-fit">
            <button onClick={() => setMode('upload')} className={cn('px-3 py-1.5 flex items-center gap-1.5', mode === 'upload' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>
              <Upload className="w-3 h-3" /> Subir archivo
            </button>
            <button onClick={() => setMode('url')} className={cn('px-3 py-1.5 flex items-center gap-1.5', mode === 'url' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>
              <LinkIcon className="w-3 h-3" /> Enlace URL
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Tipo</label>
              <select className={inputCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">Nombre</label>
              <input className={inputCls} placeholder={file ? file.name : 'Nombre del documento'} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
          </div>

          {mode === 'upload' ? (
            <div
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={handleDrop}
              className={cn('border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors', drag ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300')}
            >
              <label className="cursor-pointer block">
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                    <DocIcon mime={file.type} />
                    <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                    <span className="text-gray-400 text-xs">({formatBytes(file.size)})</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-400">Arrastra un archivo o <span className="text-blue-500">haz clic para buscar</span></p>
                    <p className="text-xs text-gray-300 mt-0.5">PDF, Word, Excel, imagen — máx 20 MB</p>
                  </>
                )}
                <input type="file" className="hidden" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setFile(f); if (!form.name) setForm(prev => ({ ...prev, name: f.name })); }
                }} />
              </label>
            </div>
          ) : (
            <div>
              <label className="text-xs text-gray-400">URL del archivo</label>
              <input className={inputCls} placeholder="https://drive.google.com/..." value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400">Notas (opcional)</label>
            <input className={inputCls} placeholder="Descripción..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setFile(null); }} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancelar</button>
            <button
              onClick={mode === 'upload' ? handleUpload : () => { if (form.name.trim()) addUrl.mutate(form); }}
              disabled={mode === 'upload' ? !file || uploading : !form.name.trim() || addUrl.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs transition-colors"
            >
              {(uploading || addUrl.isPending) && <Loader2 className="w-3 h-3 animate-spin" />}
              {mode === 'upload' ? 'Subir' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {docs.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">Sin documentos agregados</p>
      ) : (
        <div className="space-y-2">
          {docs.map(d => {
            const url = getDocUrl(d);
            return (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl group">
                <div className="flex-shrink-0"><DocIcon mime={d.mimeType} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] bg-blue-500/20 text-blue-700 px-2 py-0.5 rounded-full">{d.type}</span>
                    <span className="text-sm text-gray-700 truncate">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {d.notes && <p className="text-xs text-gray-400 truncate">{d.notes}</p>}
                    {d.fileSize && <span className="text-xs text-gray-300">{formatBytes(d.fileSize)}</span>}
                  </div>
                </div>
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-700 transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                )}
                <button onClick={() => del.mutate(d.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Equipment Tab ────────────────────────────────────────────────────────────

function EquipmentTab({ projectId }: { projectId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ brand: '', model: '', sku: '', serialNumber: '', locationDetail: '', warrantyEnd: '', notes: '' });
  const qc = useQueryClient();
  const { data: equipment = [] } = useQuery<InstalledEquipment[]>({
    queryKey: ['project-equipment', projectId],
    queryFn: () => api.get(`/projects/${projectId}/equipment`).then(r => r.data.data),
  });
  const add = useMutation({
    mutationFn: (d: typeof form) => api.post(`/projects/${projectId}/equipment`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-equipment', projectId] }); setForm({ brand: '', model: '', sku: '', serialNumber: '', locationDetail: '', warrantyEnd: '', notes: '' }); setShowForm(false); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${projectId}/equipment/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-equipment', projectId] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">{equipment.length} equipo{equipment.length !== 1 ? 's' : ''} instalado{equipment.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowForm(s => !s)} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Registrar equipo
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-400">Marca</label><input className={inputCls} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-400">Modelo</label><input className={inputCls} value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-400">SKU</label><input className={inputCls} value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-400">Número de serie</label><input className={inputCls} value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-400">Ubicación</label><input className={inputCls} value={form.locationDetail} onChange={e => setForm(f => ({ ...f, locationDetail: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-400">Vence garantía</label><input type="date" className={inputCls} value={form.warrantyEnd} onChange={e => setForm(f => ({ ...f, warrantyEnd: e.target.value }))} /></div>
          </div>
          <div><label className="text-xs text-gray-400">Notas</label><input className={inputCls} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-500 px-3 py-1.5">Cancelar</button>
            <button onClick={() => add.mutate(form)} disabled={add.isPending} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs transition-colors">Guardar</button>
          </div>
        </div>
      )}

      {equipment.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">Sin equipos registrados</p>
      ) : (
        <div className="space-y-2">
          {equipment.map(eq => (
            <div key={eq.id} className="flex items-start gap-3 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl group">
              <Package className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 font-medium">{[eq.brand, eq.model].filter(Boolean).join(' ') || 'Equipo sin nombre'}</p>
                <div className="flex flex-wrap gap-3 mt-1">
                  {eq.sku && <span className="text-xs text-gray-400">SKU: {eq.sku}</span>}
                  {eq.serialNumber && <span className="text-xs text-gray-400">S/N: {eq.serialNumber}</span>}
                  {eq.locationDetail && <span className="text-xs text-gray-400">📍 {eq.locationDetail}</span>}
                  {eq.warrantyEnd && <span className="text-xs text-amber-400">Garantía hasta: {new Date(eq.warrantyEnd).toLocaleDateString('es-CL')}</span>}
                </div>
              </div>
              <button onClick={() => del.mutate(eq.id)} className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Logs Tab (Bitácora) ──────────────────────────────────────────────────────

const LOG_ICON: Record<string, string> = {
  status_change: '🔄', comment: '💬', event: '📌', document: '📄',
};

function LogsTab({ projectId }: { projectId: string }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc]   = useState('');
  const qc = useQueryClient();
  const { data: logs = [] } = useQuery<ProjectLog[]>({
    queryKey: ['project-logs', projectId],
    queryFn: () => api.get(`/projects/${projectId}/logs`).then(r => r.data.data),
  });
  const add = useMutation({
    mutationFn: (d: { title: string; description: string }) => api.post(`/projects/${projectId}/logs`, { ...d, type: 'comment' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-logs', projectId] }); setTitle(''); setDesc(''); },
  });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <input className={inputCls} placeholder="Título de la nota..." value={title} onChange={e => setTitle(e.target.value)} />
        <textarea className={cn(inputCls, 'h-16 resize-none')} placeholder="Detalle (opcional)..." value={desc} onChange={e => setDesc(e.target.value)} />
        <div className="flex justify-end">
          <button onClick={() => { if (title.trim()) add.mutate({ title: title.trim(), description: desc.trim() }); }} disabled={!title.trim() || add.isPending} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm transition-colors">
            Agregar nota
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {[...logs].reverse().map(log => (
          <div key={log.id} className="flex gap-3 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
            <span className="text-base flex-shrink-0 mt-0.5">{LOG_ICON[log.type] || '📝'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-800 font-medium">{log.title}</span>
                {log.oldValue && log.newValue && (
                  <span className="text-xs text-gray-400">{STATUS_LABELS[log.oldValue] || log.oldValue} → {STATUS_LABELS[log.newValue] || log.newValue}</span>
                )}
              </div>
              {log.description && <p className="text-xs text-gray-500 mt-1">{log.description}</p>}
              <div className="flex items-center gap-2 mt-1.5">
                {log.userName && <span className="text-[11px] text-gray-700 flex items-center gap-1"><User className="w-3 h-3" />{log.userName}</span>}
                <span className="text-[11px] text-gray-700 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(log.createdAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>
          </div>
        ))}
        {logs.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Sin entradas en la bitácora</p>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('general');

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  const qc = useQueryClient();
  const delMut = useMutation({
    mutationFn: () => api.delete(`/projects/${id}`),
    onSuccess: () => { toast.success('Proyecto eliminado'); qc.invalidateQueries({ queryKey: ['projects'] }); navigate('/operations/projects'); },
    onError: () => toast.error('Error al eliminar'),
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">Cargando proyecto...</div>;
  if (!project) return <div className="p-8 text-center text-gray-500">Proyecto no encontrado</div>;

  const checkPct = project.checklistTotal ? Math.round(((project.checklistDone ?? 0) / project.checklistTotal) * 100) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-gray-200 space-y-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Link to="/operations/projects" className="hover:text-gray-500 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Proyectos
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-500">{project.code}</span>
        </div>

        {/* Title row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs font-mono text-blue-400">{project.code}</span>
              {project.clientName && <span className="text-xs text-gray-400">{project.clientName}</span>}
              {project.city && <span className="text-xs text-gray-700">{project.city}</span>}
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', PRIORITY_COLORS[project.priority] || '')}>
                {PRIORITY_LABELS[project.priority]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusChanger project={project} />
            <button
              onClick={() => { if (confirm('¿Eliminar este proyecto?')) delMut.mutate(); }}
              className="p-1.5 text-gray-700 hover:text-red-400 transition-colors"
              title="Eliminar proyecto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bars */}
        {(checkPct !== null || (project.taskCount ?? 0) > 0) && (
          <div className="flex items-center gap-6 text-xs text-gray-400">
            {checkPct !== null && (
              <div className="flex items-center gap-2">
                <span>Checklist {project.checklistDone}/{project.checklistTotal}</span>
                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${checkPct}%` }} />
                </div>
              </div>
            )}
            {(project.taskCount ?? 0) > 0 && (
              <span>Tareas {project.completedTaskCount}/{project.taskCount}</span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-6 flex gap-1 border-b border-gray-200">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setTab(tid)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors',
              tab === tid
                ? 'text-blue-400 border-blue-500'
                : 'text-gray-400 border-transparent hover:text-gray-500 hover:border-gray-700'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'general'   && <GeneralTab project={project} />}
        {tab === 'tasks'     && <TasksTab projectId={project.id} />}
        {tab === 'checklist' && <ChecklistTab projectId={project.id} />}
        {tab === 'documents' && <DocumentsTab projectId={project.id} />}
        {tab === 'equipment' && <EquipmentTab projectId={project.id} />}
        {tab === 'logs'      && <LogsTab projectId={project.id} />}
      </div>
    </div>
  );
}
