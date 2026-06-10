import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot, Mail, Target, Send, Sparkles, RefreshCw,
  CheckCircle, AlertCircle, ChevronDown, User, TrendingUp
} from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/utils/helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIStatus { aiEnabled: boolean; message: string }
interface EmailResult { email: string; aiPowered: boolean }
interface ScoreResult {
  score: number; reason: string; suggestions: string[];
  leadName: string; aiPowered: boolean;
}
interface ChatMessage { role: 'user' | 'assistant'; content: string; aiPowered?: boolean }
interface Lead { id: string; first_name: string; last_name: string; company: string; score: number; source: string; status: string }

// ─── API helpers ──────────────────────────────────────────────────────────────

const aiApi = {
  status: () => api.get<AIStatus>('/ai/status').then(r => r.data),
  generateEmail: (body: Record<string, string>) =>
    api.post<EmailResult>('/ai/email', body).then(r => r.data),
  scoreLead: (leadId: string) =>
    api.post<ScoreResult>(`/ai/score/${leadId}`).then(r => r.data),
  scoreAll: () => api.post<{ scored: number; results: ScoreResult[] }>('/ai/score-all').then(r => r.data),
  chat: (question: string) => api.post<{ answer: string; aiPowered: boolean }>('/ai/chat', { question }).then(r => r.data),
  leads: () => api.get<{ data: { data: Lead[] } }>('/leads?limit=50').then(r => {
    const d = r.data.data;
    return Array.isArray(d) ? d : (d as { data: Lead[] })?.data ?? [];
  }),
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const tabs = [
  { id: 'email', label: 'Generador de Correos', icon: Mail },
  { id: 'scoring', label: 'Scoring de Leads', icon: Target },
  { id: 'chat', label: 'Asistente CRM', icon: Bot },
] as const;
type Tab = typeof tabs[number]['id'];

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-100 text-green-700' : score >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold', color)}>
      <TrendingUp className="w-3.5 h-3.5" />
      {score}
    </span>
  );
}

// ─── Email Tab ────────────────────────────────────────────────────────────────

