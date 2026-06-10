import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, CheckCircle, XCircle, Send, Clock, Trash2, ArrowLeft, ChevronRight, PlusCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoicesService } from '@/services/crm.service';
import { Invoice, InvoiceItem } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate, cn } from '@/utils/helpers';

const STATUS_CONFIG: Record<string, { label: string; badge: 'default' | 'info' | 'success' | 'danger' | 'warning'; icon: React.ElementType }> = {
  draft:     { label: 'Borrador',  badge: 'default',  icon: FileText },
  sent:      { label: 'Enviada',   badge: 'info',     icon: Send },
  paid:      { label: 'Pagada',    badge: 'success',  icon: CheckCircle },
  overdue:   { label: 'Vencida',   badge: 'danger',   icon: Clock },
  cancelled: { label: 'Cancelada', badge: 'warning',  icon: XCircle },
};

function LineItems({ items, onChange }: { items: InvoiceItem[]; onChange: (items: InvoiceItem[]) => void }) {
  const add = () => onChange([...items, { description: '', quantity: 1, unitPrice: 0, discount: 0 }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof InvoiceItem, value: string | number) =>
    onChange(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase px-1">
        <div className="col-span-5">Descripción</div><div className="col-span-2 text-right">Cant.</div>
        <div className="col-span-2 text-right">Precio</div><div className="col-span-1 text-right">Desc%</div>
        <div className="col-span-1 text-right">Total</div><div className="col-span-1" />
      </div>
      {items.map((item, i) => {
        const total = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
        return (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-5">
              <input className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Descripción" value={item.description} onChange={e => update(i, 'description', e.target.value)} />
            </div>
            <div className="col-span-2">
              <input type="number" min={0} step={0.01} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={item.quantity} onChange={e => update(i, 'quantity', Number(e.target.value))} />
            </div>
            <div className="col-span-2">
              <input type="number" min={0} step={0.01} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={item.unitPrice} onChange={e => update(i, 'unitPrice', Number(e.target.value))} />
            </div>
            <div className="col-span-1">
              <input type="number" min={0} max={100} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={item.discount || 0} onChange={e => update(i, 'discount', Number(e.target.value))} />
            </div>
            <div className="col-span-1 text-right text-sm font-medium text-gray-700">{formatCurrency(total)}</div>
            <div className="col-span-1 flex justify-end">
              <button onClick={() => remove(i)} className="text-gray-300 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
          </div>
        );
      })}
      <button onClick={add} className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 mt-2">
        <PlusCircle className="w-4 h-4" /> Agregar línea
      </button>
    </div>
  );
}

function InvoiceForm({ initial, onSave, onCancel }: { initial?: Partial<Invoice>; onSave: (d: Partial<Invoice>) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Partial<Invoice>>({ status: 'draft', currency: 'MXN', discountType: 'percent', discountValue: 0, taxRate: 16, notes: '', ...initial });
  const [items, setItems] = useState<InvoiceItem[]>(initial?.items || [{ description: '', quantity: 1, unitPrice: 0, discount: 0 }]);
  const set = (k: keyof Invoice, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice * (1 - (i.discount || 0) / 100), 0);
  const discAmt = form.discountType === 'fixed' ? (form.discountValue || 0) : subtotal * (form.discountValue || 0) / 100;
  const taxAmt = (subtotal - discAmt) * (form.taxRate || 0) / 100;
  const total = subtotal - discAmt + taxAmt;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.status || 'draft'} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <Input label="Fecha emisión" type="date" value={form.issueDate ? form.issueDate.split('T')[0] : new Date().toISOString().split('T')[0]} onChange={e => set('issueDate', e.target.value)} />
        <Input label="Fecha vencimiento" type="date" value={form.dueDate ? form.dueDate.split('T')[0] : ''} onChange={e => set('dueDate', e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Conceptos</label>
        <LineItems items={items} onChange={setItems} />
      </div>
      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-72 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex items-center justify-between text-gray-600 gap-2">
            <span>Descuento</span>
            <div className="flex gap-1">
              <select value={form.discountType} onChange={e => set('discountType', e.target.value)} className="border border-gray-200 rounded px-1.5 py-0.5 text-xs">
                <option value="percent">%</option><option value="fixed">$</option>
              </select>
              <input type="number" min={0} value={form.discountValue || 0} onChange={e => set('discountValue', Number(e.target.value))} className="w-16 border border-gray-200 rounded px-2 py-0.5 text-xs text-right" />
            </div>
          </div>
          <div className="flex items-center justify-between text-gray-600 gap-2">
            <span>IVA (%)</span>
            <input type="number" min={0} max={100} value={form.taxRate || 16} onChange={e => set('taxRate', Number(e.target.value))} className="w-16 border border-gray-200 rounded px-2 py-0.5 text-xs text-right" />
          </div>
          <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t"><span>Total</span><span>{formatCurrency(total)}</span></div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => { if (items.some(i => !i.description.trim())) { toast.error('Todas las líneas deben tener descripción'); return; } onSave({ ...form, items }); }}>
          {initial?.id ? 'Guardar' : 'Crear Factura'}
        </Button>
      </div>
    </div>
  );
}

export function Invoices() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['invoices', statusFilter], queryFn: () => invoicesService.getAll({ status: statusFilter || undefined, limit: 50 }) });
  const { data: selected, isLoading: detailLoading } = useQuery({ queryKey: ['invoice', selectedId], queryFn: () => invoicesService.getById(selectedId!), enabled: !!selectedId });
  const { data: stats } = useQuery({ queryKey: ['invoice-stats'], queryFn: invoicesService.getStats });

  const inv = () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['invoice-stats'] }); if (selectedId) qc.invalidateQueries({ queryKey: ['invoice', selectedId] }); };
  const createMut = useMutation({ mutationFn: invoicesService.create, onSuccess: () => { inv(); setShowCreate(false); toast.success('Factura creada'); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<Invoice> }) => invoicesService.update(id, data), onSuccess: () => { inv(); setEditing(null); toast.success('Factura actualizada'); } });
  const statusMut = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => invoicesService.changeStatus(id, status), onSuccess: () => { inv(); toast.success('Estado actualizado'); } });
  const deleteMut = useMutation({ mutationFn: invoicesService.delete, onSuccess: () => { inv(); setSelectedId(null); toast.success('Factura eliminada'); } });

  const invoices = data?.invoices || [];

  // Detail view
  if (selectedId) {
    if (detailLoading) return <div className="p-6 text-center text-gray-400">Cargando...</div>;
    if (!selected) return null;
    const cfg = STATUS_CONFIG[selected.status] || STATUS_CONFIG.draft;
    const Icon = cfg.icon;

    if (editing) return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
          <h1 className="text-xl font-bold text-gray-900">Editar factura</h1>
        </div>
        <Card><InvoiceForm initial={editing} onSave={d => updateMut.mutate({ id: editing.id, data: d })} onCancel={() => setEditing(null)} /></Card>
      </div>
    );

    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedId(null)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-gray-400">{selected.number}</span>
              <Badge variant={cfg.badge} className="flex items-center gap-1"><Icon className="w-3 h-3" /> {cfg.label}</Badge>
            </div>
            {selected.accountName && <p className="text-sm text-gray-500">{selected.accountName}</p>}
          </div>
          <div className="flex items-center gap-2">
            {selected.status === 'draft' && <Button size="sm" onClick={() => statusMut.mutate({ id: selected.id, status: 'sent' })} leftIcon={<Send className="w-3.5 h-3.5" />}>Enviar</Button>}
            {selected.status === 'sent' && <Button size="sm" onClick={() => statusMut.mutate({ id: selected.id, status: 'paid' })} leftIcon={<CheckCircle className="w-3.5 h-3.5" />}>Marcar pagada</Button>}
            <Button size="sm" variant="outline" onClick={() => setEditing(selected)}>Editar</Button>
            <button onClick={() => { if (confirm('¿Eliminar factura?')) deleteMut.mutate(selected.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>

        <Card>
          <div className="grid grid-cols-3 gap-6 pb-5 border-b border-gray-100 mb-5">
            {selected.issueDate && <div><p className="text-xs text-gray-400 uppercase font-medium">Emisión</p><p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(selected.issueDate)}</p></div>}
            {selected.dueDate && <div><p className="text-xs text-gray-400 uppercase font-medium">Vencimiento</p><p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(selected.dueDate)}</p></div>}
            {selected.paidAt && <div><p className="text-xs text-gray-400 uppercase font-medium">Pagada</p><p className="text-sm font-medium text-green-600 mt-0.5">{formatDate(selected.paidAt)}</p></div>}
          </div>
          <table className="w-full">
            <thead><tr className="text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
              <th className="text-left pb-2">Descripción</th><th className="text-right pb-2">Cant.</th>
              <th className="text-right pb-2">Precio</th><th className="text-right pb-2">Desc%</th><th className="text-right pb-2">Total</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {(selected.items || []).map((item, i) => (
                <tr key={item.id || i} className="text-sm">
                  <td className="py-2.5 pr-4 text-gray-900">{item.description}</td>
                  <td className="py-2.5 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-2.5 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2.5 text-right text-gray-400">{item.discount || 0}%</td>
                  <td className="py-2.5 text-right font-medium text-gray-900">{formatCurrency(item.total || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(selected.subtotal)}</span></div>
              {selected.taxRate > 0 && <div className="flex justify-between text-gray-600"><span>IVA ({selected.taxRate}%)</span><span>{formatCurrency(selected.taxAmount)}</span></div>}
              <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t"><span>Total</span><span>{formatCurrency(selected.total)}</span></div>
            </div>
          </div>
          {selected.notes && <p className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-100">{selected.notes}</p>}
        </Card>
      </div>
    );
  }

  // List view
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cobrado: {formatCurrency(stats?.totalPaid || 0)}</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>Nueva Factura</Button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {(['sent', 'paid', 'overdue', 'draft'] as const).map(s => {
            const cfg = STATUS_CONFIG[s]; const Icon = cfg.icon; const stat = stats[s];
            const colors: Record<string, string> = { sent: 'bg-blue-100 text-blue-600', paid: 'bg-green-100 text-green-600', overdue: 'bg-red-100 text-red-500', draft: 'bg-gray-100 text-gray-600' };
            return (
              <Card key={s} className={cn('flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow', statusFilter === s && 'ring-2 ring-primary-500')} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colors[s])}><Icon className="w-5 h-5" /></div>
                <div><p className="text-sm text-gray-500">{cfg.label}</p><p className="text-lg font-bold text-gray-900">{stat.count}</p><p className="text-xs text-gray-400">{formatCurrency(stat.total)}</p></div>
              </Card>
            );
          })}
        </div>
      )}

      <Card padding="none" className="overflow-hidden">
        {isLoading ? <div className="py-20 text-center text-gray-400">Cargando facturas...</div>
          : invoices.length === 0 ? (
            <div className="py-20 text-center"><FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" /><p className="text-gray-400 text-sm">Sin facturas</p></div>
          ) : invoices.map(inv => {
            const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft; const Icon = cfg.icon;
            return (
              <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 last:border-0 group hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelectedId(inv.id)}>
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-primary-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">{inv.number}</span>
                    <Badge variant={cfg.badge} className="flex items-center gap-1 text-xs"><Icon className="w-3 h-3" /> {cfg.label}</Badge>
                  </div>
                  {inv.accountName && <p className="text-sm text-gray-500">{inv.accountName}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(inv.total)}</p>
                  {inv.dueDate && <p className="text-xs text-gray-400">Vence: {formatDate(inv.dueDate)}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
              </div>
            );
          })}
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva Factura" size="xl">
        <InvoiceForm onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />
      </Modal>
    </div>
  );
}
