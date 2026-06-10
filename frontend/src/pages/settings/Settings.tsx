import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Globe, CreditCard, Shield, Bell, Zap, Copy, CheckCircle, MessageCircle, ArrowDownCircle, ArrowUpCircle, Telescope, KeyRound, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { apolloService } from '@/services/crm.service';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn, PLAN_LABELS } from '@/utils/helpers';

const tabs = [
  { id: 'empresa', label: 'Empresa', icon: Building2 },
  { id: 'plan', label: 'Plan y facturación', icon: CreditCard },
  { id: 'seguridad', label: 'Seguridad', icon: Shield },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'integraciones', label: 'Integraciones', icon: Zap },
];

interface CompanyForm {
  name: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  currency: string;
}

// ─── Apollo Config Section ────────────────────────────────────────────────────

function ApolloConfig() {
  const qc = useQueryClient();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['apollo-settings'],
    queryFn: apolloService.getSettings,
  });

  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) return;
    setSaving(true);
    try {
      await apolloService.saveSettings({ apiKey: apiKeyInput.trim() });
      qc.invalidateQueries({ queryKey: ['apollo-settings'] });
      qc.invalidateQueries({ queryKey: ['apollo-permission'] });
      toast.success('API Key de Apollo guardada');
      setApiKeyInput('');
    } catch {
      toast.error('Error al guardar la API Key');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleToggle = async (roleId: string) => {
    if (!settings) return;
    const current = settings.searchRoles || [];
    const updated = current.includes(roleId)
      ? current.filter((id: string) => id !== roleId)
      : [...current, roleId];
    try {
      await apolloService.saveSettings({ searchRoles: updated });
      qc.invalidateQueries({ queryKey: ['apollo-settings'] });
      qc.invalidateQueries({ queryKey: ['apollo-permission'] });
      toast.success('Permisos actualizados');
    } catch {
      toast.error('Error al actualizar permisos');
    }
  };

  if (isLoading) return <div className="py-4 text-sm text-gray-400">Cargando...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
            <Telescope className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <CardTitle>Apollo.io — Búsqueda de Prospectos</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">Busca y agrega prospectos directamente desde tu base de datos CRM</p>
          </div>
        </div>
      </CardHeader>

      <div className="space-y-6 px-6 pb-6">
        {/* API Key */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" /> API Key
          </label>
          {settings?.apiKeyMasked ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <code className="text-sm text-gray-700 font-mono">{settings.apiKeyMasked}</code>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowKey(v => !v)}>
                {showKey ? 'Ocultar' : 'Cambiar'}
              </Button>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
              No tienes una API Key configurada. Agrégala para activar la búsqueda de prospectos.
            </div>
          )}

          {(!settings?.apiKeyMasked || showKey) && (
            <div className="flex gap-2 mt-3">
              <Input
                placeholder="sk-live-xxxxxxxxxxxxxxxx"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" loading={saving} onClick={handleSaveKey} disabled={!apiKeyInput.trim()}>
                Guardar
              </Button>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-2">
            Obtén tu API Key en{' '}
            <a href="https://app.apollo.io/#/settings/integrations/api" target="_blank" rel="noopener noreferrer"
              className="text-violet-600 hover:underline">
              app.apollo.io → Settings → Integrations → API
            </a>
          </p>
        </div>

        {/* Role Permissions */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-3 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> ¿Quién puede buscar prospectos?
          </label>

          {settings?.availableRoles?.length === 0 ? (
            <p className="text-xs text-gray-400">No hay roles configurados en tu empresa.</p>
          ) : (
            <div className="space-y-2">
              {(settings?.availableRoles || []).map(role => {
                const isSelected = (settings?.searchRoles || []).includes(role.id);
                return (
                  <label
                    key={role.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors',
                      isSelected
                        ? 'border-violet-400 bg-violet-50'
                        : 'border-gray-200 hover:border-gray-300',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRoleToggle(role.id)}
                        className="w-4 h-4 rounded accent-violet-600"
                      />
                      <span className="text-sm font-medium text-gray-800">{role.name}</span>
                    </div>
                    {isSelected && (
                      <Badge variant="info" className="text-xs bg-violet-100 text-violet-700 border-violet-200">
                        Con acceso
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
          )}

          <p className="text-xs text-gray-400 mt-3">
            Si no seleccionas ningún rol, solo el propietario y roles con "gerencia" o "admin" en su nombre tendrán acceso por defecto.
          </p>
        </div>
      </div>
    </Card>
  );
}

// ─── Integraciones Tab ────────────────────────────────────────────────────────

function IntegracionesTab() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: info } = useQuery({
    queryKey: ['webhook-info'],
    queryFn: () => api.get('/webhook/info').then(r => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['webhook-stats'],
    queryFn: () => api.get('/webhook/stats').then(r => r.data),
    refetchInterval: 10000,
  });

  const { data: events } = useQuery({
    queryKey: ['webhook-events'],
    queryFn: () => api.get('/webhook/events').then(r => r.data.data),
    refetchInterval: 10000,
  });

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copy(text, id)}
      className="flex-shrink-0 p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
    >
      {copiedKey === id ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total mensajes', value: stats.total },
            { label: 'Hoy', value: stats.today },
            { label: 'Leads de WhatsApp', value: stats.newLeads },
            { label: 'Mensajes entrantes', value: stats.inbound },
          ].map(s => (
            <Card key={s.label}>
              <div className="p-4">
                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value ?? '—'}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Webhook config */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <CardTitle>Webhook de WhatsApp</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">Conecta tu agente de WhatsApp con PROSPERA.AI</p>
            </div>
          </div>
        </CardHeader>

        <div className="space-y-4 px-6 pb-6">
          {/* URL */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">URL del Webhook</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <code className="flex-1 text-sm text-gray-800 font-mono break-all">
                {info?.url || 'http://localhost:4000/api/webhook/whatsapp'}
              </code>
              <CopyBtn text={info?.url || ''} id="url" />
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">API Key (X-API-Key)</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <code className="flex-1 text-sm text-gray-800 font-mono break-all">
                {info?.apiKey || '••••••••••••••••'}
              </code>
              <CopyBtn text={info?.apiKey || ''} id="apikey" />
            </div>
          </div>

          {/* Company ID */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Company ID (X-Company-Id)</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <code className="flex-1 text-sm text-gray-800 font-mono break-all">
                {info?.companyId || '—'}
              </code>
              <CopyBtn text={info?.companyId || ''} id="companyid" />
            </div>
          </div>

          {/* Example payload */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Ejemplo de llamada (JSON)</label>
            <div className="relative bg-gray-900 rounded-xl p-4 overflow-x-auto">
              <button
                onClick={() => copy(JSON.stringify(info?.instructions?.body || {}, null, 2), 'payload')}
                className="absolute top-3 right-3 p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                {copiedKey === 'payload' ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-300" />}
              </button>
              <pre className="text-xs text-green-400 font-mono leading-relaxed">
{`POST ${info?.url || 'http://localhost:4000/api/webhook/whatsapp'}
Headers:
  X-API-Key: ${info?.apiKey || 'tu-api-key'}
  X-Company-Id: ${info?.companyId || 'tu-company-id'}
  Content-Type: application/json

Body:
${JSON.stringify({
  phone: '+52 55 1234 5678',
  name: 'Juan Pérez',
  email: 'juan@empresa.com',
  company: 'Empresa SA',
  message: 'Hola, me interesa su producto',
  botResponse: 'Hola Juan, con gusto te ayudo...',
  direction: 'inbound',
}, null, 2)}`}
              </pre>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-blue-800">¿Cómo funciona?</p>
            <div className="space-y-1.5 text-xs text-blue-700">
              {[
                'Tu agente de WhatsApp llama a esta URL cada vez que recibe un mensaje',
                'Si el número de teléfono no existe en el CRM → crea un Lead nuevo automáticamente',
                'Si ya existe → actualiza sus datos y registra el mensaje como actividad',
                'El lead se asigna al siguiente ejecutivo disponible (rotación automática)',
                'El historial de conversaciones aparece en la sección de Actividades del lead',
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="font-bold flex-shrink-0">{i + 1}.</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Apollo Config */}
      <ApolloConfig />

      {/* Recent events */}
      <Card>
        <CardHeader>
          <CardTitle>Últimos mensajes recibidos</CardTitle>
        </CardHeader>
        {!events?.length ? (
          <p className="px-6 pb-6 text-sm text-gray-400">Aún no hay mensajes. Configura tu agente de WhatsApp y los eventos aparecerán aquí.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {(events as Record<string, unknown>[]).map((ev) => (
              <div key={ev.id as string} className="flex items-start gap-3 px-6 py-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  ev.direction === 'inbound' ? 'bg-green-100' : 'bg-blue-100'}`}>
                  {ev.direction === 'inbound'
                    ? <ArrowDownCircle className="w-4 h-4 text-green-600" />
                    : <ArrowUpCircle className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {ev.first_name ? `${ev.first_name} ${ev.last_name || ''}`.trim() : ev.phone as string}
                    </p>
                    <span className="text-xs text-gray-400">{ev.phone as string}</span>
                  </div>
                  {!!ev.message && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">"{String(ev.message)}"</p>
                  )}
                </div>
                <p className="text-xs text-gray-300 flex-shrink-0">
                  {new Date(ev.created_at as string).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function Settings() {
  const [activeTab, setActiveTab] = useState('empresa');
  const { company } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: companyData } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data } = await api.get('/company/settings');
      return data.data;
    },
  });

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<CompanyForm>({
    values: companyData || {},
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<CompanyForm>) => {
      const res = await api.put('/company/settings', data);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Configuración guardada');
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
    },
    onError: () => toast.error('Error al guardar'),
  });

  const planInfo = company?.plan ? PLAN_LABELS[company.plan] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-1">Gestiona la configuración de tu empresa</p>
      </div>

      <div className="flex gap-6">
        {/* Tabs laterales */}
        <div className="w-56 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left',
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenido */}
        <div className="flex-1">
          {activeTab === 'empresa' && (
            <Card>
              <CardHeader>
                <CardTitle>Información de la Empresa</CardTitle>
              </CardHeader>
              <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Nombre de la empresa"
                    error={errors.name?.message}
                    required
                    {...register('name', { required: 'Requerido' })}
                  />
                  <Input
                    label="Sitio web"
                    placeholder="https://..."
                    leftAddon={<Globe className="w-4 h-4" />}
                    {...register('website')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Teléfono" placeholder="+52 55 1234 5678" {...register('phone')} />
                  <Input label="Correo de contacto" type="email" {...register('email')} />
                </div>
                <Input label="Dirección" {...register('address')} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Ciudad" {...register('city')} />
                  <Input label="País" {...register('country')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Zona horaria</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      {...register('timezone')}
                    >
                      <option value="America/Mexico_City">Ciudad de México (UTC-6)</option>
                      <option value="America/Bogota">Bogotá (UTC-5)</option>
                      <option value="America/Lima">Lima (UTC-5)</option>
                      <option value="America/Santiago">Santiago (UTC-3)</option>
                      <option value="America/Buenos_Aires">Buenos Aires (UTC-3)</option>
                      <option value="America/Los_Angeles">Los Ángeles (UTC-8)</option>
                      <option value="America/New_York">Nueva York (UTC-5)</option>
                      <option value="Europe/Madrid">Madrid (UTC+1)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Moneda</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      {...register('currency')}
                    >
                      <option value="MXN">MXN — Peso Mexicano</option>
                      <option value="USD">USD — Dólar Americano</option>
                      <option value="COP">COP — Peso Colombiano</option>
                      <option value="PEN">PEN — Sol Peruano</option>
                      <option value="ARS">ARS — Peso Argentino</option>
                      <option value="CLP">CLP — Peso Chileno</option>
                      <option value="EUR">EUR — Euro</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" loading={updateMutation.isPending} disabled={!isDirty}>
                    Guardar cambios
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {activeTab === 'plan' && (
            <Card>
              <CardHeader>
                <CardTitle>Plan y Facturación</CardTitle>
                {planInfo && <Badge className={planInfo.color}>{planInfo.label}</Badge>}
              </CardHeader>
              <div className="space-y-6">
                <div className="p-5 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-700 mb-1">Plan actual</p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">{company?.plan}</p>
                  {company?.plan === 'trial' && (
                    <p className="text-sm text-amber-600 mt-2">Tu período de prueba está activo</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { name: 'Starter', price: '$299', features: ['5 usuarios', 'CRM completo', 'Soporte por correo'] },
                    { name: 'Growth', price: '$699', features: ['15 usuarios', 'CRM + ERP', 'Marketing', 'Soporte prioritario'], popular: true },
                    { name: 'Enterprise', price: 'Custom', features: ['Usuarios ilimitados', 'Todo incluido', 'IA integrada', 'Gerente de cuenta'] },
                  ].map((plan) => (
                    <div key={plan.name} className={cn('p-5 rounded-xl border-2 transition-colors', plan.popular ? 'border-primary-500 bg-primary-50' : 'border-gray-200')}>
                      {plan.popular && (
                        <Badge variant="info" className="mb-3">Más popular</Badge>
                      )}
                      <p className="font-bold text-gray-900 text-lg">{plan.name}</p>
                      <p className="text-2xl font-bold text-primary-600 my-2">{plan.price}<span className="text-sm text-gray-500">/mes</span></p>
                      <ul className="space-y-1.5 text-sm text-gray-600">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2">
                            <span className="text-emerald-500">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                      <Button size="sm" variant={plan.popular ? 'primary' : 'outline'} className="w-full mt-4">
                        {company?.plan === plan.name.toLowerCase() ? 'Plan actual' : 'Seleccionar'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'seguridad' && (
            <Card>
              <CardHeader>
                <CardTitle>Seguridad</CardTitle>
              </CardHeader>
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Autenticación de dos factores</p>
                    <p className="text-sm text-blue-700 mt-1">Próximamente disponible. Añade una capa extra de seguridad.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-700">Cambiar contraseña</p>
                  <Input label="Contraseña actual" type="password" />
                  <Input label="Nueva contraseña" type="password" />
                  <Input label="Confirmar nueva contraseña" type="password" />
                  <Button>Actualizar contraseña</Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'notificaciones' && (
            <Card>
              <CardHeader>
                <CardTitle>Notificaciones</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                {[
                  { label: 'Nuevo lead', desc: 'Cuando se crea un nuevo lead en tu empresa' },
                  { label: 'Tarea vencida', desc: 'Cuando una tarea pasa su fecha límite' },
                  { label: 'Oportunidad ganada', desc: 'Cuando se cierra una venta exitosamente' },
                  { label: 'Reporte semanal', desc: 'Resumen de actividad cada lunes' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {activeTab === 'integraciones' && <IntegracionesTab />}
        </div>
      </div>
    </div>
  );
}
