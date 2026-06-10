import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, MoreVertical, Shield, UserCheck, UserX, Trash2, Mail, Copy, Check, Link } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { usersService } from '@/services/users.service';
import { rolesService } from '@/services/roles.service';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatDate } from '@/utils/helpers';
import { UserWithRole } from '@/types';

interface InviteForm {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  password: string;
}

interface InviteEmailForm {
  email: string;
  roleId: string;
}

export function Users() {
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEmailInviteModal, setShowEmailInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => usersService.getAll({ search }),
    placeholderData: (prev) => prev,
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesService.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: usersService.delete,
    onSuccess: () => {
      toast.success('Usuario eliminado de la empresa');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message || 'Error al eliminar usuario');
    },
  });

  const inviteMutation = useMutation({
    mutationFn: usersService.invite,
    onSuccess: () => {
      toast.success('Usuario creado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowInviteModal(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message || 'Error al crear usuario');
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: (data: InviteEmailForm) => api.post('/invitations', data),
    onSuccess: (res) => {
      setShowEmailInviteModal(false);
      resetEmail();
      const link = res.data?.link;
      if (link) {
        setInviteLink(link);
      } else {
        toast.success('Invitación creada');
      }
    },
    onError: (e: { response?: { data?: { error?: string; message?: string } } }) => {
      toast.error(e?.response?.data?.message || e?.response?.data?.error || 'Error al crear invitación');
    },
  });

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteForm>();
  const { register: registerEmail, handleSubmit: handleSubmitEmail, reset: resetEmail, formState: { errors: errorsEmail } } = useForm<InviteEmailForm>();

  const onInvite = (data: InviteForm) => inviteMutation.mutate(data);
  const onSendInvite = (data: InviteEmailForm) => sendInviteMutation.mutate(data);

  const users = data?.data || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 mt-1">Gestiona el equipo y sus permisos de acceso</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Mail className="w-4 h-4" />} onClick={() => setShowEmailInviteModal(true)}>
            Invitar por email
          </Button>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowInviteModal(true)}>
            Crear usuario
          </Button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftAddon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{users.length} de {data?.meta?.total || 0} usuarios</span>
          </div>
        </div>
      </Card>

      {/* Lista de usuarios */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Último acceso</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Miembro desde</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user: UserWithRole) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${user.firstName} ${user.lastName}`} src={user.avatarUrl} />
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        {user.isOwner && (
                          <Badge variant="purple" size="sm">Propietario</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Shield className="w-4 h-4 text-gray-400" />
                        {user.role?.name || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.isActive ? 'success' : 'default'} dot>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Nunca'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpen === user.id && (
                          <>
                            <div className="fixed inset-0" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-0 top-8 w-44 bg-white rounded-xl shadow-dropdown border border-gray-100 overflow-hidden z-10">
                              <button
                                onClick={() => {
                                  // Toggle active
                                  setMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                {user.isActive ? <UserX className="w-4 h-4 text-gray-400" /> : <UserCheck className="w-4 h-4 text-gray-400" />}
                                {user.isActive ? 'Desactivar' : 'Activar'}
                              </button>
                              {!user.isOwner && (
                                <button
                                  onClick={() => {
                                    deleteMutation.mutate(user.id);
                                    setMenuOpen(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Eliminar
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Users2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-500">No hay usuarios</p>
                <p className="text-sm mt-1">Agrega usuarios a tu equipo</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Modal invitar por email */}
      <Modal
        isOpen={showEmailInviteModal}
        onClose={() => { setShowEmailInviteModal(false); resetEmail(); }}
        title="Invitar por email"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowEmailInviteModal(false); resetEmail(); }}>Cancelar</Button>
            <Button form="email-invite-form" type="submit" loading={sendInviteMutation.isPending} leftIcon={<Mail className="w-4 h-4" />}>
              Enviar invitación
            </Button>
          </>
        }
      >
        <form id="email-invite-form" onSubmit={handleSubmitEmail(onSendInvite)} className="space-y-4">
          <p className="text-sm text-gray-500">Se generará un link de invitación para que el usuario cree su contraseña y active su cuenta. Podrás copiarlo y enviárselo por WhatsApp o email.</p>
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="trabajador@empresa.com"
            error={errorsEmail.email?.message}
            required
            {...registerEmail('email', { required: 'Requerido', pattern: { value: /\S+@\S+\.\S+/, message: 'Correo inválido' } })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Rol <span className="text-red-500">*</span></label>
            <select
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              {...registerEmail('roleId', { required: 'Selecciona un rol' })}
            >
              <option value="">Seleccionar rol...</option>
              {rolesData?.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            {errorsEmail.roleId && <p className="mt-1.5 text-xs text-red-600">{errorsEmail.roleId.message}</p>}
          </div>
        </form>
      </Modal>

      {/* Modal crear usuario manual */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => { setShowInviteModal(false); reset(); }}
        title="Agregar Usuario"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowInviteModal(false); reset(); }}>
              Cancelar
            </Button>
            <Button
              form="invite-form"
              type="submit"
              loading={inviteMutation.isPending}
            >
              Crear Usuario
            </Button>
          </>
        }
      >
        <form id="invite-form" onSubmit={handleSubmit(onInvite)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              placeholder="Juan"
              error={errors.firstName?.message}
              required
              {...register('firstName', { required: 'Requerido' })}
            />
            <Input
              label="Apellido"
              placeholder="Pérez"
              error={errors.lastName?.message}
              required
              {...register('lastName', { required: 'Requerido' })}
            />
          </div>
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="usuario@empresa.com"
            error={errors.email?.message}
            required
            {...register('email', { required: 'Requerido', pattern: { value: /\S+@\S+\.\S+/, message: 'Correo inválido' } })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Rol <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              {...register('roleId', { required: 'Selecciona un rol' })}
            >
              <option value="">Seleccionar rol...</option>
              {rolesData?.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            {errors.roleId && <p className="mt-1.5 text-xs text-red-600">{errors.roleId.message}</p>}
          </div>
          <Input
            label="Contraseña temporal"
            type="password"
            placeholder="Mínimo 8 caracteres"
            error={errors.password?.message}
            hint="El usuario puede cambiarla después"
            required
            {...register('password', {
              required: 'Requerida',
              minLength: { value: 8, message: 'Mínimo 8 caracteres' },
            })}
          />
        </form>
      </Modal>

      {/* Modal link de invitación */}
      <Modal
        isOpen={!!inviteLink}
        onClose={() => { setInviteLink(null); setLinkCopied(false); }}
        title="Invitación creada"
        size="md"
        footer={
          <Button onClick={() => { setInviteLink(null); setLinkCopied(false); }}>
            Listo
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <Link className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800">Invitación creada exitosamente. Comparte este link con el usuario.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Link de invitación</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteLink || ''}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:outline-none"
              />
              <button
                onClick={copyInviteLink}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {linkCopied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400">Este link expira en 7 días. El usuario lo usará para crear su contraseña y activar su cuenta.</p>
        </div>
      </Modal>
    </div>
  );
}

function Users2({ className: _className }: { className?: string }) {
  return <Users />;
}
