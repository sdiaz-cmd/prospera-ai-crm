import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, FileText, CheckCircle, XCircle, Send, Clock, Trash2,
  ChevronRight, MoreVertical, ArrowLeft, PlusCircle, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { quotesService } from '@/services/crm.service';
import { Quote, QuoteItem } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate, cn } from '@/utils/helpers';

// ─── Status config ────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string; badge: 'default' | 'info' | 'success' | 'danger' | 'warning'; icon: React.ElementType;
}> = {
  draft:    { label: 'Borrador',  badge: 'default', icon: FileText },
  sent:     { label: 'Enviada',   badge: 'info',    icon: Send },
  accepted: { label: 'Aceptada', badge: 'success',  icon: CheckCircle },
  rejected: { label: 'Rechazada',badge: 'danger',   icon: XCircle },
  expired:  { label: 'Vencida',  badge: 'warning',  icon: Clock },
};

// ─── Line items editor ────────────────────────────────────────────

function LineItemsEditor({ items, onChange }: {
  items: QuoteItem[];
  onChange: (items: QuoteItem[]) => void;
}) {
  const add = () => onChange([...items, { description: '', quantity: 1, unitPrice: 0, discount: 0 }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof QuoteItem, value: string | number) => {
    const next = items.map((item, idx) => idx === i ? { ...item, [field]: value } : item);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase px-1">
        <div className="col-span-5">Descripción</div>
        <div className="col-span-2 text-right">Cantidad</div>
        <div className="col-span-2 text-right">Precio unit.</div>
        <div className="col-span-1 text-right">Desc%</div>
        <div className="col-span-1 text-right">Total</div>
        <div className="col-span-1" />
      </div>
      {items.map((item, i) => {
        const lineDisc = 1 - (item.discount || 0) / 100;
        const lineTotal = item.quantity * item.unitPrice * lineDisc;
        return (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-5">
              <input
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Descripción del producto/servicio"
                value={item.description}
                onChange={e => update(i, 'description', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <input type="number" min={0} step={0.01}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={item.quantity}
                onChange={e => update(i, 'quantity', Number(e.target.value))}
              />
            </div>
            <div className="col-span-2">
              <input type="number" min={0} step={0.01}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={item.unitPrice}
                onChange={e => update(i, 'unitPrice', Number(e.target.value))}
              />
            </div>
            <div className="col-span-1">
              <input type="number" min={0} max={100} step={1}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={item.discount || 0}
                onChange={e => update(i, 'discount', Number(e.target.value))}
              />
            </div>
            <div className="col-span-1 text-right text-sm font-medium text-gray-700">
              {formatCurrency(lineTotal)}
            </div>
            <div className="col-span-1 flex justify-end">
              <button onClick={() => remove(i)} className="text-gray-300 hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
      <button onClick={add}
        className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 mt-2">
        <PlusCircle className="w-4 h-4" /> Agregar línea
      </button>
    </div>
  );
}

// ─── Totals summary ───────────────────────────────────────────────

function TotalsSummary({ items, discountType, discountValue, taxRate, onChange }: {
  items: QuoteItem[];
  discountType: string;
  discountValue: number;
  taxRate: number;
  onChange: (field: string, value: string | number) => void;
}) {
  const subtotal = items.reduce((sum, i) => {
    const d = 1 - (i.discount || 0) / 100;
    return sum + i.quantity * i.unitPrice * d;
  }, 0);
  const discountAmt = discountType === 'fixed' ? discountValue : subtotal * discountValue / 100;
  const taxable = subtotal - discountAmt;
  const taxAmt = taxable * taxRate / 100;
  const total = taxable + taxAmt;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
      <div className="flex justify-end">
        <div className="w-72 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600 gap-2">
            <span>Descuento</span>
            <div className="flex items-center gap-1.5">
              <select value={discountType} onChange={e => onChange('discountType', e.target.value)}
                className="border border-gray-200 rounded px-1.5 py-0.5 text-xs">
                <option value="percent">%</option>
                <option value="fixed">$</option>
              </select>
              <input type="number" min={0} step={0.01}
                className="w-20 border border-gray-200 rounded px-2 py-0.5 text-xs text-right"
                value={discountValue}
                onChange={e => onChange('discountValue', Number(e.target.value))}
              />
              <span className="text-xs text-gray-400">({formatCurrency(discountAmt)})</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600 gap-2">
            <span>IVA (%)</span>
            <div className="flex items-center gap-1.5">
              <input type="number" min={0} max={100} step={0.1}
                className="w-20 border border-gray-200 rounded px-2 py-0.5 text-xs text-right"
                value={taxRate}
                onChange={e => onChange('taxRate', Number(e.target.value))}
              />
              <span className="text-xs text-gray-400">({formatCurrency(taxAmt)})</span>
            </div>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span><span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Quote Form ───────────────────────────────────────────────────

function QuoteForm({ initial, onSave, onCancel }: {
  initial?: Partial<Quote>;
  onSave: (d: Partial<Quote>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Quote>>({
    title: '', status: 'draft', currency: 'MXN',
    discountType: 'percent', discountValue: 0, taxRate: 16,
    notes: '', terms: '',
    ...initial,
  });
  const [items, setItems] = useState<QuoteItem[]>(initial?.items || [
    { description: '', quantity: 1, unitPrice: 0, discount: 0 },
  ]);

  const set = (k: keyof Quote, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const setField = (field: string, value: string | number) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!form.title?.trim()) { toast.error('El título es requerido'); return; }
    if (items.some(i => !i.description.trim())) { toast.error('Todas las líneas deben tener descripción'); return; }
    onSave({ ...form, items });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Título de la cotización *" value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="Ej: Propuesta de implementación CRM" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.status || 'draft'} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <Input label="Válida hasta" type="date"
          value={form.validUntil ? form.validUntil.split('T')[0] : ''}
          onChange={e => set('validUntil', e.target.value)} />
      </div>

      {/* Line items */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Líneas de cotización</label>
        <LineItemsEditor items={items} onChange={setItems} />
        <TotalsSummary
          items={items}
          discountType={form.discountType || 'percent'}
          discountValue={form.discountValue || 0}
          taxRate={form.taxRate ?? 16}
          onChange={setField}
        />
      </div>

      {/* Notes & Terms */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
          <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Notas visibles en el PDF..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Términos y condiciones</label>
          <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            value={form.terms || ''} onChange={e => set('terms', e.target.value)} placeholder="Ej: Pago 50% al inicio, 50% al entregar." />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave}>{initial?.id ? 'Guardar cambios' : 'Crear Cotización'}</Button>
      </div>
    </div>
  );
}

// ─── Quote Detail (read-only view with actions) ───────────────────

function QuoteDetail({ quote, onBack, onEdit, onDelete, onChangeStatus }: {
  quote: Quote;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChangeStatus: (status: string) => void;
}) {
  const cfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft;
  const Icon = cfg.icon;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gray-400">{quote.number}</span>
            <Badge variant={cfg.badge} className="flex items-center gap-1">
              <Icon className="w-3 h-3" /> {cfg.label}
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">{quote.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {quote.status === 'draft' && (
            <Button size="sm" onClick={() => onChangeStatus('sent')} leftIcon={<Send className="w-3.5 h-3.5" />}>
              Enviar
            </Button>
          )}
          {quote.status === 'sent' && (
            <>
              <Button size="sm" variant="outline" onClick={() => onChangeStatus('rejected')} leftIcon={<XCircle className="w-3.5 h-3.5" />}>
                Rechazar
              </Button>
              <Button size="sm" onClick={() => onChangeStatus('accepted')} leftIcon={<CheckCircle className="w-3.5 h-3.5" />}>
                Aceptar
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={onEdit}>Editar</Button>
          <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Card>
        {/* Meta info */}
        <div className="grid grid-cols-3 gap-6 pb-5 border-b border-gray-100 mb-5">
          {quote.accountName && (
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Cuenta</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{quote.accountName}</p>
            </div>
          )}
          {quote.validUntil && (
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Válida hasta</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(quote.validUntil)}</p>
            </div>
          )}
          {quote.assignee && (
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Responsable</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{quote.assignee.firstName} {quote.assignee.lastName}</p>
            </div>
          )}
          {quote.sentAt && (
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Enviada</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(quote.sentAt)}</p>
            </div>
          )}
          {quote.acceptedAt && (
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Aceptada</p>
              <p className="text-sm text-green-600 font-medium mt-0.5">{formatDate(quote.acceptedAt)}</p>
            </div>
          )}
          {quote.rejectedAt && (
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Rechazada</p>
              <p className="text-sm text-red-500 font-medium mt-0.5">{formatDate(quote.rejectedAt)}</p>
            </div>
          )}
        </div>

        {/* Items table */}
        <table className="w-full">
          <thead>
            <tr className="text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
              <th className="text-left pb-2 font-medium">Descripción</th>
              <th className="text-right pb-2 font-medium">Cant.</th>
              <th className="text-right pb-2 font-medium">Precio unit.</th>
              <th className="text-right pb-2 font-medium">Desc%</th>
              <th className="text-right pb-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(quote.items || []).map((item, i) => (
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

        {/* Totals */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>{formatCurrency(quote.subtotal)}</span>
            </div>
            {quote.discountValue > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Descuento ({quote.discountType === 'percent' ? `${quote.discountValue}%` : '$'})</span>
                <span className="text-red-500">-{formatCurrency(
                  quote.discountType === 'fixed' ? quote.discountValue : quote.subtotal * quote.discountValue / 100
                )}</span>
              </div>
            )}
            {quote.taxRate > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>IVA ({quote.taxRate}%)</span><span>{formatCurrency(quote.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span><span>{formatCurrency(quote.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes / Terms */}
        {(quote.notes || quote.terms) && (
          <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-2 gap-6">
            {quote.notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Notas</p>
                <p className="text-sm text-gray-700">{quote.notes}</p>
              </div>
            )}
            {quote.terms && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Términos</p>
                <p className="text-sm text-gray-700">{quote.terms}</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Quote Row ────────────────────────────────────────────────────

function QuoteRow({ quote, onSelect, onDelete, onChangeStatus }: {
  quote: Quote;
  onSelect: () => void;
  onDelete: () => void;
  onChangeStatus: (status: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft;
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 last:border-0 group hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={onSelect}>
      <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
        <FileText className="w-5 h-5 text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">{quote.number}</span>
          <Badge variant={cfg.badge} className="flex items-center gap-1 text-xs">
            <Icon className="w-3 h-3" /> {cfg.label}
          </Badge>
        </div>
        <p className="text-sm font-medium text-gray-900 truncate mt-0.5">{quote.title}</p>
        {quote.accountName && <p className="text-xs text-gray-400">{quote.accountName}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-gray-900">{formatCurrency(quote.total)}</p>
        {quote.validUntil && (
          <p className="text-xs text-gray-400 mt-0.5">
            Vence: {formatDate(quote.validUntil)}
          </p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
      <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={() => setMenuOpen(o => !o)} className="p-1.5 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100">
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-7 z-20 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              {quote.status === 'draft' && (
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => { setMenuOpen(false); onChangeStatus('sent'); }}>
                  <Send className="w-3.5 h-3.5 text-blue-500" /> Marcar enviada
                </button>
              )}
              {quote.status === 'sent' && (<>
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => { setMenuOpen(false); onChangeStatus('accepted'); }}>
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Aceptada
                </button>
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => { setMenuOpen(false); onChangeStatus('rejected'); }}>
                  <XCircle className="w-3.5 h-3.5 text-red-500" /> Rechazada
                </button>
              </>)}
              <div className="border-t border-gray-100 my-1" />
              <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                onClick={() => { setMenuOpen(false); onDelete(); }}>
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export function Quotes() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', statusFilter, search],
    queryFn: () => quotesService.getAll({
      status: statusFilter || undefined,
      search: search || undefined,
      limit: 50,
    }),
  });

  const { data: selectedQuote, isLoading: detailLoading } = useQuery({
    queryKey: ['quote', selectedId],
    queryFn: () => quotesService.getById(selectedId!),
    enabled: !!selectedId,
  });

  const { data: stats } = useQuery({
    queryKey: ['quote-stats'],
    queryFn: quotesService.getStats,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['quotes'] });
    qc.invalidateQueries({ queryKey: ['quote-stats'] });
    if (selectedId) qc.invalidateQueries({ queryKey: ['quote', selectedId] });
  };

  const createMut = useMutation({
    mutationFn: quotesService.create,
    onSuccess: () => { invalidate(); setShowCreate(false); toast.success('Cotización creada'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Quote> }) => quotesService.update(id, data),
    onSuccess: () => { invalidate(); setEditing(null); toast.success('Cotización actualizada'); },
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => quotesService.changeStatus(id, status),
    onSuccess: (_, vars) => { invalidate(); toast.success(`Cotización ${STATUS_CONFIG[vars.status]?.label || vars.status}`); },
  });
  const deleteMut = useMutation({
    mutationFn: quotesService.delete,
    onSuccess: () => { invalidate(); setSelectedId(null); toast.success('Cotización eliminada'); },
  });

  const quotes = data?.quotes || [];

  // ─── Detail view ─────────────────────────────────────────────────
  if (selectedId) {
    if (detailLoading) return <div className="p-6 text-center text-gray-400">Cargando cotización...</div>;
    if (!selectedQuote) return null;

    if (editing) {
      return (
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Editar cotización</h1>
          </div>
          <Card>
            <QuoteForm
              initial={editing}
              onSave={d => updateMut.mutate({ id: editing.id, data: d })}
              onCancel={() => setEditing(null)}
            />
          </Card>
        </div>
      );
    }

    return (
      <QuoteDetail
        quote={selectedQuote}
        onBack={() => setSelectedId(null)}
        onEdit={() => setEditing(selectedQuote)}
        onDelete={() => { if (confirm('¿Eliminar cotización?')) deleteMut.mutate(selectedQuote.id); }}
        onChangeStatus={status => statusMut.mutate({ id: selectedQuote.id, status })}
      />
    );
  }

  // ─── List view ────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatCurrency(stats?.totalValue || 0)} en cotizaciones totales
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
          Nueva Cotización
        </Button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {(['draft', 'sent', 'accepted', 'rejected'] as const).map(s => {
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            const stat = stats[s];
            const colors: Record<string, string> = {
              draft: 'bg-gray-100 text-gray-600',
              sent: 'bg-blue-100 text-blue-600',
              accepted: 'bg-green-100 text-green-600',
              rejected: 'bg-red-100 text-red-500',
            };
            return (
              <Card key={s}
                className={cn('flex items-center gap-3 cursor-pointer transition-shadow hover:shadow-md', statusFilter === s && 'ring-2 ring-primary-500')}
                onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colors[s])}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{cfg.label}</p>
                  <p className="text-lg font-bold text-gray-900">{stat.count}</p>
                  <p className="text-xs text-gray-400">{formatCurrency(stat.total)}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por título o número..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {statusFilter && (
          <button onClick={() => setStatusFilter('')}
            className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
            <X className="w-3.5 h-3.5" /> Limpiar filtro
          </button>
        )}
      </div>

      {/* List */}
      <Card padding="none" className="overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-gray-400">Cargando cotizaciones...</div>
        ) : quotes.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Sin cotizaciones. ¡Crea la primera!</p>
          </div>
        ) : (
          <div>
            {quotes.map(q => (
              <QuoteRow
                key={q.id}
                quote={q}
                onSelect={() => setSelectedId(q.id)}
                onDelete={() => { if (confirm('¿Eliminar cotización?')) deleteMut.mutate(q.id); }}
                onChangeStatus={status => statusMut.mutate({ id: q.id, status })}
              />
            ))}
          </div>
        )}
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva Cotización" size="xl">
        <QuoteForm onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />
      </Modal>
    </div>
  );
}
