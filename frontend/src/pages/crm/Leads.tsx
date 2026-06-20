import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Plus, Search, Filter, LayoutGrid, List, Star, MoreVertical, UserCheck, Trash2, X, Telescope, ExternalLink, CheckSquare, Square, Loader2, Upload, Download, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { leadsService, apolloService } from '@/services/crm.service';
import { usersService } from '@/services/users.service';
import { Lead, ApolloContact } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { formatDate, LEAD_STATUS, LEAD_SOURCES, cn } from '@/utils/helpers';
import { useAuthStore } from '@/store/authStore';

const STATUS_BADGE: Record<string, 'default' | 'info' | 'purple' | 'success' | 'warning' | 'danger'> = {
  new: 'info',
  contacted: 'purple',
  qualified: 'success',
  unqualified: 'default',
  converted: 'success',
};

const STATUSES = ['new', 'contacted', 'qualified', 'unqualified', 'converted'];
const SOURCES = ['web', 'referral', 'social', 'cold_call', 'event', 'other'];

// ─── Lead Form ────────────────────────────────────────────────────

function LeadForm({ initial, onSave, onCancel }: {
  initial?: Partial<Lead> & { assigneeId?: string };
  onSave: (data: Partial<Lead> & { assigneeId?: string }) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Lead> & { assigneeId?: string }>({
    firstName: '', lastName: '', email: '', phone: '', company: '',
    position: '', source: 'web', status: 'new', score: 0, notes: '',
    assigneeId: initial?.assignee?.id || '',
    ...initial,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersService.getAll({ limit: 100 }),
  });
  const users = (usersData?.data as { id: string; firstName: string; lastName: string }[]) || [];

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const selectClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nombre *" value={form.firstName || ''} onChange={e => set('firstName', e.target.value)} />
        <Input label="Apellido" value={form.lastName || ''} onChange={e => set('lastName', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Email" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
        <Input label="Teléfono" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Empresa" value={form.company || ''} onChange={e => set('company', e.target.value)} />
        <Input label="Cargo" value={form.position || ''} onChange={e => set('position', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fuente</label>
          <select className={selectClass} value={form.source || 'web'} onChange={e => set('source', e.target.value)}>
            {SOURCES.map(s => <option key={s} value={s}>{LEAD_SOURCES[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select className={selectClass} value={form.status || 'new'} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{LEAD_STATUS[s]?.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
          <select className={selectClass} value={form.assigneeId || ''} onChange={e => set('assigneeId', e.target.value)}>
            <option value="">— Sin asignar —</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Score (0-100)</label>
          <input type="number" min={0} max={100} className={selectClass}
            value={form.score ?? 0} onChange={e => set('score', Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => { if (!form.firstName?.trim()) { toast.error('El nombre es requerido'); return; } onSave(form); }}>
          {initial?.id ? 'Guardar cambios' : 'Crear Lead'}
        </Button>
      </div>
    </div>
  );
}

// ─── Score Badge ──────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-gray-400';
  return (
    <span className={cn('flex items-center gap-1 text-sm font-semibold', color)}>
      <Star className="w-3.5 h-3.5" fill="currentColor" />
      {score}
    </span>
  );
}

// ─── Row Menu ─────────────────────────────────────────────────────

function RowMenu({ lead, onEdit, onConvert, onDelete }: {
  lead: Lead;
  onEdit: () => void;
  onConvert: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} className="p-1 rounded hover:bg-gray-100">
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-20 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
            <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50" onClick={() => { setOpen(false); onEdit(); }}>Editar</button>
            {lead.status !== 'converted' && (
              <button className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                onClick={() => { setOpen(false); onConvert(); }}>
                <UserCheck className="w-3.5 h-3.5" /> Convertir lead
              </button>
            )}
            <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              onClick={() => { setOpen(false); onDelete(); }}>
              <Trash2 className="w-3.5 h-3.5" /> Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────

function KanbanCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <div onClick={onClick} className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-1">
        <p className="text-sm font-medium text-gray-900 leading-tight">
          {lead.firstName} {lead.lastName}
        </p>
        <ScoreBadge score={lead.score} />
      </div>
      {lead.company && <p className="text-xs text-gray-500 mb-2">{lead.company}</p>}
      {lead.email && <p className="text-xs text-gray-400 truncate">{lead.email}</p>}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">{lead.source ? LEAD_SOURCES[lead.source] : '—'}</span>
        {lead.assignee && (
          <Avatar name={`${lead.assignee.firstName} ${lead.assignee.lastName}`} size="xs" />
        )}
      </div>
    </div>
  );
}

// ─── Apollo Search Modal ──────────────────────────────────────────

function ApolloSearchModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [form, setForm] = useState({ name: '', title: '', organization: '', location: '' });
  const [results, setResults] = useState<ApolloContact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searched, setSearched] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSearch = async (p = 1) => {
    setSearching(true);
    setSearched(true);
    setPage(p);
    try {
      const res = await apolloService.search({ ...form, page: p, perPage: 25 });
      setResults(res.contacts);
      setTotal(res.total);
      if (p === 1) setSelected(new Set());
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Error al buscar en Apollo');
    } finally {
      setSearching(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map(c => c.id)));
    }
  };

  const handleImport = async () => {
    const toImport = results.filter(c => selected.has(c.id));
    if (!toImport.length) return;
    setImporting(true);
    try {
      const res = await apolloService.import(toImport);
      toast.success(res.message || `${res.data?.imported ?? toImport.length} prospectos importados`);
      onImported();
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Error al importar');
    } finally {
      setImporting(false);
    }
  };

  const totalPages = Math.ceil(total / 25);

  return (
    <div className="space-y-5">
      {/* Search form */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Nombre" placeholder="Ej: Carlos García" value={form.name} onChange={e => set('name', e.target.value)} />
        <Input label="Cargo" placeholder="Ej: Director de Ventas" value={form.title} onChange={e => set('title', e.target.value)} />
        <Input label="Empresa" placeholder="Ej: Grupo Lala" value={form.organization} onChange={e => set('organization', e.target.value)} />
        <Input label="Ubicación" placeholder="Ej: México" value={form.location} onChange={e => set('location', e.target.value)} />
      </div>
      <div className="flex justify-end">
        <Button
          leftIcon={searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          onClick={() => handleSearch(1)}
          loading={searching}
          disabled={!form.name && !form.title && !form.organization && !form.location}
        >
          Buscar en Apollo
        </Button>
      </div>

      {/* Results */}
      {searched && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">
              {searching ? 'Buscando...' : `${total.toLocaleString()} resultados encontrados`}
            </p>
            {results.length > 0 && (
              <button onClick={toggleAll} className="text-xs text-primary-600 hover:underline">
                {selected.size === results.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>
            )}
          </div>

          {searching ? (
            <div className="py-12 text-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Consultando Apollo...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <Telescope className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sin resultados. Intenta con otros filtros.</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-y-auto max-h-72 divide-y divide-gray-100">
                {results.map(c => (
                  <div
                    key={c.id}
                    onClick={() => toggleSelect(c.id)}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
                      selected.has(c.id) ? 'bg-primary-50' : 'hover:bg-gray-50',
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0 text-primary-500">
                      {selected.has(c.id)
                        ? <CheckSquare className="w-4 h-4" />
                        : <Square className="w-4 h-4 text-gray-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">
                          {c.firstName} {c.lastName}
                        </p>
                        {c.title && <span className="text-xs text-gray-500">{c.title}</span>}
                        {c.organization && (
                          <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                            {c.organization}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {c.email && <span className="text-xs text-gray-400">{c.email}</span>}
                        {c.city && <span className="text-xs text-gray-400">{c.city}{c.country ? `, ${c.country}` : ''}</span>}
                        {c.linkedinUrl && (
                          <a
                            href={c.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-xs text-blue-500 hover:underline flex items-center gap-0.5"
                          >
                            LinkedIn <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50">
                  <button
                    disabled={page <= 1 || searching}
                    onClick={() => handleSearch(page - 1)}
                    className="text-xs text-primary-600 disabled:text-gray-300 hover:underline"
                  >
                    ← Anterior
                  </button>
                  <span className="text-xs text-gray-500">Pág. {page} de {totalPages}</span>
                  <button
                    disabled={page >= totalPages || searching}
                    onClick={() => handleSearch(page + 1)}
                    className="text-xs text-primary-600 disabled:text-gray-300 hover:underline"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          )}

          {selected.size > 0 && (
            <div className="flex items-center justify-between mt-3 p-3 bg-primary-50 border border-primary-100 rounded-xl">
              <p className="text-sm text-primary-800 font-medium">
                {selected.size} prospecto{selected.size > 1 ? 's' : ''} seleccionado{selected.size > 1 ? 's' : ''}
              </p>
              <Button
                size="sm"
                loading={importing}
                leftIcon={<UserCheck className="w-4 h-4" />}
                onClick={handleImport}
              >
                Importar y asignar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<string[][]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; duplicates: number; errors: { row: number; message: string }[] } | null>(null);

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersService.getAll({ limit: 100 }),
  });
  const users = (usersData?.data as { id: string; firstName: string; lastName: string }[]) || [];

  const handleFile = (f: File) => {
    const isXlsx = f.name.endsWith('.xlsx') || f.name.endsWith('.xls');
    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = e => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(ws);
        setCsvText(csv);
        const lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
        setPreview(lines.slice(0, 6).map(l => l.split(',').map(c => c.replace(/^"|"$/g, ''))));
      };
      reader.readAsArrayBuffer(f);
    } else {
      const reader = new FileReader();
      reader.onload = e => {
        const text = e.target?.result as string;
        setCsvText(text);
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
        setPreview(lines.slice(0, 6).map(l => l.split(',').map(c => c.replace(/^"|"$/g, ''))));
      };
      reader.readAsText(f, 'UTF-8');
    }
  };

  const handleImport = async () => {
    if (!csvText) return;
    setLoading(true);
    try {
      const r = await leadsService.import(csvText, assigneeId || undefined);
      setResult(r);
      onImported();
    } catch {
      toast.error('Error al importar');
    }
    setLoading(false);
  };

  const downloadTemplate = () => {
    const template = 'nombre,apellido,email,telefono,empresa,cargo,fuente,estado,puntuacion,notas\nMaría,López,maria@emp.com,+56987654321,Empresa SA,Directora,referral,new,75,\n';
    const blob = new Blob(['﻿' + template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'plantilla_leads.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const selectClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

  return (
    <div className="space-y-4">
      {/* Assignee — always visible first */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Asignar ejecutivo (opcional)</label>
        <select className={selectClass} value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
          <option value="">— Sin asignar —</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">Todos los leads importados quedarán asignados a este ejecutivo.</p>
      </div>

      {/* Template + File */}
      <div className="flex items-center gap-3">
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 text-sm text-primary-600 border border-primary-300 rounded-lg px-3 py-2 hover:bg-primary-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Descargar plantilla
        </button>
        <label className="flex-1 flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
          <Upload className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {csvText ? 'Archivo cargado — haz clic para cambiar' : 'Seleccionar archivo .csv o .xlsx (Excel)'}
          </span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          />
        </label>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {preview[0]?.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.slice(1).map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-gray-600 whitespace-nowrap max-w-[120px] truncate">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {preview.length >= 6 && (
            <p className="text-xs text-gray-400 px-3 py-1.5 border-t border-gray-100">Mostrando primeras 5 filas...</p>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-lg border border-gray-200 p-4 space-y-2">
          <p className="text-sm font-medium text-gray-800">
            {result.imported > 0 && <span className="text-green-600">Importados: {result.imported}. </span>}
            {result.duplicates > 0 && <span className="text-yellow-600">Duplicados omitidos: {result.duplicates}. </span>}
            {result.imported === 0 && result.duplicates === 0 && result.errors.length === 0 && <span className="text-gray-500">Sin filas para procesar.</span>}
          </p>
          {result.errors.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1">
              <p className="text-xs font-medium text-red-600">Errores ({result.errors.length}):</p>
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-500">Fila {err.row}: {err.message}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-1">
        <Button variant="outline" onClick={onClose}>Cerrar</Button>
        {!result && (
          <Button onClick={handleImport} loading={loading} disabled={!csvText}>
            Importar
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export function Leads() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [showApollo, setShowApollo] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [myOnly, setMyOnly] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleExport = async () => {
    try {
      const blob = await leadsService.export();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'leads.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al exportar leads');
    }
  };

  // Check if current user can use Apollo search
  const { data: apolloPerm } = useQuery({
    queryKey: ['apollo-permission'],
    queryFn: apolloService.checkPermission,
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['leads', debouncedSearch, statusFilter, myOnly],
    queryFn: () => leadsService.getAll({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      limit: 100,
      assigneeId: myOnly ? user?.id : undefined,
    }),
  });

  const { data: stats } = useQuery({ queryKey: ['lead-stats'], queryFn: leadsService.getStats });

  const createMut = useMutation({
    mutationFn: leadsService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); qc.invalidateQueries({ queryKey: ['lead-stats'] }); setShowCreate(false); toast.success('Lead creado'); },
    onError: () => toast.error('Error al crear el lead'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) => leadsService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); setEditing(null); toast.success('Lead actualizado'); },
  });

  const convertMut = useMutation({
    mutationFn: leadsService.convert,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); qc.invalidateQueries({ queryKey: ['lead-stats'] }); toast.success('Lead convertido'); },
  });

  const deleteMut = useMutation({
    mutationFn: leadsService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); qc.invalidateQueries({ queryKey: ['lead-stats'] }); toast.success('Lead eliminado'); },
  });

  const leads = data?.leads || [];

  const toggleAll = () => {
    if (selected.size === leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map(l => l.id)));
    }
  };
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selected.size} lead(s) seleccionado(s)?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selected].map(id => leadsService.delete(id)));
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-stats'] });
      setSelected(new Set());
      toast.success(`${selected.size} lead(s) eliminado(s)`);
    } catch {
      toast.error('Error al eliminar algunos leads');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Group by status for kanban
  const kanbanCols = STATUSES.filter(s => s !== 'converted').map(status => ({
    status,
    label: LEAD_STATUS[status]?.label || status,
    leads: leads.filter(l => l.status === status),
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats?.total ?? 0} leads · {stats?.qualified ?? 0} calificados · {stats?.converted ?? 0} convertidos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {apolloPerm?.allowed && apolloPerm?.hasApiKey && (
            <Button
              variant="outline"
              leftIcon={<Telescope className="w-4 h-4" />}
              onClick={() => setShowApollo(true)}
            >
              Buscar Prospectos
            </Button>
          )}
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport}>
            Exportar
          </Button>
          <Button variant="outline" leftIcon={<Upload className="w-4 h-4" />} onClick={() => setShowImport(true)}>
            Importar
          </Button>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
            Nuevo Lead
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-5 gap-3">
          {STATUSES.map(s => (
            <button key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={cn('rounded-xl border p-3 text-center transition-colors cursor-pointer',
                statusFilter === s ? 'border-primary-500 bg-primary-50' : 'bg-white border-gray-200 hover:border-gray-300')}>
              <p className="text-2xl font-bold text-gray-900">{stats[s as keyof typeof stats]}</p>
              <p className="text-xs text-gray-500 mt-0.5">{LEAD_STATUS[s]?.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-xs">
          <Input
            leftAddon={<Search className="w-4 h-4 text-gray-400" />}
            placeholder="Buscar leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {statusFilter && (
          <button onClick={() => setStatusFilter('')} className="flex items-center gap-1 text-sm text-primary-600 border border-primary-300 bg-primary-50 rounded-lg px-3 py-2">
            <Filter className="w-3.5 h-3.5" />
            {LEAD_STATUS[statusFilter]?.label}
            <X className="w-3.5 h-3.5 ml-1" />
          </button>
        )}
        <button
          onClick={() => setMyOnly(o => !o)}
          className={cn(
            'flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 transition-colors',
            myOnly
              ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
              : 'border-gray-300 text-gray-600 hover:border-gray-400',
          )}
        >
          <User className="w-3.5 h-3.5" />
          Mis leads
        </button>
        <div className="ml-auto flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-white">
          <button onClick={() => setView('table')} className={cn('p-1.5 rounded', view === 'table' ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:text-gray-600')}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setView('kanban')} className={cn('p-1.5 rounded', view === 'kanban' ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:text-gray-600')}>
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table View */}
      {view === 'table' && (
        <Card padding="none" className="overflow-hidden">
          {selected.size > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-100">
              <span className="text-sm font-medium text-blue-800">
                {selected.size} lead{selected.size > 1 ? 's' : ''} seleccionado{selected.size > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(new Set())} className="text-xs text-blue-600 hover:underline px-2 py-1">
                  Cancelar
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {bulkDeleting ? 'Eliminando...' : 'Eliminar seleccionados'}
                </button>
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="py-20 text-center text-gray-400">Cargando...</div>
          ) : leads.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-gray-400 text-sm">No hay leads. Crea el primero.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox" className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                        checked={leads.length > 0 && selected.size === leads.length}
                        onChange={toggleAll} />
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Fuente</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Responsable</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Creado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map(lead => (
                    <tr key={lead.id} className={`hover:bg-gray-50 transition-colors ${selected.has(lead.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                          checked={selected.has(lead.id)}
                          onChange={() => toggleOne(lead.id)} />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{lead.firstName} {lead.lastName}</p>
                          {lead.email && <p className="text-xs text-gray-400">{lead.email}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{lead.company || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE[lead.status] || 'default'}>
                          {LEAD_STATUS[lead.status]?.label || lead.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{lead.source ? LEAD_SOURCES[lead.source] : '—'}</td>
                      <td className="px-4 py-3"><ScoreBadge score={lead.score} /></td>
                      <td className="px-4 py-3">
                        {lead.assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={`${lead.assignee.firstName} ${lead.assignee.lastName}`} size="xs" />
                            <span className="text-gray-600">{lead.assignee.firstName}</span>
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(lead.createdAt)}</td>
                      <td className="px-4 py-3">
                        <RowMenu
                          lead={lead}
                          onEdit={() => setEditing(lead)}
                          onConvert={() => convertMut.mutate(lead.id)}
                          onDelete={() => { if (confirm('¿Eliminar este lead?')) deleteMut.mutate(lead.id); }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanCols.map(col => (
            <div key={col.status} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{col.leads.length}</span>
                </div>
              </div>
              <div className="space-y-2">
                {col.leads.map(lead => (
                  <KanbanCard key={lead.id} lead={lead} onClick={() => setEditing(lead)} />
                ))}
                {col.leads.length === 0 && (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg py-8 text-center">
                    <p className="text-xs text-gray-400">Sin leads</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Lead" size="lg">
        <LeadForm
          onSave={data => createMut.mutate(data)}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Editar Lead" size="lg">
        {editing && (
          <LeadForm
            initial={editing}
            onSave={data => updateMut.mutate({ id: editing.id, data })}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      {/* Apollo Prospect Search Modal */}
      <Modal isOpen={showApollo} onClose={() => setShowApollo(false)} title="Buscar Prospectos en Apollo" size="xl">
        <ApolloSearchModal
          onClose={() => setShowApollo(false)}
          onImported={() => {
            qc.invalidateQueries({ queryKey: ['leads'] });
            qc.invalidateQueries({ queryKey: ['lead-stats'] });
          }}
        />
      </Modal>

      {/* CSV Import Modal */}
      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="Importar Leads" size="lg">
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            qc.invalidateQueries({ queryKey: ['leads'] });
            qc.invalidateQueries({ queryKey: ['lead-stats'] });
          }}
        />
      </Modal>
    </div>
  );
}
