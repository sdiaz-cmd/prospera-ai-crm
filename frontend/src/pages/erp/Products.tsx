import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, AlertTriangle, TrendingDown, TrendingUp, Trash2, Edit2, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsService } from '@/services/crm.service';
import { Product } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { formatCurrency, cn } from '@/utils/helpers';

function ProductForm({ initial, onSave, onCancel }: { initial?: Partial<Product>; onSave: (d: Partial<Product>) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Partial<Product>>({
    name: '', sku: '', category: '', unit: 'pza', salePrice: 0, costPrice: 0,
    taxRate: 16, trackInventory: true, stock: 0, minStock: 5, ...initial,
  });
  const set = (k: keyof Product, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><Input label="Nombre *" value={form.name || ''} onChange={e => set('name', e.target.value)} /></div>
        <Input label="SKU / Código" value={form.sku || ''} onChange={e => set('sku', e.target.value)} />
        <Input label="Categoría" value={form.category || ''} onChange={e => set('category', e.target.value)} />
        <Input label="Precio de venta (MXN)" type="number" value={String(form.salePrice ?? 0)} onChange={e => set('salePrice', Number(e.target.value))} />
        <Input label="Costo (MXN)" type="number" value={String(form.costPrice ?? 0)} onChange={e => set('costPrice', Number(e.target.value))} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.unit || 'pza'} onChange={e => set('unit', e.target.value)}>
            {['pza', 'hr', 'lic', 'mes', 'kg', 'lt', 'caja', 'servicio'].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <Input label="IVA (%)" type="number" value={String(form.taxRate ?? 16)} onChange={e => set('taxRate', Number(e.target.value))} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <input type="checkbox" id="trackInv" checked={!!form.trackInventory} onChange={e => set('trackInventory', e.target.checked)} className="rounded" />
        <label htmlFor="trackInv" className="text-sm text-gray-700">Controlar inventario</label>
      </div>
      {form.trackInventory && (
        <div className="grid grid-cols-2 gap-4">
          {!initial?.id && <Input label="Stock inicial" type="number" value={String(form.stock ?? 0)} onChange={e => set('stock', Number(e.target.value))} />}
          <Input label="Stock mínimo (alerta)" type="number" value={String(form.minStock ?? 0)} onChange={e => set('minStock', Number(e.target.value))} />
        </div>
      )}
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => { if (!form.name?.trim()) { toast.error('El nombre es requerido'); return; } onSave(form); }}>
          {initial?.id ? 'Guardar' : 'Crear Producto'}
        </Button>
      </div>
    </div>
  );
}