function EmailTab() {
  const [form, setForm] = useState({
    recipientName: '', recipientCompany: '', purpose: 'introduccion',
    tone: 'profesional', senderName: '', senderCompany: '', extraContext: '',
  });
  const [result, setResult] = useState<EmailResult | null>(null);
  const [copied, setCopied] = useState(false);

  const mut = useMutation({
    mutationFn: () => aiApi.generateEmail(form),
    onSuccess: setResult,
  });

  const field = (key: keyof typeof form, label: string, type: 'input' | 'select' | 'textarea' = 'input', options?: { value: string; label: string }[]) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {type === 'select' ? (
        <select
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {options!.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          rows={2}
          placeholder={label}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      ) : (
        <input
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={label}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      )}
    </div>
  );

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Datos del correo</h3>
        <div className="grid grid-cols-2 gap-3">
          {field('recipientName', 'Nombre del destinatario')}
          {field('recipientCompany', 'Empresa del destinatario')}
          {field('senderName', 'Tu nombre')}
          {field('senderCompany', 'Tu empresa')}
        </div>
        {field('purpose', 'Propósito', 'select', [
          { value: 'introduccion', label: 'Introducción' },
          { value: 'seguimiento', label: 'Seguimiento' },
          { value: 'propuesta', label: 'Propuesta comercial' },
          { value: 'recordatorio', label: 'Recordatorio' },
        ])}
        {field('tone', 'Tono', 'select', [
          { value: 'profesional', label: 'Profesional' },
          { value: 'formal', label: 'Formal' },
          { value: 'amigable', label: 'Amigable' },
        ])}
        {field('extraContext', 'Contexto adicional (opcional)', 'textarea')}
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !form.recipientName || !form.senderName}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {mut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {mut.isPending ? 'Generando...' : 'Generar correo'}
        </button>
      </div>

      {/* Result */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Correo generado</h3>
          {result && (
            <div className="flex items-center gap-2">
              {result.aiPowered ? (
                <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                  <Sparkles className="w-3 h-3" /> GPT-4o Mini
                </span>
              ) : (
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">Modo demo</span>
              )}
              <button
                onClick={copy}
                className="text-xs px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          )}
        </div>
        {result ? (
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            {result.email}
          </pre>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <Mail className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">El correo generado aparecerá aquí</p>
          </div>
        )}
        {mut.isError && (
          <p className="mt-2 text-sm text-red-600">Error al generar. Intenta de nuevo.</p>
        )}
      </div>
    </div>
  );
}

// ─── Scoring Tab ──────────────────────────────────────────────────────────────

function ScoringTab() {
  const qc = useQueryClient();
  const { data: leads = [], isLoading } = useQuery({ queryKey: ['ai-leads'], queryFn: aiApi.leads });
  const [selected, setSelected] = useState<Lead | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);

  const scoreMut = useMutation({
    mutationFn: (leadId: string) => aiApi.scoreLead(leadId),
    onSuccess: (r) => { setResult(r); qc.invalidateQueries({ queryKey: ['ai-leads'] }); },
  });

  const scoreAllMut = useMutation({
    mutationFn: aiApi.scoreAll,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-leads'] }),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Lead list */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Leads</h3>
          <button
            onClick={() => scoreAllMut.mutate()}
            disabled={scoreAllMut.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {scoreAllMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Puntuar todos
          </button>
        </div>

        {scoreAllMut.isSuccess && (
          <div className="mb-3 p-2.5 bg-green-50 rounded-lg flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4" /> {scoreAllMut.data.scored} leads puntuados
          </div>
        )}

        <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
          {isLoading && <p className="text-sm text-gray-400 py-4 text-center">Cargando leads...</p>}
          {leads.map(lead => (
            <button
              key={lead.id}
              onClick={() => { setSelected(lead); setResult(null); }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                selected?.id === lead.id ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'
              )}
            >
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{lead.first_name} {lead.last_name}</p>
                <p className="text-xs text-gray-400 truncate">{lead.company || 'Sin empresa'}</p>
              </div>
              <ScoreBadge score={lead.score || 0} />
            </button>
          ))}
          {!isLoading && leads.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No hay leads</p>
          )}
        </div>
      </div>

      {/* Score result */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Análisis de lead</h3>
        {selected ? (
          <>
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{selected.first_name} {selected.last_name}</p>
                <p className="text-sm text-gray-400">{selected.company || 'Sin empresa'} · {selected.source}</p>
              </div>
            </div>

            <button
              onClick={() => scoreMut.mutate(selected.id)}
              disabled={scoreMut.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors mb-4"
            >
              {scoreMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              {scoreMut.isPending ? 'Analizando...' : 'Analizar este lead'}
            </button>

            {result && (
              <div className="space-y-4">
                <div className="text-center py-4 border border-gray-100 rounded-xl">
                  <p className="text-sm text-gray-400 mb-1">Puntuación</p>
                  <span className={cn(
                    'text-5xl font-bold',
                    result.score >= 70 ? 'text-green-600' : result.score >= 40 ? 'text-yellow-600' : 'text-red-600'
                  )}>{result.score}</span>
                  <span className="text-gray-400 text-xl">/100</span>
                  {result.aiPowered && (
                    <p className="text-xs text-purple-500 mt-1 flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3" /> Análisis con GPT-4o Mini
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Razón</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{result.reason}</p>
                </div>

                {result.suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Sugerencias</p>
                    <ul className="space-y-1.5">
                      {result.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <Target className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Selecciona un lead para analizarlo</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  '¿Cuántos leads tengo?',
  '¿Cómo está mi pipeline?',
  '¿Qué tareas tengo pendientes?',
  '¿Cómo uso el generador de correos?',
];

function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '¡Hola! Soy tu asistente de CRM con IA. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatMut = useMutation({
    mutationFn: (q: string) => aiApi.chat(q),
    onSuccess: (r, q) => {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: r.answer, aiPowered: r.aiPowered }
      ]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (text?: string) => {
    const q = text || input.trim();
    if (!q) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    chatMut.mutate(q);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 flex flex-col" style={{ height: '560px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
              m.role === 'assistant' ? 'bg-primary-100' : 'bg-gray-200'
            )}>
              {m.role === 'assistant' ? <Bot className="w-4 h-4 text-primary-600" /> : <User className="w-4 h-4 text-gray-600" />}
            </div>
            <div className={cn(
              'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
              m.role === 'assistant' ? 'bg-gray-100 text-gray-800 rounded-tl-none' : 'bg-primary-600 text-white rounded-tr-none'
            )}>
              {m.content.split('\n').map((line, j) => (
                <span key={j}>{line}{j < m.content.split('\n').length - 1 && <br />}</span>
              ))}
              {m.aiPowered && (
                <p className="text-xs text-purple-500 mt-1 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> GPT-4o Mini
                </p>
              )}
            </div>
          </div>
        ))}
        {chatMut.isPending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      <div className="px-4 py-2 border-t border-gray-100 flex gap-2 overflow-x-auto">
        {QUICK_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => send(q)}
            className="flex-shrink-0 text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-primary-50 hover:text-primary-700 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Escribe tu pregunta..."
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || chatMut.isPending}
          className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AIPage() {
  const [activeTab, setActiveTab] = useState<Tab>('email');

  const { data: status } = useQuery({
    queryKey: ['ai-status'],
    queryFn: aiApi.status,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">IA & Automatización</h1>
        <p className="text-gray-500 text-sm mt-1">Herramientas de inteligencia artificial para potenciar tus ventas</p>
      </div>

      {/* Status banner */}
      {status && (
        <div className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm',
          status.aiEnabled ? 'bg-purple-50 border border-purple-200 text-purple-800' : 'bg-amber-50 border border-amber-200 text-amber-800'
        )}>
          {status.aiEnabled ? <Sparkles className="w-4 h-4 text-purple-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
          {status.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'email' && <EmailTab />}
      {activeTab === 'scoring' && <ScoringTab />}
      {activeTab === 'chat' && <ChatTab />}
    </div>
  );
}
