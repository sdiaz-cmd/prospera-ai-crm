import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Phone, Mail, Video, FileText, Users, MapPin, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { activitiesService } from '@/services/crm.service';
import { Activity } from '@/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { getRelativeTime, ACTIVITY_TYPES, cn } from '@/utils/helpers';

const TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: FileText,
  demo: Video,
  visit: MapPin,
};

const TYPES = ['call', 'email', 'meeting', 'note', 'demo', 'visit'];

function ActivityForm({ onSave, onCancel }: {
  onSave: (d: Partial<Activity>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Activity>>({ type: 'note', subject: '', body: '', outcome: '' });
  const set = (k: keyof Activity, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de actividad</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map(t => {
            const Icon = TYPE_ICONS[t] || FileText;
            const info = ACTIVITY_TYPES[t];
            return (
              <button key={t} onClick={() => set('type', t)}
                className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
                  form.type === t ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300')}>
                <Icon className="w-4 h-4" />
                {info?.label || t}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={form.subject || ''} onChange={e => set('subject', e.target.value)}
          placeholder={`Asunto de la ${ACTIVITY_TYPES[form.type || 'note']?.label?.toLowerCase() || 'actividad'}`} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Notas</label>
        <textarea rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          value={form.body || ''} onChange={e => set('body', e.target.value)} placeholder="Describe la actividad..." />
      </div>
      {['call', 'meeting', 'demo', 'visit'].includes(form.type || '') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.outcome || ''} onChange={e => set('outcome', e.target.value)} placeholder="¿Cuál fue el resultado?" />
        </div>
      )}
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(form)}>Registrar Actividad</Button>
      </div>
    </div>
  );
}

function ActivityItem({ activity, onDelete }: { activity: Activity; onDelete: () => void }) {
  const Icon = TYPE_ICONS[activity.type] || FileText;
  const info = ACTIVITY_TYPES[activity.type];
  const colorClass = info?.color || 'text-gray-500';

  return (
    <div className="flex gap-4 py-4 border-b border-gray-100 last:border-0 group">
      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        activity.type === 'call' ? 'bg-blue-100' :
        activity.type === 'email' ? 'bg-purple-100' :
        activity.type === 'meeting' ? 'bg-green-100' :
        activity.type === 'note' ? 'bg-yellow-100' :
        activity.type === 'demo' ? 'bg-indigo-100' : 'bg-pink-100')}>
        <Icon className={cn('w-4 h-4', colorClass)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <span className={cn('text-xs font-semibold uppercase tracking-wide', colorClass)}>
              {info?.label || activity.type}
            </span>
            {activity.subject && (
              <p className="text-sm font-medium text-gray-900 mt-0.5">{activity.subject}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <span className="text-xs text-gray-400">{getRelativeTime(activity.createdAt)}</span>
            <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {activity.body && (
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{activity.body}</p>
        )}
        {activity.outcome && (
          <p className="text-xs text-gray-500 mt-1 italic">Resultado: {activity.outcome}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Avatar name={`${activity.owner.firstName} ${activity.owner.lastName}`} size="xs" />
          <span className="text-xs text-gray-500">{activity.owner.firstName} {activity.owner.lastName}</span>
        </div>
      </div>
    </div>
  );
}

export function Activities() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['activities', typeFilter],
    queryFn: () => activitiesService.getAll({ type: typeFilter || undefined, limit: 50 }),
  });

  const createMut = useMutation({
    mutationFn: activitiesService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['activities'] }); setShowCreate(false); toast.success('Actividad registrada'); },
  });
  const deleteMut = useMutation({
    mutationFn: activitiesService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['activities'] }); toast.success('Actividad eliminada'); },
  });

  const activities = data?.activities || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Actividades</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activities.length} actividades recientes</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
          Registrar Actividad
        </Button>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setTypeFilter('')}
          className={cn('px-3 py-1.5 rounded-lg text-sm border transition-colors',
            !typeFilter ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
          Todas
        </button>
        {TYPES.map(t => {
          const Icon = TYPE_ICONS[t];
          return (
            <button key={t} onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors',
                typeFilter === t ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
              <Icon className="w-3.5 h-3.5" />
              {ACTIVITY_TYPES[t]?.label}
            </button>
          );
        })}
      </div>

      <Card padding="none">
        {isLoading ? (
          <div className="py-20 text-center text-gray-400">Cargando actividades...</div>
        ) : activities.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-400 text-sm">Sin actividades. Registra la primera.</p>
          </div>
        ) : (
          <div className="px-6 divide-y divide-gray-100">
            {activities.map(a => (
              <ActivityItem
                key={a.id}
                activity={a}
                onDelete={() => { if (confirm('¿Eliminar actividad?')) deleteMut.mutate(a.id); }}
              />
            ))}
          </div>
        )}
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Registrar Actividad" size="lg">
        <ActivityForm onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />
      </Modal>
    </div>
  );
}
