import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Trash2, HardHat, Users, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { cn } from '@/utils/helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cuadrilla {
  id: string; companyId: string; name: string; description: string | null;
  chiefId: string | null; chiefName?: string;
  isActive: boolean; createdAt: string;
  memberCount?: number;
}

interface UserOption { id: string; firstName: string; lastName: string; email: string; }

// ─── CRUD ─────────────────────────────────────────────────────────────────────
// We'll use the same /projects-adjacent API, but cuadrillas have their own endpoints.
// Since cuadrillas.controller.ts hasn't been created yet, we'll implement this
// using a placeholder that can connect once the endpoint exists.

const inputCls = 'w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500';

function CreateCuadrillaModal({ onClose, users }: { onClose: () => void; users: UserOption[] }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [chiefId, setChiefId] = useState('');
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (d: { name: string; description: string; chiefId: string }) =>
      api.post('/cuadrillas', d),
    onSuccess: () => {
      toast.success('Cuadrilla creada');
      qc.invalidateQueries({ queryKey: ['cuadrillas'] });
      onClose();
    },
    onError: () => toast.error('Error al crear cuadrilla'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white border border-gray-300 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <HardHat className="w-4 h-4 text-amber-400" /> Nueva Cuadrilla
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (name.trim()) mut.mutate({ name: name.trim(), description, chiefId }); }} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Nombre de la cuadrilla *</label>
            <input className={inputCls} placeholder="Ej: Equipo Norte" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Jefe de cuadrilla</label>
            <select className={inputCls} value={chiefId} onChange={e => setChiefId(e.target.value)}>
              <option value="">Sin asignar</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Descripción</label>
            <textarea className={cn(inputCls, 'h-16 resize-none')} placeholder="Descripción opcional..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
            <button type="submit" disabled={!name.trim() || mut.isPending} className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors">
              {mut.isPending ? 'Creando...' : 'Crear cuadrilla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CuadrillaCard({ cuadrilla, users }: { cuadrilla: Cuadrilla; users: UserOption[] }) {
  const [expanded, setExpanded] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const qc = useQueryClient();

  const { data: members = [] } = useQuery<{ id: string; userId: string; role: string; firstName: string; lastName: string; email: string }[]>({
    queryKey: ['cuadrilla-members', cuadrilla.id],
    queryFn: () => api.get(`/cuadrillas/${cuadrilla.id}/members`).then(r => r.data.data),
    enabled: expanded,
  });

  const addMember = useMutation({
    mutationFn: (userId: string) => api.post(`/cuadrillas/${cuadrilla.id}/members`, { userId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cuadrilla-members', cuadrilla.id] }); setAddingMember(false); setSelectedUser(''); },
    onError: () => toast.error('Error al agregar miembro'),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => api.delete(`/cuadrillas/${cuadrilla.id}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cuadrilla-members', cuadrilla.id] }),
  });

  const delCuadrilla = useMutation({
    mutationFn: () => api.delete(`/cuadrillas/${cuadrilla.id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cuadrillas'] }); toast.success('Cuadrilla eliminada'); },
    onError: () => toast.error('Error al eliminar'),
  });

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
          <HardHat className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">{cuadrilla.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {cuadrilla.chiefName && <span className="text-xs text-gray-400">Jefe: {cuadrilla.chiefName}</span>}
            <span className="text-xs text-gray-700 flex items-center gap-1"><Users className="w-3 h-3" /> {cuadrilla.memberCount ?? 0} miembro{(cuadrilla.memberCount ?? 0) !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); if (confirm('¿Eliminar esta cuadrilla?')) delCuadrilla.mutate(); }} className="p-1.5 text-gray-700 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100 pt-4 space-y-3">
          {cuadrilla.description && <p className="text-sm text-gray-500">{cuadrilla.description}</p>}

          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Miembros</p>
            <button onClick={() => setAddingMember(a => !a)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-700 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </div>

          {addingMember && (
            <div className="flex gap-2">
              <select className={cn(inputCls, 'flex-1')} value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                <option value="">Seleccionar usuario</option>
                {users.filter(u => !members.some(m => m.userId === u.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
              <button onClick={() => { if (selectedUser) addMember.mutate(selectedUser); }} disabled={!selectedUser || addMember.isPending} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm transition-colors">
                Agregar
              </button>
            </div>
          )}

          {members.length === 0 ? (
            <p className="text-xs text-gray-700 py-2">Sin miembros asignados</p>
          ) : (
            <div className="space-y-1">
              {members.map(m => (
                <div key={m.userId} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 group">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-700">
                    {m.firstName?.[0]}{m.lastName?.[0]}
                  </div>
                  <span className="flex-1 text-sm text-gray-700">{m.firstName} {m.lastName}</span>
                  <span className="text-[10px] text-gray-400">{m.role}</span>
                  <button onClick={() => removeMember.mutate(m.userId)} className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TeamsPage() {
  const [showCreate, setShowCreate] = useState(false);

  const { data: cuadrillas = [], isLoading } = useQuery<Cuadrilla[]>({
    queryKey: ['cuadrillas'],
    queryFn: () => api.get('/cuadrillas').then(r => r.data.data),
    staleTime: 30000,
  });

  const { data: users = [] } = useQuery<UserOption[]>({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users?limit=200').then(r => r.data.data),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HardHat className="w-5 h-5 text-amber-400" /> Cuadrillas Técnicas
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{cuadrillas.length} cuadrilla{cuadrillas.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva cuadrilla
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Cargando cuadrillas...</div>
      ) : cuadrillas.length === 0 ? (
        <div className="py-16 text-center">
          <HardHat className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay cuadrillas creadas</p>
          <p className="text-gray-700 text-xs mt-1">Crea la primera cuadrilla para organizar tu equipo técnico</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cuadrillas.map(c => (
            <CuadrillaCard key={c.id} cuadrilla={c} users={users} />
          ))}
        </div>
      )}

      {showCreate && <CreateCuadrillaModal onClose={() => setShowCreate(false)} users={users} />}
    </div>
  );
}
