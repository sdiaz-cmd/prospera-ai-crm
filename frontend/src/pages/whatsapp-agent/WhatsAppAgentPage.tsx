import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageCircle, Bot, Send, Phone, User,
  Inbox, Settings2, Zap, ZapOff, Plus, Trash2, RefreshCw
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { cn } from '@/utils/helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WaConversation {
  id: string; phone: string; contactId: string | null; leadId: string | null;
  contactName: string; unreadCount: number; lastMessage: string; lastMessageAt: string;
}

interface WaMessage {
  id: string; phone: string; direction: 'inbound' | 'outbound';
  body: string; isBot: boolean; createdAt: string;
}

interface QAPair { question: string; answer: string; }

interface AgentConfig {
  isActive: boolean; agentName: string; businessDescription: string;
  businessHours: string; tone: string; mainGoal: string;
  greeting: string; qualificationQuestions: string[];
  knowledgeBase: QAPair[]; specialAnnouncement: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Inbox Tab ────────────────────────────────────────────────────────────────

function InboxTab({ agentActive, onToggle }: { agentActive: boolean; onToggle: () => void }) {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: conversations = [], isLoading: loadingConvs } = useQuery<WaConversation[]>({
    queryKey: ['wa-conversations'],
    queryFn: () => api.get('/whatsapp/conversations').then(r => r.data.data),
    refetchInterval: 5000,
  });

  const { data: messages = [], isLoading: loadingMsgs } = useQuery<WaMessage[]>({
    queryKey: ['wa-messages', selectedPhone],
    queryFn: () => api.get(`/whatsapp/conversations/${selectedPhone}`).then(r => r.data.data),
    enabled: !!selectedPhone,
    refetchInterval: 3000,
  });

