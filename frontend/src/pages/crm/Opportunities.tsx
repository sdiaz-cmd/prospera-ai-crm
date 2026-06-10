import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, TrendingUp, Trophy, XCircle, MoreVertical, Trash2, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { opportunitiesService } from '@/services/crm.service';
import { Opportunity } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { formatCurrency, cn } from '@/utils/helpers';

function OppForm({ initial, onSave, onCancel }: {
  initial?: Partial<Opportunity>;
  onSave: (d: Partial<Opportunity>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Opportunity>>({
    name: '', amount: 0, currency: 'MXN', probability: 50,
    status: 'open', notes: '', closeDate: '',
    ...initial,
  });
  const set = (k: keyof Opportunity, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <Input label="Nombre de la oportunidad *" value={form.name || ''} onChange={e => set('name', e.target.value)} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Monto" type="number" value={String(form.amount ?? 0)} onChange={e => set('amount', Number(e.target.value))} />
        <Input label="Fecha de cierre" type="date" value={form.closeDate ? form.closeDate.split('T')[0] : ''} onChange={e => set('closeDate', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Probabilidad (%)</label>
          <input type="range" min={0} max={100} step={5}
            className="w-full accent-primary-600"
            value={form.probability ?? 50} onChange={e => set('probability', Number(e.target.value))} />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0%</span><span className="font-semibold text-primary-600">{form.probability}%</span><span>100%</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.status || 'open'} onChange={e => set('status', e.target.value)}>
            <option value="open">Abierta</option>
            <option value="won">Ganada</option>
            <option value="lost">Perdida</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => { if (!form.name?.trim()) { toast.error('El nombre es requerido'); return; } onSave(form); }}>
          {initial?.id ? 'Guardar cambios' : 'Crear Oportunidad'}
        </Button>
      </div>
    </div>
  );
}

function KanbanCard({ opp, onEdit, onDelete, onMoveStage, stages }: {
  opp: Opportunity;
  onEdit: () => void;
  onDelete: () => void;
  onMoveStage: (stageId: string) => void;
  stages: { id: string; name: string }[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-semibold text-gray-900 leading-tight pr-2">{opp.name}</p>
        <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={() => setMenuOpen(o => !o)} className="p-0.5 rounded hover:bg-gray-100">
            <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-5 z-20 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50" onClick={() => { setMenuOpen(false); onEdit(); }}>Editar</button>
                <div className="border-t border-gray-100 my-1" />
                <p className="px-4 py-1 text-xs font-medium text-gray-400 uppercase">Mover a etapa</p>
                {stages.filter(s => s.id !== opp.stageId).map(s => (
                  <button key={s.id} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => { setMenuOpen(false); onMoveStage(s.id); }}>
                    → {s.name}
                  </button>
                ))}
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

      {opp.accountName && (
        <p className="text-xs text-gray-500 mb-2">{opp.accountName}</p>
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="text-sm font-bold text-gray-900">{formatCurrency(opp.amount)}</span>
        <span className="text-xs text-gray-400">{opp.probability}%</span>
      </div>

      {opp.closeDate && (
        <p className="text-xs text-gray-400 mt-1">
          Cierre: {new Date(opp.closeDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
        </p>
      )}

      {opp.assignee && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
          <Avatar name={`${opp.assignee.firstName} ${opp.assignee.lastName}`} size="xs" />
          <span className="text-xs text-gray-500">{opp.assignee.firstName} {opp.assignee.lastName}</span>
        </div>
      )}
    </div>
  );
}

export function Opportunities() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);

  const { data: kanban, isLoading } = useQuery({
    queryKey: ['opp-kanban'],
    queryFn: opportunitiesService.getKanban,
  });

  const { data: stats } = useQuery({
    queryKey: ['opp-stats'],
    queryFn: opportunitiesService.getStats,
  });

  const createMut = useMutation({
    mutationFn: opportunitiesService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['opp-kanban'] }); qc.invalidateQueries({ queryKey: ['opp-stats'] }); setShowCreate(false); toast.success('Oportunidad creada'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Opportunity> }) => opportunitiesService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['opp-kanban'] }); setEditing(null); toast.success('Oportunidad actualizada'); },
  });
  const moveMut = useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) => opportunitiesService.moveStage(id, stageId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['opp-kanban'] }); toast.success('Etapa actualizada'); },
  });
  const deleteMut = useMutation({
    mutationFn: opportunitiesService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['opp-kanban'] }); qc.invalidateQueries({ queryKey: ['opp-stats'] }); toast.success('Oportunidad eliminada'); },
  });

  const stages = kanban?.stages || [];
  const allStagesMeta = stages.map(s => ({ id: s.id as string, name: s.name as string }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Comercial</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatCurrency(kanban?.totalValue || 0)} en pipeline activo
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
          Nueva Oportunidad
        </Button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pipeline Abierto</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.open.value)}</p>
              <p className="text-xs text-gray-400">{stats.open.count} oportunidades</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ganadas</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.won.value)}</p>
              <p className="text-xs text-gray-400">{stats.won.count} oportunidades</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Perdidas</p>
              <p className="text-lg font-bold text-gray-900">{stats.lost.count}</p>
              <p className="text-xs text-gray-400">oportunidades</p>
            </div>
          </Card>
        </div>
      )}

      {/* Kanban Board */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-400">Cargando pipeline...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {stages.map((stage) => {
            const opps = stage.opportunities as unknown as Opportunity[];
            const stageTotal = opps.reduce((sum, o) => sum + o.amount, 0);

            return (
              <div key={stage.id as string} className="flex-shrink-0 w-72">
                {/* Stage Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color as string || '#6366f1' }} />
                    <span className="text-sm font-semibold text-gray-700">{stage.name as string}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">{opps.length}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <DollarSign className="w-3 h-3" />
                    {formatCurrency(stageTotal)}
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {opps.map(opp => (
                    <KanbanCard
                      key={opp.id}
                      opp={opp}
                      onEdit={() => setEditing(opp)}
                      onDelete={() => { if (confirm('¿Eliminar oportunidad?')) deleteMut.mutate(opp.id); }}
                      onMoveStage={stageId => moveMut.mutate({ id: opp.id, stageId })}
                      stages={allStagesMeta}
                    />
                  ))}
                  {opps.length === 0 && (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
                      <p className="text-xs text-gray-400">Sin oportunidades</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva Oportunidad" size="lg">
        <OppForm onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Editar Oportunidad" size="lg">
        {editing && <OppForm initial={editing} onSave={d => updateMut.mutate({ id: editing.id, data: d })} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
