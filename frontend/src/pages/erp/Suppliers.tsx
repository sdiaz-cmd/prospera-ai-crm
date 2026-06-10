import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Trash2, Edit2, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { suppliersService } from '@/services/crm.service';
import { Supplier } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';

function SupplierForm({ initial, onSave, onCancel }: { initial?: Partial<Supplier>; onSave: (d: Partial<Supplier>) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Partial<Supplier>>({ name: '', contactName: '', email: '', phone: '', city: '', country: 'México', notes: '', ...initial });
  const set = (k: keyof Supplier, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><Input label="Nombre del proveedor *" value={form.name || ''} onChange={e => set('name', e.target.value)} /></div>
        <Input label="Persona de contacto" value={form.contactName || ''} onChange={e => set('contactName', e.target.value)} />
        <Input label="Email" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
        <Input label="Teléfono" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
        <Input label="Sitio web" value={form.website || ''} onChange={e => set('website', e.target.value)} />
        <Input label="Ciudad" value={form.city || ''} onChange={e => set('city', e.target.value)} />
        <Input label="País" value={form.country || ''} onChange={e => set('country', e.target.value)} />
        <div className="col-span-2"><Input label="RFC / Tax ID" value={form.taxId || ''} onChange={e => set('taxId', e.target.value)} /></div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => { if (!form.name?.trim()) { toast.error('El nombre es requerido'); return; } onSave(form); }}>
          {initial?.id ? 'Guardar' : 'Crear Proveedor'}
        </Button>
      </div>
    </div>
  );
}

export function Suppliers() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => suppliersService.getAll({ search: search || undefined, limit: 50 }),
  });

  const inv = () => qc.invalidateQueries({ queryKey: ['suppliers'] });
  const createMut = useMutation({ mutationFn: suppliersService.create, onSuccess: () => { inv(); setShowCreate(false); toast.success('Proveedor creado'); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) => suppliersService.update(id, data), onSuccess: () => { inv(); setEditing(null); toast.success('Proveedor actualizado'); } });
  const deleteMut = useMutation({ mutationFn: suppliersService.delete, onSuccess: () => { inv(); toast.success('Proveedor eliminado'); } });

  const suppliers = data?.suppliers || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-sm text-gray-500 mt-0.5">{suppliers.length} proveedores registrados</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>Nuevo Proveedor</Button>
      </div>

      <div className="max-w-sm">
        <Input placeholder="Buscar proveedor..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-gray-400">Cargando proveedores...</div>
      ) : suppliers.length === 0 ? (
        <Card className="py-20 text-center">
          <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Sin proveedores registrados</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map(s => (
            <Card key={s.id} className="relative group">
              <div className="flex items-start gap-3">
                <Avatar name={s.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{s.name}</p>
                  {s.contactName && <p className="text-sm text-gray-500">{s.contactName}</p>}
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {s.email && <a href={`mailto:${s.email}`} className="text-xs text-primary-600 hover:underline">{s.email}</a>}
                    {s.phone && <span className="text-xs text-gray-400">{s.phone}</span>}
                  </div>
                  {(s.city || s.country) && <p className="text-xs text-gray-400 mt-0.5">{[s.city, s.country].filter(Boolean).join(', ')}</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="flex items-center gap-1 text-xs text-gray-400 mr-2">
                    <Package className="w-3 h-3" /> {s.productCount}
                  </span>
                  <button onClick={() => setEditing(s)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (confirm('¿Eliminar proveedor?')) deleteMut.mutate(s.id); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {s.notes && <p className="text-xs text-gray-400 mt-2 border-t border-gray-50 pt-2 truncate">{s.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Proveedor" size="lg">
        <SupplierForm onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Editar Proveedor" size="lg">
        {editing && <SupplierForm initial={editing} onSave={d => updateMut.mutate({ id: editing.id, data: d })} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