  const sendMut = useMutation({
    mutationFn: ({ phone, body }: { phone: string; body: string }) =>
      api.post('/whatsapp/send', { phone, body }),
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['wa-messages', selectedPhone] });
      qc.invalidateQueries({ queryKey: ['wa-conversations'] });
    },
    onError: () => toast.error('Error al enviar el mensaje'),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!draft.trim() || !selectedPhone) return;
    sendMut.mutate({ phone: selectedPhone, body: draft.trim() });
  };

  const selectedConv = conversations.find(c => c.phone === selectedPhone);

  return (
    <div className="flex h-[calc(100vh-200px)] bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
      {/* Left: conversation list */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Conversaciones</h3>
            <button onClick={() => qc.invalidateQueries({ queryKey: ['wa-conversations'] })}
              className="text-gray-500 hover:text-gray-300 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onToggle}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              agentActive
                ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            )}
          >
            {agentActive ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            <span>{agentActive ? 'MODO IA — Activo' : 'MODO HUMANO — Manual'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Cargando...</div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm gap-2 px-4 text-center">
              <MessageCircle className="w-8 h-8 text-gray-700" />
              <p>Aún no hay conversaciones.</p>
              <p className="text-xs">Los mensajes aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.phone}
                onClick={() => setSelectedPhone(conv.phone)}
                className={cn(
                  'w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors border-b border-gray-800/50',
                  selectedPhone === conv.phone && 'bg-gray-800'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    {conv.contactId ? <User className="w-5 h-5 text-blue-400" /> : <Phone className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white truncate">{conv.contactName}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-1">{timeAgo(conv.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-400 truncate">{conv.lastMessage || '...'}</p>
                      {conv.unreadCount > 0 && (
                        <span className="ml-2 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    {conv.contactId && <span className="text-xs text-blue-500">Contacto CRM</span>}
                    {conv.leadId && !conv.contactId && <span className="text-xs text-yellow-500">Lead CRM</span>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: chat */}
      <div className="flex-1 flex flex-col">
        {!selectedPhone ? (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-700" />
              <p className="text-sm">Selecciona una conversación</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center">
                {selectedConv?.contactId ? <User className="w-4 h-4 text-blue-400" /> : <Phone className="w-4 h-4 text-gray-400" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{selectedConv?.contactName}</p>
                <p className="text-xs text-gray-500">+{selectedPhone}</p>
              </div>
              {selectedConv?.contactId && (
                <span className="ml-auto text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-600/30">Contacto CRM</span>
              )}
              {selectedConv?.leadId && !selectedConv?.contactId && (
                <span className="ml-auto text-xs bg-yellow-600/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-600/30">Lead CRM</span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="text-center text-gray-500 text-sm py-8">Cargando mensajes...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-600 text-sm py-8">Sin mensajes aún</div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm',
                      msg.direction === 'outbound' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                    )}>
                      <p>{msg.body}</p>
                      <div className={cn('flex items-center gap-1 mt-1', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                        <span className="text-xs opacity-60">
                          {new Date(msg.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.isBot && <span className="text-xs opacity-60 flex items-center gap-0.5"><Bot className="w-3 h-3" /> IA</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-800">
              {agentActive && (
                <div className="mb-2 flex items-center gap-2 text-xs text-blue-400 bg-blue-600/10 rounded-lg px-3 py-2">
                  <Zap className="w-3.5 h-3.5" />
                  <span>MODO IA activo — el agente responde automáticamente.</span>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-gray-800 text-white text-sm rounded-xl px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-600"
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() || sendMut.isPending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl px-4 py-2.5 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Agent Config Tab ─────────────────────────────────────────────────────────

function AgentConfigTab() {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery<AgentConfig>({
    queryKey: ['whatsapp-agent-config'],
    queryFn: () => api.get('/whatsapp-agent').then(r => r.data.data as AgentConfig),
  });

  const [form, setForm] = useState<AgentConfig>({
    isActive: false, agentName: 'Asistente', businessDescription: '',
    businessHours: '', tone: 'amigable', mainGoal: 'capturar_lead',
    greeting: '', qualificationQuestions: [], knowledgeBase: [], specialAnnouncement: '',
  });

  useEffect(() => { if (config) setForm(config); }, [config]);

  const saveMut = useMutation({
    mutationFn: (data: AgentConfig) => api.post('/whatsapp-agent', data),
    onSuccess: () => {
      toast.success('Configuración guardada');
      qc.invalidateQueries({ queryKey: ['whatsapp-agent-config'] });
    },
    onError: () => toast.error('Error al guardar'),
  });

  if (isLoading) return <div className="py-12 text-center text-gray-500">Cargando...</div>;

  const addQuestion = () => setForm(f => ({ ...f, qualificationQuestions: [...f.qualificationQuestions, ''] }));
  const removeQuestion = (i: number) => setForm(f => ({ ...f, qualificationQuestions: f.qualificationQuestions.filter((_, idx) => idx !== i) }));
  const updateQuestion = (i: number, val: string) => setForm(f => ({ ...f, qualificationQuestions: f.qualificationQuestions.map((q, idx) => idx === i ? val : q) }));
  const addKB = () => setForm(f => ({ ...f, knowledgeBase: [...f.knowledgeBase, { question: '', answer: '' }] }));
  const removeKB = (i: number) => setForm(f => ({ ...f, knowledgeBase: f.knowledgeBase.filter((_, idx) => idx !== i) }));
  const updateKB = (i: number, field: 'question' | 'answer', val: string) =>
    setForm(f => ({ ...f, knowledgeBase: f.knowledgeBase.map((kb, idx) => idx === i ? { ...kb, [field]: val } : kb) }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4">
        <p className="text-xs text-amber-400 font-medium mb-1">⚡ Aviso temporal (solo por hoy)</p>
        <textarea
          value={form.specialAnnouncement}
          onChange={e => setForm(f => ({ ...f, specialAnnouncement: e.target.value }))}
          placeholder="Ej: Hoy hay descuento del 20% en todos los productos."
          rows={2}
          className="w-full bg-transparent text-sm text-amber-100 placeholder-amber-800 focus:outline-none resize-none"
        />
      </div>

      <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-700/50 space-y-4">
        <h3 className="text-sm font-semibold text-gray-200">Personalidad del Agente</h3>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Nombre del agente</label>
          <input value={form.agentName} onChange={e => setForm(f => ({ ...f, agentName: e.target.value }))}
            className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Tono</label>
          <div className="flex gap-2">
            {(['amigable', 'profesional', 'formal'] as const).map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, tone: t }))}
                className={cn('px-3 py-1.5 rounded-lg text-sm capitalize transition-colors',
                  form.tone === t ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Saludo inicial</label>
          <textarea value={form.greeting} onChange={e => setForm(f => ({ ...f, greeting: e.target.value }))}
            rows={2} placeholder="Hola! Soy {nombre}, ¿en qué te puedo ayudar?"
            className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500 resize-none" />
        </div>
      </div>

      <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-700/50 space-y-4">
        <h3 className="text-sm font-semibold text-gray-200">Sobre el Negocio</h3>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Descripción</label>
          <textarea value={form.businessDescription} onChange={e => setForm(f => ({ ...f, businessDescription: e.target.value }))}
            rows={3} placeholder="Somos una empresa dedicada a..."
            className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500 resize-none" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Horario de atención</label>
          <input value={form.businessHours} onChange={e => setForm(f => ({ ...f, businessHours: e.target.value }))}
            placeholder="Lun-Vie 9:00-18:00"
            className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500" />
        </div>
      </div>

      <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-700/50 space-y-3">
        <h3 className="text-sm font-semibold text-gray-200">Objetivo principal</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'capturar_lead', label: 'Capturar lead', desc: 'Recopilar datos del contacto' },
            { value: 'agendar_cita', label: 'Agendar cita', desc: 'Coordinar reunión o llamada' },
            { value: 'soporte', label: 'Soporte', desc: 'Resolver dudas y problemas' },
            { value: 'ventas', label: 'Ventas', desc: 'Guiar hacia la compra' },
          ].map(o => (
            <button key={o.value} onClick={() => setForm(f => ({ ...f, mainGoal: o.value }))}
              className={cn('p-3 rounded-xl text-left transition-all border',
                form.mainGoal === o.value
                  ? 'bg-blue-600/20 border-blue-600/50 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600')}>
              <p className="text-sm font-medium">{o.label}</p>
              <p className="text-xs mt-0.5 opacity-70">{o.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-700/50 space-y-3">
        <h3 className="text-sm font-semibold text-gray-200">Preguntas de calificación</h3>
        {form.qualificationQuestions.map((q, i) => (
          <div key={i} className="flex gap-2">
            <input value={q} onChange={e => updateQuestion(i, e.target.value)} placeholder={`Pregunta ${i + 1}`}
              className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500" />
            <button onClick={() => removeQuestion(i)} className="text-gray-600 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button onClick={addQuestion} className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors">
          <Plus className="w-4 h-4" /> Agregar pregunta
        </button>
      </div>

      <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-700/50 space-y-3">
        <h3 className="text-sm font-semibold text-gray-200">Base de conocimiento</h3>
        {form.knowledgeBase.map((kb, i) => (
          <div key={i} className="bg-gray-800/50 rounded-xl p-3 space-y-2 border border-gray-700">
            <input value={kb.question} onChange={e => updateKB(i, 'question', e.target.value)} placeholder="Pregunta frecuente"
              className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500" />
            <textarea value={kb.answer} onChange={e => updateKB(i, 'answer', e.target.value)} placeholder="Respuesta" rows={2}
              className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500 resize-none" />
            <button onClick={() => removeKB(i)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Eliminar
            </button>
          </div>
        ))}
        <button onClick={addKB} className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors">
          <Plus className="w-4 h-4" /> Agregar pregunta/respuesta
        </button>
      </div>

      <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors">
        {saveMut.isPending ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function WhatsAppAgentPage() {
  const [tab, setTab] = useState<'inbox' | 'config'>('inbox');
  const qc = useQueryClient();

  const { data: config } = useQuery<AgentConfig>({
    queryKey: ['whatsapp-agent-config'],
    queryFn: () => api.get('/whatsapp-agent').then(r => r.data.data as AgentConfig),
  });

  const { data: unread } = useQuery<{ count: number }>({
    queryKey: ['wa-unread'],
    queryFn: () => api.get('/whatsapp/unread-count').then(r => r.data.data),
    refetchInterval: 10000,
  });

  const toggleModeMut = useMutation({
    mutationFn: () => api.post('/whatsapp-agent', { ...config, isActive: !config?.isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-agent-config'] });
      toast.success(config?.isActive ? 'MODO HUMANO activado' : 'MODO IA activado');
    },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Agente WhatsApp</h1>
            <p className="text-sm text-gray-400">Bandeja de entrada y configuración del agente IA</p>
          </div>
        </div>
        <div className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium',
          config?.isActive ? 'bg-blue-600/20 border-blue-600/40 text-blue-400' : 'bg-gray-800 border-gray-700 text-gray-400'
        )}>
          {config?.isActive ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
          {config?.isActive ? 'MODO IA' : 'MODO HUMANO'}
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-800/50 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('inbox')}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'inbox' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200')}>
          <Inbox className="w-4 h-4" />
          Bandeja de entrada
          {(unread?.count || 0) > 0 && (
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
              {unread?.count}
            </span>
          )}
        </button>
        <button onClick={() => setTab('config')}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'config' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200')}>
          <Settings2 className="w-4 h-4" />
          Configurar Agente
        </button>
      </div>

      {tab === 'inbox'
        ? <InboxTab agentActive={config?.isActive || false} onToggle={() => toggleModeMut.mutate()} />
        : <AgentConfigTab />
      }
    </div>
  );
}
