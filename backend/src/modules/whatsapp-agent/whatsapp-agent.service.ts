import { v4 as uuid } from 'uuid';
import { run, get } from '../../database/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QAPair {
  question: string;
  answer: string;
}

export interface AgentConfig {
  id: string;
  companyId: string;
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

interface DBRow {
  id: string;
  company_id: string;
  is_active: number;
  agent_name: string;
  business_description: string;
  business_hours: string;
  tone: string;
  main_goal: string;
  greeting: string;
  qualification_questions: string;
  knowledge_base: string;
  special_announcement: string;
}

// ─── Conversation memory (in-memory, 2h TTL) ──────────────────────────────────
interface Message { role: 'user' | 'assistant'; content: string }
interface ConvState {
  messages: Message[];
  capturedData: { name?: string; email?: string; need?: string };
  lastActivity: number;
}

const conversations = new Map<string, ConvState>();
const CONV_TTL = 2 * 60 * 60 * 1000; // 2 hours

function getConv(key: string): ConvState {
  const existing = conversations.get(key);
  if (existing && Date.now() - existing.lastActivity < CONV_TTL) {
    existing.lastActivity = Date.now();
    return existing;
  }
  const fresh: ConvState = { messages: [], capturedData: {}, lastActivity: Date.now() };
  conversations.set(key, fresh);
  return fresh;
}

// Cleanup stale conversations every 30 min
setInterval(() => {
  const now = Date.now();
  for (const [key, conv] of conversations) {
    if (now - conv.lastActivity > CONV_TTL) conversations.delete(key);
  }
}, 30 * 60 * 1000);

// ─── Service ──────────────────────────────────────────────────────────────────

export class WhatsAppAgentService {

  // ── Config CRUD ──────────────────────────────────────────────────

  getConfig(companyId: string): AgentConfig | null {
    const row = get<DBRow>(
      'SELECT * FROM whatsapp_agent_config WHERE company_id = ?', [companyId]
    );
    if (!row) return null;
    return this.mapRow(row);
  }

