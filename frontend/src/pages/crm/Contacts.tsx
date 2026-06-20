import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Plus, Search, MoreVertical, Trash2, Building2, Mail, Phone, Upload, Download, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { contactsService } from '@/services/crm.service';
import { usersService } from '@/services/users.service';
import { Contact } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { formatDate, LEAD_SOURCES, cn } from '@/utils/helpers';
import { useAuthStore } from '@/store/authStore';

const SOURCES = ['web', 'referral', 'social', 'cold_call', 'event', 'other'];

function ContactForm({ initial, onSave, onCancel }: {
  initial?: Partial<Contact>;
  onSave: (d: Partial<Contact>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Contact>>({
    firstName: '', lastName: '', email: '', phone: '', mobile: '',
    position: '', department: '', source: 'web', notes: '',
    ...initial,
  });
  const set = (k: keyof Contact, v: unknown) => setForm(f => ({ ...f, [k]: v }));

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
        <Input label="Cargo" value={form.position || ''} onChange={e => set('position', e.target.value)} />
        <Input label="Departamento" value={form.department || ''} onChange={e => set('department', e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fuente</label>
        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={form.source || 'web'} onChange={e => set('source', e.target.value)}>
          {SOURCES.map(s => <option key={s} value={s}>{LEAD_SOURCES[s]}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => { if (!form.firstName?.trim()) { toast.error('El nombre es requerido'); return; } onSave(form); }}>
          {initial?.id ? 'Guardar cambios' : 'Crear Contacto'}
        </Button>
      </div>
    </div>
  );
}

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} className="p-1 rounded hover:bg-gray-100">
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-20 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
            <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50" onClick={() => { setOpen(false); onEdit(); }}>Editar</button>
            <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2" onClick={() => { setOpen(false); onDelete(); }}>
              <Trash2 className="w-3.5 h-3.5" /> Eliminar
            </button>
          </div>
        </>
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
      const r = await contactsService.import(csvText, assigneeId || undefined);
      setResult(r);
      onImported();
    } catch {
      toast.error('Error al importar');
    }
    setLoading(false);
  };

  const downloadTemplate = () => {
    const template = 'nombre,apellido,email,telefono,movil,cargo,departamento,fuente,notas\nJuan,García,juan@empresa.com,+56912345678,,Gerente,Ventas,web,\n';
    const blob = new Blob(['﻿' + template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'plantilla_contactos.csv'; a.click();
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
        <p className="text-xs text-gray-400 mt-1">Todos los contactos importados quedarán asignados a este ejecutivo.</p>
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

export function Contacts() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [dSearch, setDSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [myOnly, setMyOnly] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleExport = async () => {
    try {
      const blob = await contactsService.export();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'contactos.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al exportar contactos');
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', dSearch, myOnly],
    queryFn: () => contactsService.getAll({
      search: dSearch || undefined,
      limit: 100,
      assigneeId: myOnly ? user?.id : undefined,
    }),
  });

  const createMut = useMutation({
    mutationFn: contactsService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); setShowCreate(false); toast.success('Contacto creado'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contact> }) => contactsService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); setEditing(null); toast.success('Contacto actualizado'); },
  });
  const deleteMut = useMutation({
    mutationFn: contactsService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); toast.success('Contacto eliminado'); },
  });

  const contacts = data?.contacts || [];

  const toggleAll = () => {
    if (selected.size === contacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contacts.map(c => c.id)));
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
    if (!confirm(`¿Eliminar ${selected.size} contacto(s) seleccionado(s)?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selected].map(id => contactsService.delete(id)));
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setSelected(new Set());
      toast.success(`${selected.size} contacto(s) eliminado(s)`);
    } catch {
      toast.error('Error al eliminar algunos contactos');
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{contacts.length} contactos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport}>
            Exportar
          </Button>
          <Button variant="outline" leftIcon={<Upload className="w-4 h-4" />} onClick={() => setShowImport(true)}>
            Importar
          </Button>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
            Nuevo Contacto
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-xs">
          <Input leftAddon={<Search className="w-4 h-4 text-gray-400" />} placeholder="Buscar contactos..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
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
          Mis contactos
        </button>
      </div>

      <Card padding="none" className="overflow-hidden">
        {selected.size > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-100">
            <span className="text-sm font-medium text-blue-800">
              {selected.size} contacto{selected.size > 1 ? 's' : ''} seleccionado{selected.size > 1 ? 's' : ''}
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
        ) : contacts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-400 text-sm">No hay contactos. Crea el primero.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <input type="checkbox" className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                      checked={contacts.length > 0 && selected.size === contacts.length}
                      onChange={toggleAll} />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contacto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cargo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cuenta</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fuente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Responsable</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Creado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map(c => (
                  <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${selected.has(c.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                        checked={selected.has(c.id)}
                        onChange={() => toggleOne(c.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${c.firstName} ${c.lastName || ""}`} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                          {c.email && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" />{c.email}
                            </p>
                          )}
                          {c.phone && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" />{c.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-gray-700">{c.position || '—'}</p>
                        {c.department && <p className="text-xs text-gray-400">{c.department}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.accountName ? (
                        <span className="flex items-center gap-1 text-gray-600">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          {c.accountName}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.source ? LEAD_SOURCES[c.source] : '—'}</td>
                    <td className="px-4 py-3">
                      {c.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={`${c.assignee.firstName} ${c.assignee.lastName}`} size="xs" />
                          <span className="text-gray-600">{c.assignee.firstName}</span>
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <RowMenu onEdit={() => setEditing(c)} onDelete={() => { if (confirm('¿Eliminar contacto?')) deleteMut.mutate(c.id); }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Contacto" size="lg">
        <ContactForm onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Editar Contacto" size="lg">
        {editing && <ContactForm initial={editing} onSave={d => updateMut.mutate({ id: editing.id, data: d })} onCancel={() => setEditing(null)} />}
      </Modal>
      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="Importar Contactos" size="lg">
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => qc.invalidateQueries({ queryKey: ['contacts'] })}
        />
      </Modal>
    </div>
  );
}
