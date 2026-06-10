import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle2, Circle, Clock, AlertCircle, ChevronDown, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { tasksService } from '@/services/crm.service';
import { CrmTask } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate, cn } from '@/utils/helpers';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; badge: 'danger' | 'warning' | 'info' | 'default' }> = {
  urgent: { label: 'Urgente', color: 'text-red-600', badge: 'danger' },
  high: { label: 'Alta', color: 'text-orange-600', badge: 'warning' },
  medium: { label: 'Media', color: 'text-blue-600', badge: 'info' },
  low: { label: 'Baja', color: 'text-gray-400', badge: 'default' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pendiente', icon: Circle, color: 'text-gray-400' },
  in_progress: { label: 'En progreso', icon: Clock, color: 'text-blue-500' },
  completed: { label: 'Completada', icon: CheckCircle2, color: 'text-green-500' },
  cancelled: { label: 'Cancelada', icon: AlertCircle, color: 'text-red-400' },
};

function TaskForm({ onSave, onCancel }: {
  onSave: (d: Partial<CrmTask>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<CrmTask>>({
    title: '', description: '', status: 'pending', priority: 'medium', dueDate: '',
  });
  const set = (k: keyof CrmTask, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <Input label="Título *" value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="¿Qué hay que hacer?" />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="Detalles opcionales..." />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.priority || 'medium'} onChange={e => set('priority', e.target.value)}>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.status || 'pending'} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <Input label="Fecha límite" type="date" value={form.dueDate ? form.dueDate.split('T')[0] : ''} onChange={e => set('dueDate', e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => { if (!form.title?.trim()) { toast.error('El título es requerido'); return; } onSave(form); }}>
          Crear Tarea
        </Button>
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete }: {
  task: CrmTask;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const s = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const Icon = s.icon;
  const isCompleted = task.status === 'completed';
  const isOverdue = task.dueDate && !isCompleted && new Date(task.dueDate) < new Date();

  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 group hover:bg-gray-50 transition-colors',
      isCompleted && 'opacity-60')}>
      <button onClick={onToggle} className={cn('flex-shrink-0 transition-colors', s.color, 'hover:scale-110')}>
        <Icon className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-sm font-medium text-gray-900', isCompleted && 'line-through text-gray-400')}>
            {task.title}
          </span>
          <Badge variant={p.badge} className="text-xs">{p.label}</Badge>
        </div>
        {task.description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {task.dueDate && (
            <span className={cn('text-xs flex items-center gap-1', isOverdue ? 'text-red-500 font-medium' : 'text-gray-400')}>
              <Clock className="w-3 h-3" />
              {isOverdue ? 'Vencida: ' : ''}{formatDate(task.dueDate)}
            </span>
          )}
          {task.assignee && (
            <div className="flex items-center gap-1">
              <Avatar name={`${task.assignee.firstName} ${task.assignee.lastName}`} size="xs" />
              <span className="text-xs text-gray-400">{task.assignee.firstName}</span>
            </div>
          )}
        </div>
      </div>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export function Tasks() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter, priorityFilter],
    queryFn: () => tasksService.getAll({
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      limit: 100,
    }),
  });

  const createMut = useMutation({
    mutationFn: tasksService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowCreate(false); toast.success('Tarea creada'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CrmTask> }) => tasksService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
  const deleteMut = useMutation({
    mutationFn: tasksService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Tarea eliminada'); },
  });

  const tasks = data?.tasks || [];
  const pending = tasks.filter(t => t.status !== 'completed').length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const overdue = tasks.filter(t => t.dueDate && t.status !== 'completed' && new Date(t.dueDate) < new Date()).length;

  const toggle = (task: CrmTask) => {
    const next = task.status === 'completed' ? 'pending' : 'completed';
    updateMut.mutate({ id: task.id, data: { status: next } });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pending} pendientes · {completed} completadas
            {overdue > 0 && <span className="text-red-500 ml-1">· {overdue} vencidas</span>}
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
          Nueva Tarea
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-white">
          {[['', 'Todas'], ['pending', 'Pendientes'], ['in_progress', 'En progreso'], ['completed', 'Completadas']].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={cn('px-3 py-1 rounded text-sm transition-colors',
                statusFilter === val ? 'bg-primary-100 text-primary-700 font-medium' : 'text-gray-500 hover:text-gray-700')}>
              {label}
            </button>
          ))}
        </div>
        <div>
          <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:outline-none"
            value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
            <option value="">Todas las prioridades</option>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <Card padding="none" className="overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-gray-400">Cargando tareas...</div>
        ) : tasks.length === 0 ? (
          <div className="py-20 text-center">
            <CheckCircle2 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Sin tareas. ¡Todo al día!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => toggle(task)}
                onDelete={() => { if (confirm('¿Eliminar tarea?')) deleteMut.mutate(task.id); }}
              />
            ))}
          </div>
        )}
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva Tarea" size="md">
        <TaskForm onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />
      </Modal>
    </div>
  );
}
