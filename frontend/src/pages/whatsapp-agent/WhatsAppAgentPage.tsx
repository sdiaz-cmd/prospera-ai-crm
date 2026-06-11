import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageCircle, Bot, Send, Phone, User,
  Settings2, Zap, ZapOff, Plus, Trash2, RefreshCw,
  CheckCheck, Circle
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

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function ConvAvatar({ name, isContact }: { name: string; isContact: boolean }) {
  return (
    <div className={cn(
      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0',
      isContact ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
    )}>
      {name && name !== '+' ? getInitials(name) : <Phone className="w-4 h-4" />}
    </div>
  );
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
    <div className="flex bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-card" style={{ height: 'calc(100vh - 220px)', minHeight: 500 }}>

      {/* ── Left: conversation list ─────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Conversaciones</span>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ['wa-conversations'] })}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* MODO toggle */}
          <button
            onClick={onToggle}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
              agentActive
                ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            )}
          >
            {agentActive
              ? <Zap className="w-4 h-4" />
              : <ZapOff className="w-4 h-4 text-gray-400" />
            }
            <span>{agentActive ? 'MODO IA — Activo' : 'MODO HUMANO'}</span>
            <span className={cn(
              'ml-auto w-2 h-2 rounded-full',
              agentActive ? 'bg-white/70' : 'bg-gray-300'
            )} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 px-6 text-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Sin conversaciones aún</p>
              <p className="text-xs text-gray-400">Los mensajes aparecerán aquí automáticamente</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.phone}
                onClick={() => setSelectedPhone(conv.phone)}
                className={cn(
                  'w-full px-4 py-3.5 text-left transition-colors border-b border-gray-100/70',
                  selectedPhone === conv.phone
                    ? 'bg-primary-50 border-l-2 border-l-primary-600'
                    : 'hover:bg-white border-l-2 border-l-transparent'
                )}
              >
                <div className="flex items-center gap-3">
                  <ConvAvatar name={conv.contactName} isContact={!!conv.contactId} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={cn(
                        'text-sm truncate',
                        conv.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                      )}>
                        {conv.contactName}
                      </span>
                      <span className="text-[11px] text-gray-400 flex-shrink-0 ml-1">{timeAgo(conv.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400 truncate">{conv.lastMessage || 'Sin mensajes'}</p>
                      {conv.unreadCount > 0 && (
                        <span className="ml-2 min-w-[18px] h-[18px] rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center px-1 flex-shrink-0">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {conv.contactId && (
                        <span className="text-[10px] text-primary-600 font-medium flex items-center gap-0.5">
                          <User className="w-2.5 h-2.5" /> Contacto
                        </span>
                      )}
                      {conv.leadId && !conv.contactId && (
                        <span className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5">
                          <Circle className="w-2.5 h-2.5" /> Lead
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right: chat view ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {!selectedPhone ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50/50">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto">
                <MessageCircle className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Selecciona una conversación</p>
              <p className="text-xs text-gray-400">Elige un chat de la lista para empezar</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 bg-white">
              <ConvAvatar name={selectedConv?.contactName || selectedPhone} isContact={!!selectedConv?.contactId} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{selectedConv?.contactName}</p>
                <p className="text-xs text-gray-400">+{selectedPhone}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedConv?.contactId && (
                  <span className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-medium border border-primary-100">
                    Contacto CRM
                  </span>
                )}
                {selectedConv?.leadId && !selectedConv?.contactId && (
                  <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium border border-amber-100">
                    Lead CRM
                  </span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-5 py-4 space-y-2"
              style={{ background: 'linear-gradient(180deg, #f8faff 0%, #f9fafb 100%)' }}
            >
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-400">Sin mensajes aún</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isOut = msg.direction === 'outbound';
                  const prevMsg = messages[i - 1];
                  const showTime = !prevMsg || new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000;
                  return (
                    <div key={msg.id}>
                      {showTime && (
                        <div className="flex justify-center my-3">
                          <span className="text-[10px] text-gray-400 bg-white border border-gray-100 px-2.5 py-0.5 rounded-full shadow-sm">
                            {new Date(msg.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      <div className={cn('flex', isOut ? 'justify-end' : 'justify-start')}>
                        <div className={cn(
                          'max-w-[68%] rounded-2xl px-4 py-2.5 shadow-sm',
                          isOut
                            ? 'bg-primary-600 text-white rounded-br-md'
                            : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'
                        )}>
                          <p className="text-sm leading-relaxed">{msg.body}</p>
                          <div className={cn('flex items-center gap-1 mt-1', isOut ? 'justify-end' : 'justify-start')}>
                            {msg.isBot && (
                              <span className={cn('text-[10px] flex items-center gap-0.5', isOut ? 'text-white/60' : 'text-gray-400')}>
                                <Bot className="w-3 h-3" /> IA
                              </span>
                            )}
                            {isOut && <CheckCheck className="w-3 h-3 text-white/60" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-5 py-4 border-t border-gray-100 bg-white">
              {agentActive && (
                <div className="mb-3 flex items-center gap-2 text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded-xl px-3 py-2">
                  <Zap className="w-3.5 h-3.5 text-primary-500" />
                  <span>El agente IA está respondiendo automáticamente. Puedes escribir para tomar el control.</span>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-gray-50 text-gray-900 text-sm rounded-xl px-4 py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 placeholder-gray-400 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() || sendMut.isPending}
                  className="bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 transition-colors shadow-sm shadow-primary-600/20"
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

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const inputClass = "w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all placeholder-gray-400";
  const textareaClass = `${inputClass} resize-none`;
  const cardClass = "bg-white rounded-2xl p-6 border border-gray-200 shadow-card space-y-4";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  const addQuestion = () => setForm(f => ({ ...f, qualificationQuestions: [...f.qualificationQuestions, ''] }));
  const removeQuestion = (i: number) => setForm(f => ({ ...f, qualificationQuestions: f.qualificationQuestions.filter((_, idx) => idx !== i) }));
  const updateQuestion = (i: number, val: string) => setForm(f => ({ ...f, qualificationQuestions: f.qualificationQuestions.map((q, idx) => idx === i ? val : q) }));
  const addKB = () => setForm(f => ({ ...f, knowledgeBase: [...f.knowledgeBase, { question: '', answer: '' }] }));
  const removeKB = (i: number) => setForm(f => ({ ...f, knowledgeBase: f.knowledgeBase.filter((_, idx) => idx !== i) }));
  const updateKB = (i: number, field: 'question' | 'answer', val: string) =>
    setForm(f => ({ ...f, knowledgeBase: f.knowledgeBase.map((kb, idx) => idx === i ? { ...kb, [field]: val } : kb) }));

  return (
    <div className="space-y-5 max-w-2xl">

      {/* Special announcement */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">⚡ Aviso temporal (solo hoy)</p>
        <textarea
          value={form.specialAnnouncement}
          onChange={e => setForm(f => ({ ...f, specialAnnouncement: e.target.value }))}
          placeholder="Ej: Hoy hay descuento del 20% en todos los productos."
          rows={2}
          className="w-full bg-transparent text-sm text-amber-800 placeholder-amber-400 focus:outline-none resize-none"
        />
      </div>

      {/* Personality */}
      <div className={cardClass}>
        <h3 className="text-sm font-bold text-gray-900">Personalidad del Agente</h3>
        <div>
          <label className={labelClass}>Nombre del agente</label>
          <input value={form.agentName} onChange={e => setForm(f => ({ ...f, agentName: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Tono de respuesta</label>
          <div className="flex gap-2">
            {(['amigable', 'profesional', 'formal'] as const).map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, tone: t }))}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all border',
                  form.tone === t
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                )}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass}>Saludo inicial</label>
          <textarea value={form.greeting} onChange={e => setForm(f => ({ ...f, greeting: e.target.value }))}
            rows={2} placeholder="Hola! Soy {nombre}, ¿en qué te puedo ayudar?"
            className={textareaClass} />
        </div>
      </div>

      {/* Business info */}
      <div className={cardClass}>
        <h3 className="text-sm font-bold text-gray-900">Sobre el Negocio</h3>
        <div>
          <label className={labelClass}>Descripción de la empresa</label>
          <textarea value={form.businessDescription} onChange={e => setForm(f => ({ ...f, businessDescription: e.target.value }))}
            rows={3} placeholder="Somos una empresa dedicada a..."
            className={textareaClass} />
        </div>
        <div>
          <label className={labelClass}>Horario de atención</label>
          <input value={form.businessHours} onChange={e => setForm(f => ({ ...f, businessHours: e.target.value }))}
            placeholder="Lun-Vie 9:00-18:00"
            className={inputClass} />
        </div>
      </div>

      {/* Goal */}
      <div className={cardClass}>
        <h3 className="text-sm font-bold text-gray-900">Objetivo principal</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { value: 'capturar_lead', label: 'Capturar lead', desc: 'Recopilar datos del contacto', icon: '🎯' },
            { value: 'agendar_cita', label: 'Agendar cita', desc: 'Coordinar reunión o llamada', icon: '📅' },
            { value: 'soporte', label: 'Soporte', desc: 'Resolver dudas y problemas', icon: '🛟' },
            { value: 'ventas', label: 'Ventas', desc: 'Guiar hacia la compra', icon: '💰' },
          ].map(o => (
            <button key={o.value} onClick={() => setForm(f => ({ ...f, mainGoal: o.value }))}
              className={cn(
                'p-4 rounded-xl text-left transition-all border',
                form.mainGoal === o.value
                  ? 'bg-primary-50 border-primary-300 shadow-sm'
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}>
              <div className="text-xl mb-1">{o.icon}</div>
              <p className={cn('text-sm font-semibold', form.mainGoal === o.value ? 'text-primary-700' : 'text-gray-800')}>{o.label}</p>
              <p className={cn('text-xs mt-0.5', form.mainGoal === o.value ? 'text-primary-600/70' : 'text-gray-400')}>{o.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Qualification questions */}
      <div className={cardClass}>
        <h3 className="text-sm font-bold text-gray-900">Preguntas de calificación</h3>
        <div className="space-y-2.5">
          {form.qualificationQuestions.map((q, i) => (
            <div key={i} className="flex gap-2">
              <input value={q} onChange={e => updateQuestion(i, e.target.value)} placeholder={`Pregunta ${i + 1}`}
                className={cn(inputClass, 'flex-1')} />
              <button onClick={() => removeQuestion(i)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addQuestion} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
          <Plus className="w-4 h-4" /> Agregar pregunta
        </button>
      </div>

      {/* Knowledge base */}
      <div className={cardClass}>
        <h3 className="text-sm font-bold text-gray-900">Base de conocimiento</h3>
        <div className="space-y-3">
          {form.knowledgeBase.map((kb, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-2.5 border border-gray-100">
              <input value={kb.question} onChange={e => updateKB(i, 'question', e.target.value)} placeholder="Pregunta frecuente"
                className={inputClass} />
              <textarea value={kb.answer} onChange={e => updateKB(i, 'answer', e.target.value)} placeholder="Respuesta" rows={2}
                className={textareaClass} />
              <button onClick={() => removeKB(i)} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-medium transition-colors">
                <Trash2 className="w-3 h-3" /> Eliminar
              </button>
            </div>
          ))}
        </div>
        <button onClick={addKB} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
          <Plus className="w-4 h-4" /> Agregar pregunta/respuesta
        </button>
      </div>

      <button
        onClick={() => saveMut.mutate(form)}
        disabled={saveMut.isPending}
        className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-2xl transition-colors shadow-sm shadow-primary-600/20"
      >
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
      toast.success(config?.isActive ? '🧑 MODO HUMANO activado' : '⚡ MODO IA activado');
    },
  });

  const isActive = config?.isActive || false;

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-[#25D366] rounded-2xl flex items-center justify-center shadow-sm shadow-green-500/20">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Agente WhatsApp</h1>
            <p className="text-sm text-gray-500">Bandeja de entrada y configuración del asistente IA</p>
          </div>
        </div>

        {/* Mode pill */}
        <div className={cn(
          'flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-sm font-semibold transition-all',
          isActive
            ? 'bg-primary-50 border-primary-200 text-primary-700'
            : 'bg-gray-50 border-gray-200 text-gray-600'
        )}>
          <span className={cn('w-2 h-2 rounded-full', isActive ? 'bg-primary-500 animate-pulse' : 'bg-gray-400')} />
          {isActive ? 'IA respondiendo' : 'Atención manual'}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setTab('inbox')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
            tab === 'inbox'
              ? 'bg-white text-gray-900 shadow-card'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <MessageCircle className="w-4 h-4" />
          Bandeja
          {(unread?.count || 0) > 0 && (
            <span className="min-w-[18px] h-[18px] rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
              {(unread?.count || 0) > 9 ? '9+' : unread?.count}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('config')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
            tab === 'config'
              ? 'bg-white text-gray-900 shadow-card'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Settings2 className="w-4 h-4" />
          Configurar Agente
        </button>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      {tab === 'inbox'
        ? <InboxTab agentActive={isActive} onToggle={() => toggleModeMut.mutate()} />
        : <AgentConfigTab />
      }
    </div>
  );
}