function StockModal({ product, onSave, onCancel }: { product: Product; onSave: (type: string, qty: number, ref: string, notes: string) => void; onCancel: () => void }) {
  const [type, setType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [qty, setQty] = useState(1);
  const [ref, setRef] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">Stock actual de <strong>{product.name}</strong></span>
        <span className="text-lg font-bold text-gray-900">{product.stock} {product.unit}</span>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de movimiento</label>
        <div className="grid grid-cols-3 gap-2">
          {[['in', 'Entrada', 'bg-green-100 text-green-700 border-green-300'], ['out', 'Salida', 'bg-red-100 text-red-700 border-red-300'], ['adjustment', 'Ajuste', 'bg-blue-100 text-blue-700 border-blue-300']].map(([v, l, cls]) => (
            <button key={v} onClick={() => setType(v as 'in' | 'out' | 'adjustment')}
              className={cn('py-2 rounded-lg border text-sm font-medium transition-all', type === v ? cls : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300')}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <Input label="Cantidad" type="number" min={1} value={String(qty)} onChange={e => setQty(Number(e.target.value))} />
      <Input label="Referencia (opcional)" value={ref} onChange={e => setRef(e.target.value)} placeholder="Ej: Orden de compra #123" />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => { if (qty <= 0) { toast.error('Cantidad inválida'); return; } onSave(type, qty, ref, notes); }}>
          Registrar movimiento
        </Button>
      </div>
    </div>
  );
}

export function Products() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, categoryFilter, lowStockOnly],
    queryFn: () => productsService.getAll({ search: search || undefined, category: categoryFilter || undefined, lowStock: lowStockOnly || undefined, limit: 50 }),
  });
  const { data: stats } = useQuery({ queryKey: ['product-stats'], queryFn: productsService.getStats });

  const inv = () => { qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['product-stats'] }); };

  const createMut = useMutation({ mutationFn: productsService.create, onSuccess: () => { inv(); setShowCreate(false); toast.success('Producto creado'); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => productsService.update(id, data), onSuccess: () => { inv(); setEditing(null); toast.success('Producto actualizado'); } });
  const stockMut = useMutation({
    mutationFn: ({ id, type, qty, ref, notes }: { id: string; type: string; qty: number; ref: string; notes: string }) => productsService.adjustStock(id, type, qty, ref, notes),
    onSuccess: () => { inv(); setStockProduct(null); toast.success('Inventario actualizado'); },
  });
  const deleteMut = useMutation({ mutationFn: productsService.delete, onSuccess: () => { inv(); toast.success('Producto desactivado'); } });

  const products = data?.products || [];
  const categories = data?.categories || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats?.total || 0} productos activos · Valor inventario: {formatCurrency(stats?.totalValue || 0)}</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>Nuevo Producto</Button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total productos', value: stats.total, icon: Package, color: 'bg-blue-100 text-blue-600' },
            { label: 'Stock bajo', value: stats.lowStock, icon: AlertTriangle, color: 'bg-red-100 text-red-500' },
            { label: 'Categorías', value: stats.categories, icon: Package, color: 'bg-purple-100 text-purple-600' },
            { label: 'Valor inventario', value: formatCurrency(stats.totalValue), icon: TrendingUp, color: 'bg-green-100 text-green-600', isText: true },
          ].map(({ label, value, icon: Icon, color, isText }) => (
            <Card key={label} className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-900">{isText ? value : value}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-48"><Input placeholder="Buscar por nombre o SKU..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        {categories.length > 0 && (
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <button onClick={() => setLowStockOnly(v => !v)}
          className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors', lowStockOnly ? 'bg-red-50 border-red-300 text-red-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
          <AlertTriangle className="w-3.5 h-3.5" /> Stock bajo
        </button>
      </div>

      {/* Table */}
      <Card padding="none" className="overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-gray-400">Cargando productos...</div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center"><Package className="w-10 h-10 text-gray-200 mx-auto mb-2" /><p className="text-gray-400 text-sm">Sin productos</p></div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-xs font-medium text-gray-500 uppercase">
                <th className="text-left px-5 py-3">Producto</th>
                <th className="text-left px-4 py-3">Categoría</th>
                <th className="text-right px-4 py-3">Precio venta</th>
                <th className="text-right px-4 py-3">Costo</th>
                <th className="text-right px-4 py-3">Stock</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    {p.sku && <p className="text-xs text-gray-400 font-mono">{p.sku}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.category || '—'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(p.salePrice)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatCurrency(p.costPrice)}</td>
                  <td className="px-4 py-3 text-right">
                    {p.trackInventory ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={cn('text-sm font-medium', p.isLowStock ? 'text-red-500' : 'text-gray-900')}>{p.stock}</span>
                        {p.isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                    ) : <span className="text-xs text-gray-400">N/A</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={p.isActive ? 'success' : 'default'}>{p.isActive ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      {p.trackInventory && (
                        <button onClick={() => setStockProduct(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Ajustar stock">
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => setEditing(p)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (confirm('¿Desactivar producto?')) deleteMut.mutate(p.id); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Producto" size="lg">
        <ProductForm onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Editar Producto" size="lg">
        {editing && <ProductForm initial={editing} onSave={d => updateMut.mutate({ id: editing.id, data: d })} onCancel={() => setEditing(null)} />}
      </Modal>
      <Modal isOpen={!!stockProduct} onClose={() => setStockProduct(null)} title="Ajustar Inventario" size="md">
        {stockProduct && (
          <StockModal product={stockProduct} onCancel={() => setStockProduct(null)}
            onSave={(type, qty, ref, notes) => stockMut.mutate({ id: stockProduct.id, type, qty, ref, notes })} />
        )}
      </Modal>
    </div>
  );
}