  upsertConfig(companyId: string, data: Partial<Omit<AgentConfig, 'id' | 'companyId'>>) {
    const existing = get('SELECT id FROM whatsapp_agent_config WHERE company_id = ?', [companyId]);

    if (existing) {
      const updates: string[] = ['updated_at = datetime(\'now\')'];
      const params: unknown[] = [];

      if (data.isActive !== undefined)          { updates.push('is_active = ?');                  params.push(data.isActive ? 1 : 0); }
      if (data.agentName !== undefined)         { updates.push('agent_name = ?');                 params.push(data.agentName); }
      if (data.businessDescription !== undefined){ updates.push('business_description = ?');      params.push(data.businessDescription); }
      if (data.businessHours !== undefined)     { updates.push('business_hours = ?');             params.push(data.businessHours); }
      if (data.tone !== undefined)              { updates.push('tone = ?');                       params.push(data.tone); }
      if (data.mainGoal !== undefined)          { updates.push('main_goal = ?');                  params.push(data.mainGoal); }
      if (data.greeting !== undefined)          { updates.push('greeting = ?');                   params.push(data.greeting); }
      if (data.qualificationQuestions !== undefined) { updates.push('qualification_questions = ?'); params.push(JSON.stringify(data.qualificationQuestions)); }
      if (data.knowledgeBase !== undefined)     { updates.push('knowledge_base = ?');             params.push(JSON.stringify(data.knowledgeBase)); }
      if (data.specialAnnouncement !== undefined){ updates.push('special_announcement = ?');      params.push(data.specialAnnouncement); }

      params.push(companyId);
      run(`UPDATE whatsapp_agent_config SET ${updates.join(', ')} WHERE company_id = ?`, params);
    } else {
      run(
        `INSERT INTO whatsapp_agent_config
         (id, company_id, is_active, agent_name, business_description, business_hours,
          tone, main_goal, greeting, qualification_questions, knowledge_base, special_announcement)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuid(), companyId,
          data.isActive !== false ? 1 : 0,
          data.agentName || 'Asistente',
          data.businessDescription || '',
          data.businessHours || '',
          data.tone || 'amigable',
          data.mainGoal || 'capturar_lead',
          data.greeting || '',
          JSON.stringify(data.qualificationQuestions || []),
          JSON.stringify(data.knowledgeBase || []),
          data.specialAnnouncement || '',
        ]
      );
    }

    return this.getConfig(companyId);
  }

  // ── AI Response ──────────────────────────────────────────────────

  async generateReply(
    companyId: string,
    companyName: string,
    phone: string,
    incomingMessage: string
  ): Promise<string | null> {
    const config = this.getConfig(companyId);
    if (!config || !config.isActive) return null;

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return null;

    const convKey = `${companyId}:${phone}`;
    const conv = getConv(convKey);

    // Add incoming message to history
    conv.messages.push({ role: 'user', content: incomingMessage });

    // Keep last 12 messages to avoid token overflow
    if (conv.messages.length > 12) conv.messages = conv.messages.slice(-12);

    const systemPrompt = this.buildSystemPrompt(config, companyName);

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conv.messages,
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      });

      if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);

      const data = await res.json() as any;
      const reply: string = data.choices?.[0]?.message?.content?.trim() || '';

      if (reply) {
        conv.messages.push({ role: 'assistant', content: reply });
      }

      return reply || null;
    } catch (err) {
      console.error('[WA Agent] Error GPT:', (err as Error).message);
      return null;
    }
  }

  // ── Prompt builder ───────────────────────────────────────────────

  private buildSystemPrompt(config: AgentConfig, companyName: string): string {
    const toneMap = {
      formal: 'formal y respetuoso',
      amigable: 'amigable y cercano',
      profesional: 'profesional y conciso',
    };

    const goalMap = {
      capturar_lead: 'capturar los datos del contacto (nombre, correo si es posible, y su necesidad principal) para que un asesor le dé seguimiento',
      agendar_cita: 'agendar una cita o llamada con el equipo',
      soporte: 'resolver dudas y problemas del cliente',
      ventas: 'guiar al cliente hacia la compra del producto o servicio más adecuado para él',
    };

    const lines: string[] = [];

    lines.push(`Eres ${config.agentName}, asistente virtual de ${companyName}.`);
    lines.push('');

    if (config.businessDescription) {
      lines.push('## SOBRE NOSOTROS');
      lines.push(config.businessDescription);
      lines.push('');
    }

    if (config.businessHours) {
      lines.push('## HORARIO DE ATENCIÓN');
      lines.push(config.businessHours);
      lines.push('');
    }

    if (config.specialAnnouncement) {
      lines.push('## ⚠️ AVISO ESPECIAL (importante, menciónalo si es relevante)');
      lines.push(config.specialAnnouncement);
      lines.push('');
    }

    lines.push('## TU OBJETIVO');
    lines.push(`Tu misión es ${goalMap[config.mainGoal]}.`);
    lines.push('');

    if (config.qualificationQuestions.length > 0) {
      lines.push('## PREGUNTAS DE CALIFICACIÓN (hazlas de forma natural, una a la vez)');
      config.qualificationQuestions.forEach((q, i) => {
        lines.push(`${i + 1}. ${q}`);
      });
      lines.push('');
    }

    if (config.knowledgeBase.length > 0) {
      lines.push('## BASE DE CONOCIMIENTO (usa esta información para responder preguntas)');
      config.knowledgeBase.forEach(({ question, answer }) => {
        lines.push(`P: ${question}`);
        lines.push(`R: ${answer}`);
      });
      lines.push('');
    }

    lines.push('## REGLAS ESTRICTAS');
    lines.push(`- Habla de forma ${toneMap[config.tone]}`);
    lines.push('- Respuestas CORTAS: máximo 2-3 líneas. Nunca hagas listas largas.');
    lines.push('- Haz UNA sola pregunta a la vez.');
    lines.push('- Nunca inventes información. Si no sabes algo, di: "Te comunico con un asesor en breve."');
    lines.push('- Responde siempre en el idioma del cliente.');
    lines.push('- No saludas de nuevo si ya saludaste.');
    lines.push('- Tu meta es obtener la información necesaria en el menor número de mensajes posible.');

    if (config.greeting) {
      lines.push('');
      lines.push(`## PRIMER MENSAJE (usa algo similar a esto al inicio de la conversación)`);
      lines.push(config.greeting);
    }

    return lines.join('\n');
  }

  // ── Reset conversation ───────────────────────────────────────────

  resetConversation(companyId: string, phone: string) {
    conversations.delete(`${companyId}:${phone}`);
  }

  // ── Map DB row → AgentConfig ─────────────────────────────────────

  private mapRow(row: DBRow): AgentConfig {
    return {
      id: row.id,
      companyId: row.company_id,
      isActive: !!row.is_active,
      agentName: row.agent_name,
      businessDescription: row.business_description,
      businessHours: row.business_hours,
      tone: row.tone as AgentConfig['tone'],
      mainGoal: row.main_goal as AgentConfig['mainGoal'],
      greeting: row.greeting,
      qualificationQuestions: this.parseJSON(row.qualification_questions, []),
      knowledgeBase: this.parseJSON(row.knowledge_base, []),
      specialAnnouncement: row.special_announcement,
    };
  }

  private parseJSON<T>(value: string, fallback: T): T {
    try { return JSON.parse(value); } catch { return fallback; }
  }
}

export const whatsAppAgentService = new WhatsAppAgentService();
