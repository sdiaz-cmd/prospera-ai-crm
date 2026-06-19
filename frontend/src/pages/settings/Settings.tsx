import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Globe, CreditCard, Shield, Bell, Zap, Copy, CheckCircle, MessageCircle, ArrowDownCircle, ArrowUpCircle, Telescope, KeyRound, Users, Wifi, WifiOff, RefreshCw, Smartphone, Mail, Unlink } from 'lucide-react';
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

// ─── WhatsApp QR Panel ────────────────────────────────────────────────────────

type WaStatus = 'disconnected' | 'qr' | 'connecting' | 'connected';

function WhatsAppPanel() {
  const [status, setStatus] = useState<WaStatus>('disconnected');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch initial status
  useEffect(() => {
    api.get('/whatsapp/status').then(r => {
      const d = r.data.data;
      setStatus(d.status);
      setPhone(d.phone || null);
      if (d.qr) setQrDataUrl(d.qr);
    }).catch(() => {});
  }, []);

  // Open SSE stream while not connected
  useEffect(() => {
    if (status === 'connected') {
      eventSourceRef.current?.close();
      return;
    }

    const token = localStorage.getItem('accessToken');
    const baseUrl = (import.meta as any).env?.VITE_API_URL || '/api';

    // SSE with auth header isn't possible natively — pass token as query param
    const url = `${baseUrl}/whatsapp/stream?token=${token}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'qr') {
          setStatus('qr');
          setQrDataUrl(event.qr);
        } else if (event.type === 'connected') {
          setStatus('connected');
          setQrDataUrl(null);
          setPhone(event.phone || null);
          setConnecting(false);
        } else if (event.type === 'disconnected') {
          setStatus('disconnected');
          setQrDataUrl(null);
          setPhone(null);
        }
      } catch {}
    };

    return () => es.close();
  }, [status]);

  const handleConnect = async () => {
    setConnecting(true);
    setStatus('connecting');
    try {
      await api.post('/whatsapp/connect');
    } catch {
      setConnecting(false);
      setStatus('disconnected');
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await api.post('/whatsapp/disconnect');
      setStatus('disconnected');
      setQrDataUrl(null);
      setPhone(null);
    } finally {
      setDisconnecting(false);
    }
  };

  const statusConfig: Record<WaStatus, { label: string; color: string; icon: JSX.Element }> = {
    disconnected: { label: 'Desconectado', color: 'text-gray-400', icon: <WifiOff className="w-4 h-4" /> },
    connecting:   { label: 'Iniciando...', color: 'text-yellow-500', icon: <RefreshCw className="w-4 h-4 animate-spin" /> },
    qr:           { label: 'Escanea el QR', color: 'text-blue-500', icon: <Smartphone className="w-4 h-4" /> },
    connected:    { label: `Conectado${phone ? ` · +${phone}` : ''}`, color: 'text-green-600', icon: <Wifi className="w-4 h-4" /> },
  };

  const sc = statusConfig[status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <CardTitle>WhatsApp</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">Conecta tu número y recibe leads automáticamente</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-medium ${sc.color}`}>
            {sc.icon}
            <span>{sc.label}</span>
          </div>
        </div>
      </CardHeader>

      <div className="px-6 pb-6 space-y-5">
        {/* QR code display */}
        {(status === 'qr' || status === 'connecting') && (
          <div className="flex flex-col items-center gap-4 py-4">
            {status === 'qr' && qrDataUrl ? (
              <>
                <div className="p-3 bg-white border-2 border-gray-200 rounded-2xl shadow-sm">
                  <img src={qrDataUrl} alt="QR WhatsApp" className="w-52 h-52" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-gray-800">Escanea con tu teléfono</p>
                  <p className="text-xs text-gray-400">Abre WhatsApp → Dispositivos vinculados → Vincular un dispositivo</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                <p className="text-sm text-gray-500">Generando código QR...</p>
              </div>
            )}
          </div>
        )}

        {/* Connected state */}
        {status === 'connected' && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Wifi className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">WhatsApp conectado</p>
              {phone && <p className="text-xs text-green-600">+{phone}</p>}
              <p className="text-xs text-green-600 mt-0.5">Los mensajes entrantes crean leads automáticamente</p>
            </div>
          </div>
        )}

        {/* Disconnected state */}
        {status === 'disconnected' && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700">¿Cómo funciona?</p>
            <div className="space-y-1.5 text-xs text-gray-500">
              {[
                'Haz clic en "Conectar WhatsApp" y aparecerá un código QR',
                'Ábrelo con tu teléfono en WhatsApp → Dispositivos vinculados',
                'Cada mensaje recibido crea o actualiza un Lead en el CRM',
                'El lead se asigna automáticamente al siguiente ejecutivo disponible',
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="font-bold text-gray-400 flex-shrink-0">{i + 1}.</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {status !== 'connected' ? (
            <Button
              onClick={handleConnect}
              loading={connecting || status === 'connecting'}
              disabled={status === 'qr'}
              className="flex-1"
            >
              {status === 'qr' ? 'Esperando escaneo...' : 'Conectar WhatsApp'}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              loading={disconnecting}
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
            >
              Desconectar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Gmail / Google OAuth Config ─────────────────────────────────────────────

function GmailConfig() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['google-status'],
    queryFn: () => api.get('/auth/google/status').then(r => r.data.data as {
      connected: boolean;
      gmailConnected: boolean;
      googleEmail: string | null;
    }),
  });

  const disconnect = useMutation({
    mutationFn: () => api.delete('/auth/google/disconnect'),
    onSuccess: () => {
      toast.success('Google desvinculado');
      qc.invalidateQueries({ queryKey: ['google-status'] });
    },
    onError: () => toast.error('Error al desvincular Google'),
  });

  const handleConnect = () => {
    const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '');
    window.location.href = `${base}/api/auth/google/connect`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <Mail className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <CardTitle>Gmail / Google</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              Vincula tu cuenta de Google para enviar campañas desde tu correo
            </p>
          </div>
        </div>
      </CardHeader>

      <div className="px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Verificando conexión…
          </div>
        ) : data?.gmailConnected ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Gmail conectado</p>
                <p className="text-xs text-gray-400">{data.googleEmail}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Unlink className="w-4 h-4" />}
              loading={disconnect.isPending}
              onClick={() => disconnect.mutate()}
              className="text-red-500 hover:bg-red-50"
            >
              Desconectar
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <WifiOff className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">No conectado</p>
                <p className="text-xs text-gray-400">
                  Conecta Gmail para enviar emails desde tus campañas
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleConnect}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.826.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Conectar con Google
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Integraciones Tab ────────────────────────────────────────────────────────

function IntegracionesTab() {
  const { data: stats } = useQuery({
    queryKey: ['webhook-stats'],
    queryFn: () => api.get('/webhook/stats').then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: events } = useQuery({
    queryKey: ['webhook-events'],
    queryFn: () => api.get('/webhook/events').then(r => r.data.data),
    refetchInterval: 15000,
  });

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

      {/* QR Panel */}
      <WhatsAppPanel />

      {/* Apollo Config */}
      <ApolloConfig />

      {/* Gmail / Google OAuth */}
      <GmailConfig />

      {/* Recent events */}
      <Card>
        <CardHeader>
          <CardTitle>Últimos mensajes recibidos</CardTitle>
        </CardHeader>
        {!events?.length ? (
          <p className="px-6 pb-6 text-sm text-gray-400">Aún no hay mensajes. Conecta WhatsApp y los eventos aparecerán aquí.</p>
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
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'empresa';
  });
  const { company } = useAuthStore();
  const queryClient = useQueryClient();

  // Handle redirect back from Google OAuth connect flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmailConnected') === '1') {
      queryClient.invalidateQueries({ queryKey: ['google-status'] });
      toast.success('Gmail conectado correctamente');
      window.history.replaceState({}, '', '/settings?tab=integraciones');
    }
  }, [queryClient]);

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
                    { name: 'Starter', price: '$80.000 CLP', subPrice: '~$88 USD', features: ['5 usuarios', 'CRM completo', 'Soporte por correo'] },
                    { name: 'Growth', price: '$150.000 CLP', subPrice: '~$164 USD', features: ['15 usuarios', 'CRM + ERP', 'Marketing', 'Soporte prioritario'], popular: true },
                    { name: 'Enterprise', price: '$250.000 CLP', subPrice: '~$274 USD', features: ['Usuarios ilimitados', 'Todo incluido', 'IA integrada', 'Gerente de cuenta'] },
                  ].map((plan) => (
                    <div key={plan.name} className={cn('p-5 rounded-xl border-2 transition-colors', plan.popular ? 'border-primary-500 bg-primary-50' : 'border-gray-200')}>
                      {plan.popular && (
                        <Badge variant="info" className="mb-3">Más popular</Badge>
                      )}
                      <p className="font-bold text-gray-900 text-lg">{plan.name}</p>
                      <p className="text-xl font-bold text-primary-600 my-1">{plan.price}<span className="text-sm text-gray-500 font-normal">/mes</span></p>
                      <p className="text-sm text-gray-400 mb-3">{(plan as { subPrice?: string }).subPrice}/mes</p>
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
