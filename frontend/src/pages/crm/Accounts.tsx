import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, MoreVertical, Trash2, Globe, Users, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { accountsService } from '@/services/crm.service';
import { Account } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate, formatCurrency } from '@/utils/helpers';

const INDUSTRIES = ['Tecnología', 'Manufactura', 'Salud', 'Educación', 'Retail', 'Finanzas', 'Consultoría', 'Otro'];

function AccountForm({ initial, onSave, onCancel }: {
  initial?: Partial<Account>;
  onSave: (d: Partial<Account>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Account>>({
    name: '', email: '', phone: '', website: '', industry: '',
    city: '', country: '', notes: '',
    ...initial,
  });
  const set = (k: keyof Account, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <Input label="Nombre de la empresa *" value={form.name || ''} onChange={e => set('name', e.target.value)} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Email" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
        <Input label="Teléfono" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Sitio Web" value={form.website || ''} onChange={e => set('website', e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Industria</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.industry || ''} onChange={e => set('industry', e.target.value)}>
            <option value="">Seleccionar...</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Ciudad" value={form.city || ''} onChange={e => set('city', e.target.value)} />
        <Input label="País" value={form.country || ''} onChange={e => set('country', e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => { if (!form.name?.trim()) { toast.error('El nombre es requerido'); return; } onSave(form); }}>
          {initial?.id ? 'Guardar cambios' : 'Crear Cuenta'}
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

export function Accounts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dSearch, setDSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', dSearch],
    queryFn: () => accountsService.getAll({ search: dSearch || undefined, limit: 100 }),
  });

  const createMut = useMutation({
    mutationFn: accountsService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setShowCreate(false); toast.success('Cuenta creada'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Account> }) => accountsService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setEditing(null); toast.success('Cuenta actualizada'); },
  });
  const deleteMut = useMutation({
    mutationFn: accountsService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); toast.success('Cuenta eliminada'); },
  });

  const accounts = data?.accounts || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuentas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{accounts.length} empresas</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
          Nueva Cuenta
        </Button>
      </div>

      <div className="flex-1 max-w-xs">
        <Input leftAddon={<Search className="w-4 h-4 text-gray-400" />} placeholder="Buscar cuentas..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card padding="none" className="overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-gray-400">Cargando...</div>
        ) : accounts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-400 text-sm">No hay cuentas. Crea la primera.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Industria</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contactos</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Oportunidades</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ubicación</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Responsable</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Creado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Briefcase className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{a.name}</p>
                          {a.website && (
                            <a href={a.website.startsWith('http') ? a.website : `https://${a.website}`}
                              target="_blank" rel="noreferrer"
                              className="text-xs text-primary-600 flex items-center gap-1 hover:underline"
                              onClick={e => e.stopPropagation()}>
                              <Globe className="w-3 h-3" />{a.website}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.industry || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Users className="w-3.5 h-3.5 text-gray-400" />{a.contactCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.oppCount}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {[a.city, a.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {a.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={`${a.assignee.firstName} ${a.assignee.lastName}`} size="xs" />
                          <span className="text-gray-600">{a.assignee.firstName}</span>
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(a.createdAt)}</td>
                    <td className="px-4 py-3">
                      <RowMenu onEdit={() => setEditing(a)} onDelete={() => { if (confirm('¿Eliminar cuenta?')) deleteMut.mutate(a.id); }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva Cuenta" size="lg">
        <AccountForm onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Editar Cuenta" size="lg">
        {editing && <AccountForm initial={editing} onSave={d => updateMut.mutate({ id: editing.id, data: d })} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
