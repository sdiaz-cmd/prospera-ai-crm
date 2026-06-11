import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot, Save, Plus, Trash2, ChevronDown, ChevronUp,
  MessageCircle, Clock, Target, BookOpen, Megaphone,
  Sparkles, CheckCircle, ToggleLeft, ToggleRight, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// ─── Types ────────────────────────────────────────────────────────────────────
interface QAPair { question: string; answer: string }
interface AgentConfig {
  isActive: boolean;
  agentName: string;
  businessDescription: string;
  businessHours: string;
  tone: 'formal' | 'amigable' | 'profesional';
  mainGoal: 'capturar_lead' | 'agendar_cita' | 'soporte' | 'ventas';
  greeting: string;
  qualificationQuestions: string[];
  knowledgeBase: QAPair[];
  specialAnnouncement: string;
}

const DEFAULT: AgentConfig = {
  isActive: true,
  agentName: '',
  businessDescription: '',
  businessHours: '',
  tone: 'amigable',
  mainGoal: 'capturar_lead',
  greeting: '',
  qualificationQuestions: [],
  knowledgeBase: [],
  specialAnnouncement: '',
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  icon: Icon, title, subtitle, children, color = 'indigo',
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  color?: string;
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    blue:   'bg-blue-50 text-blue-600',
    rose:   'bg-rose-50 text-rose-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <div className="px-6 pb-6 space-y-4">{children}</div>
    </Card>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function WhatsAppAgentPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AgentConfig>(DEFAULT);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp-agent-config'],
    queryFn: () => api.get('/whatsapp-agent').then(r => r.data.data as AgentConfig),
  });

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setForm({ ...DEFAULT, ...data });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (config: AgentConfig) => api.post('/whatsapp-agent', config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-agent-config'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success('Agente guardado correctamente');
    },
    onError: () => toast.error('Error al guardar'),
  });

  const set = <K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const addQuestion = () => set('qualificationQuestions', [...form.qualificationQuestions, '']);
  const updateQuestion = (i: number, v: string) => {
    const q = [...form.qualificationQuestions];
    q[i] = v;
    set('qualificationQuestions', q);
  };
  const removeQuestion = (i: number) =>
    set('qualificationQuestions', form.qualificationQuestions.filter((_, idx) => idx !== i));

  const addFAQ = () => set('knowledgeBase', [...form.knowledgeBase, { question: '', answer: '' }]);
  const updateFAQ = (i: number, field: 'question' | 'answer', v: string) => {
    const kb = [...form.knowledgeBase];
    kb[i] = { ...kb[i], [field]: v };
    set('knowledgeBase', kb);
  };
  const removeFAQ = (i: number) =>
    set('knowledgeBase', form.knowledgeBase.filter((_, idx) => idx !== i));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Agente WhatsApp IA</h1>
            <p className="text-sm text-gray-400">Entrena al asistente virtual de tu empresa</p>
          </div>
        </div>
        <Button
          onClick={() => mutation.mutate(form)}
          loading={mutation.isPending}
          className="gap-2"
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Guardado' : 'Guardar cambios'}
        </Button>
      </div>

      {/* Active toggle */}
      <Card>
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${form.isActive ? 'bg-green-50' : 'bg-gray-100'}`}>
              <MessageCircle className={`w-5 h-5 ${form.isActive ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Respuestas automáticas</p>
              <p className="text-xs text-gray-400">
                {form.isActive ? 'El agente responde a los mensajes entrantes' : 'El agente está pausado — los mensajes se guardan sin responder'}
              </p>
            </div>
          </div>
          <button
            onClick={() => set('isActive', !form.isActive)}
            className="flex-shrink-0"
          >
            {form.isActive
              ? <ToggleRight className="w-10 h-10 text-green-500" />
              : <ToggleLeft className="w-10 h-10 text-gray-300" />}
          </button>
        </div>
      </Card>

      {/* Anuncio temporal — always visible, prominent */}
      <Card className="border-amber-200 bg-amber-50">
        <div className="px-6 py-4">
          <div className="flex items-start gap-3">
            <Megaphone className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 mb-1">Aviso temporal</p>
              <p className="text-xs text-amber-600 mb-3">
                Información que el agente debe mencionar hoy (horario especial, promoción, cierre, etc.). Borra cuando ya no aplique.
              </p>
              <textarea
                className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2 bg-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                rows={2}
                placeholder='Ej: "Hoy cerramos a las 3pm por evento interno. Reabrimos mañana a las 9am."'
                value={form.specialAnnouncement}
                onChange={e => set('specialAnnouncement', e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Personalidad */}
      <Section icon={Sparkles} title="Personalidad del agente" subtitle="¿Cómo se llama y cómo habla?" color="indigo">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre del agente" hint='Ej: "Ana", "Carlos", "Asistente Virtual"'>
            <Input
              placeholder="Ana"
              value={form.agentName}
              onChange={e => set('agentName', e.target.value)}
            />
          </Field>
          <Field label="Tono de comunicación">
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              value={form.tone}
              onChange={e => set('tone', e.target.value as AgentConfig['tone'])}
            >
              <option value="amigable">😊 Amigable y cercano</option>
              <option value="profesional">💼 Profesional y directo</option>
              <option value="formal">🎩 Formal y respetuoso</option>
            </select>
          </Field>
        </div>
        <Field label="Mensaje de bienvenida" hint="El agente usará algo similar al primer mensaje de la conversación">
          <textarea
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            rows={2}
            placeholder='Ej: "¡Hola! Soy Ana de [empresa]. ¿En qué te puedo ayudar hoy? 😊"'
            value={form.greeting}
            onChange={e => set('greeting', e.target.value)}
          />
        </Field>
      </Section>

      {/* Información del negocio */}
      <Section icon={Info} title="Sobre tu negocio" subtitle="¿Qué hace tu empresa? El agente usará esta información para responder" color="blue">
        <Field label="Descripción del negocio" hint="Qué vendes, a quién va dirigido, qué te diferencia">
          <textarea
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            placeholder='Ej: "Somos una empresa de software para pymes. Ofrecemos CRM, facturación y automatización de ventas. Atendemos principalmente a empresas de 5 a 50 empleados en México y Latinoamérica."'
            value={form.businessDescription}
            onChange={e => set('businessDescription', e.target.value)}
          />
        </Field>
        <Field label="Horario de atención">
          <Input
            placeholder='Ej: "Lunes a viernes de 9am a 6pm. Sábados de 10am a 2pm."'
            value={form.businessHours}
            onChange={e => set('businessHours', e.target.value)}
          />
        </Field>
      </Section>

      {/* Objetivo */}
      <Section icon={Target} title="Objetivo principal del agente" subtitle="¿Qué quieres lograr con cada conversación?" color="green">
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'capturar_lead',  emoji: '🎯', label: 'Capturar leads',    desc: 'Obtener nombre, contacto y necesidad' },
            { value: 'agendar_cita',   emoji: '📅', label: 'Agendar cita',      desc: 'Programar una llamada o reunión' },
            { value: 'ventas',         emoji: '💰', label: 'Cerrar ventas',     desc: 'Guiar hacia la compra directa' },
            { value: 'soporte',        emoji: '🛠️', label: 'Soporte al cliente', desc: 'Resolver dudas y problemas' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => set('mainGoal', opt.value)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                form.mainGoal === opt.value
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <span className="text-2xl block mb-1">{opt.emoji}</span>
              <p className={`text-sm font-semibold ${form.mainGoal === opt.value ? 'text-green-700' : 'text-gray-800'}`}>{opt.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </Section>

      {/* Preguntas de calificación */}
      <Section icon={MessageCircle} title="Preguntas de calificación" subtitle="El agente hará estas preguntas una a la vez para entender al lead" color="purple">
        <div className="space-y-2">
          {form.qualificationQuestions.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">{i + 1}.</span>
              <Input
                className="flex-1"
                placeholder={
                  i === 0 ? '¿Cuál es tu nombre?' :
                  i === 1 ? '¿En qué le podemos ayudar?' :
                  i === 2 ? '¿Cuál es tu presupuesto aproximado?' :
                  'Escribe una pregunta...'
                }
                value={q}
                onChange={e => updateQuestion(i, e.target.value)}
              />
              <button
                onClick={() => removeQuestion(i)}
                className="p-2 text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addQuestion} className="gap-1.5 mt-2">
          <Plus className="w-4 h-4" />
          Agregar pregunta
        </Button>
        {form.qualificationQuestions.length === 0 && (
          <p className="text-xs text-gray-400">
            Sin preguntas configuradas — el agente usará su criterio según el objetivo seleccionado.
          </p>
        )}
      </Section>

      {/* Base de conocimiento */}
      <Section icon={BookOpen} title="Base de conocimiento" subtitle="Preguntas frecuentes con su respuesta exacta. El agente usará esto al responder." color="amber">
        <div className="space-y-3">
          {form.knowledgeBase.map((pair, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-500 w-16 flex-shrink-0">Pregunta:</span>
                <Input
                  className="flex-1 text-sm"
                  placeholder='Ej: "¿Cuánto cuesta el plan básico?"'
                  value={pair.question}
                  onChange={e => updateFAQ(i, 'question', e.target.value)}
                />
                <button
                  onClick={() => removeFAQ(i)}
                  className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-green-600 w-16 flex-shrink-0 mt-2">Respuesta:</span>
                <textarea
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-white"
                  rows={2}
                  placeholder='Ej: "El plan básico cuesta $499 MXN al mes e incluye..."'
                  value={pair.answer}
                  onChange={e => updateFAQ(i, 'answer', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addFAQ} className="gap-1.5 mt-2">
          <Plus className="w-4 h-4" />
          Agregar pregunta frecuente
        </Button>
        {form.knowledgeBase.length === 0 && (
          <p className="text-xs text-gray-400">
            Sin conocimiento configurado — el agente responderá basado solo en la descripción del negocio.
          </p>
        )}
      </Section>

      {/* Save button bottom */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={() => mutation.mutate(form)}
          loading={mutation.isPending}
          size="lg"
          className="gap-2 px-8"
        >
          {saved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {saved ? '¡Guardado!' : 'Guardar configuración del agente'}
        </Button>
      </div>
    </div>
  );
}
