import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Upload, AlertTriangle, Search, ArrowUp, ArrowDown, RotateCcw, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface StockItem {
  id: string; name: string; sku: string; category: string;
  unit: string; salePrice: number; costPrice: number;
  stock: number; minStock: number; trackInventory: boolean;
  supplierName: string; status: 'ok' | 'stock_bajo' | 'sin_stock' | 'no_track';
}

interface ImportRow {
  _row: number; name: string; sku: string; category: string;
  unit: string; salePrice: number; costPrice: number;
  stock: number; minStock: number;
}

const statusConfig = {
  ok:        { label: 'OK',         variant: 'success' as const },
  stock_bajo:{ label: 'Stock bajo', variant: 'warning' as const },
  sin_stock: { label: 'Sin stock',  variant: 'danger'  as const },
  no_track:  { label: 'Sin seguimiento', variant: 'default' as const },
};

export function Inventory() {
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [movementModal, setMovementModal] = useState<StockItem | null>(null);
  const [movType, setMovType] = useState<'entrada' | 'salida' | 'ajuste'>('entrada');
  const [movQty, setMovQty] = useState('');
  const [movRef, setMovRef] = useState('');
  const [movNotes, setMovNotes] = useState('');
  const [importModal, setImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: summary } = useQuery({ queryKey: ['inventory-summary'], queryFn: () => api.get('/inventory/summary').then(r => r.data) });
  const { data: stock = [], isLoading } = useQuery({
    queryKey: ['inventory-stock', search, lowStock],
    queryFn: () => api.get('/inventory/stock', { params: { search, lowStock } }).then(r => r.data),
    placeholderData: (p) => p,
  });

  const movMutation = useMutation({
    mutationFn: (data: object) => api.post('/inventory/movements', data),
    onSuccess: () => {
      toast.success('Movimiento registrado');
      qc.invalidateQueries({ queryKey: ['inventory-stock'] });
      qc.invalidateQueries({ queryKey: ['inventory-summary'] });
      setMovementModal(null);
      setMovQty(''); setMovRef(''); setMovNotes('');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message || 'Error al registrar movimiento'),
  });

  const handleMovement = () => {
    if (!movementModal || !movQty) return;
    movMutation.mutate({ productId: movementModal.id, type: movType, quantity: Number(movQty), reference: movRef, notes: movNotes });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/inventory/analyze-excel', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportRows(res.data.items);
      setImportModal(true);
      toast.success(`${res.data.mappedRows} productos detectados de ${res.data.totalRows} filas`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Error al analizar el archivo');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleImportConfirm = async () => {
    try {
      const res = await api.post('/inventory/import', { items: importRows });
      toast.success(`Importado: ${res.data.created} creados, ${res.data.updated} actualizados`);
      if (res.data.errors?.length) toast.error(`${res.data.errors.length} errores`);
      qc.invalidateQueries({ queryKey: ['inventory-stock'] });
      qc.invalidateQueries({ queryKey: ['inventory-summary'] });
      setImportModal(false);
      setImportRows([]);
    } catch {
      toast.error('Error al importar');
    }
  };

  const updateImportRow = (idx: number, field: keyof ImportRow, value: string | number) => {
    setImportRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-500 mt-1">Control de stock ligado a tus productos</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
          <Button variant="outline" leftIcon={<Upload className="w-4 h-4" />} onClick={() => fileRef.current?.click()} loading={importing}>
            Importar Excel
          </Button>
        </div>
      </div>

      {/* Resumen */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total productos', value: summary.total, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Sin stock', value: summary.sinStock, icon: X, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Stock bajo', value: summary.stockBajo, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Valor inventario', value: `$${summary.valorInventario.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`, icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
          ].map((s) => (
            <Card key={s.label}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Filtros */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-sm">
            <Input placeholder="Buscar producto, SKU..." value={search} onChange={e => setSearch(e.target.value)} leftAddon={<Search className="w-4 h-4" />} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={lowStock} onChange={e => setLowStock(e.target.checked)} className="rounded border-gray-300 text-primary-600" />
            Solo stock bajo / sin stock
          </label>
        </div>
      </Card>

      {/* Tabla */}
      {isLoading ? <LoadingSpinner /> : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Producto', 'SKU', 'Categoría', 'Stock actual', 'Stock mínimo', 'Precio venta', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(stock as StockItem[]).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.supplierName && <p className="text-xs text-gray-400">{item.supplierName}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.sku || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.category || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-lg font-bold ${item.stock <= 0 ? 'text-red-600' : item.stock <= item.minStock ? 'text-amber-600' : 'text-gray-900'}`}>
                        {item.stock}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.minStock} {item.unit}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">${item.salePrice.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusConfig[item.status].variant} dot>
                        {statusConfig[item.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setMovementModal(item); setMovType('entrada'); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Entrada">
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setMovementModal(item); setMovType('salida'); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Salida">
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setMovementModal(item); setMovType('ajuste'); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Ajuste">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(stock as StockItem[]).length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="font-medium text-gray-500">Sin productos</p>
                    <p className="text-sm mt-1">Importa un Excel o crea productos en ERP → Productos</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal movimiento */}
      <Modal
        isOpen={!!movementModal}
        onClose={() => { setMovementModal(null); setMovQty(''); setMovRef(''); setMovNotes(''); }}
        title={`Registrar movimiento — ${movementModal?.name}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setMovementModal(null)}>Cancelar</Button>
            <Button onClick={handleMovement} loading={movMutation.isPending} disabled={!movQty}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {(['entrada', 'salida', 'ajuste'] as const).map(t => (
                <button key={t} onClick={() => setMovType(t)}
                  className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${movType === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Input
            label={movType === 'ajuste' ? 'Nuevo stock total' : 'Cantidad'}
            type="number"
            min="0"
            value={movQty}
            onChange={e => setMovQty(e.target.value)}
            hint={movementModal ? `Stock actual: ${movementModal.stock} ${movementModal.unit}` : ''}
            required
          />
          <Input label="Referencia (opcional)" placeholder="Ej: Factura #123" value={movRef} onChange={e => setMovRef(e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas (opcional)</label>
            <textarea value={movNotes} onChange={e => setMovNotes(e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none" />
          </div>
        </div>
      </Modal>

      {/* Modal importar Excel */}
      <Modal
        isOpen={importModal}
        onClose={() => { setImportModal(false); setImportRows([]); }}
        title="Importar inventario desde Excel"
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => { setImportModal(false); setImportRows([]); }}>Cancelar</Button>
            <Button onClick={handleImportConfirm} leftIcon={<Check className="w-4 h-4" />}>
              Confirmar importación ({importRows.length} productos)
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Revisa y edita los datos antes de confirmar. Haz clic en cualquier celda para editarla.</p>
          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['Nombre', 'SKU', 'Categoría', 'Unidad', 'P. Venta', 'P. Costo', 'Stock', 'Stock mín.'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {importRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30">
                    {(['name', 'sku', 'category', 'unit', 'salePrice', 'costPrice', 'stock', 'minStock'] as (keyof ImportRow)[]).map(field => (
                      <td key={field} className="px-2 py-1.5">
                        <input
                          type={['salePrice', 'costPrice', 'stock', 'minStock'].includes(field) ? 'number' : 'text'}
                          value={String(row[field])}
                          onChange={e => updateImportRow(idx, field, ['salePrice', 'costPrice', 'stock', 'minStock'].includes(field) ? Number(e.target.value) : e.target.value)}
                          className="w-full min-w-[80px] border border-transparent hover:border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded px-2 py-1 text-gray-900 bg-transparent focus:bg-white outline-none transition-colors"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}
