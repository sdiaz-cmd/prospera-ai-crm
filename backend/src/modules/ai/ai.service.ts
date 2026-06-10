import { get, all } from '../../database/db';

// ─── OpenAI (optional) ────────────────────────────────────────────
let openai: { chat: { completions: { create: (opts: Record<string, unknown>) => Promise<{ choices: { message: { content: string } }[] }> } } } | null = null;

async function getOpenAI() {
  if (openai) return openai;
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    // @ts-ignore
    const { default: OpenAI } = await import('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) as typeof openai;
    return openai;
  } catch { return null; }
}

async function gpt(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const client = await getOpenAI();
  if (!client) return null;
  try {
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: 0.7,
      max_tokens: 800,
    });
    return res.choices[0]?.message?.content || null;
  } catch { return null; }
}

// ─── Mock generators ──────────────────────────────────────────────

const EMAIL_TEMPLATES: Record<string, (ctx: Record<string, string>) => string> = {
  introduccion: (c) => `Estimado/a ${c.name},

Mi nombre es ${c.senderName} de ${c.senderCompany}. Me pongo en contacto con usted porque creo que nuestra solución puede ser de gran valor para ${c.company}.

En ${c.senderCompany} ayudamos a empresas como la suya a optimizar sus procesos de ventas y gestión de clientes. Me gustaría tener una breve llamada de 15 minutos para explorar si existe una oportunidad de colaboración.

¿Tendría disponibilidad esta semana o la próxima?

Quedo a sus órdenes.

Saludos cordiales,
${c.senderName}
${c.senderCompany}`,

  seguimiento: (c) => `Estimado/a ${c.name},

Le escribo como seguimiento a nuestra conversación anterior. Espero que todo esté marchando bien en ${c.company}.

Quería asegurarme de que haya tenido oportunidad de revisar la información que le compartí. Con gusto puedo resolver cualquier duda o ampliar los detalles sobre cómo podemos apoyarles.

¿Le parece bien si agendamos una llamada rápida para esta semana?

Gracias por su tiempo.

Saludos,
${c.senderName}`,

  propuesta: (c) => `Estimado/a ${c.name},

Conforme a lo conversado, adjunto la propuesta comercial para ${c.company}.

**Resumen ejecutivo:**
• Solución personalizada para sus necesidades específicas
• Implementación en 4-6 semanas
• Soporte y capacitación incluidos
• ROI estimado en los primeros 6 meses

Estaré encantado/a de revisar la propuesta juntos y aclarar cualquier punto. ¿Le gustaría agendar una sesión de revisión esta semana?

Quedamos atentos a sus comentarios.

Saludos cordiales,
${c.senderName}
${c.senderCompany}`,

  recordatorio: (c) => `Estimado/a ${c.name},

Le escribo para recordarle amablemente sobre nuestra reunión/propuesta pendiente.

Entiendo que el día a día puede ser muy ocupado, por eso quiero facilitarle el proceso. Si tiene alguna duda o necesita información adicional, con gusto se la proporciono de inmediato.

¿Hay algo específico que le haya generado preguntas o en lo que pueda ayudarle?

Quedo a sus órdenes.

Saludos,
${c.senderName}`,
};

function mockGenerateEmail(params: {
  recipientName: string; recipientCompany: string; purpose: string;
  tone: string; senderName: string; senderCompany: string; extraContext?: string;
}): string {
  const template = EMAIL_TEMPLATES[params.purpose] || EMAIL_TEMPLATES.seguimiento;
  let text = template({
    name: params.recipientName, company: params.recipientCompany || 'su empresa',
    senderName: params.senderName, senderCompany: params.senderCompany,
  });
  if (params.tone === 'formal') text = text.replace(/Saludos cordiales/g, 'Atentamente').replace(/Saludos,/g, 'Atentamente,');
  if (params.tone === 'amigable') text = text.replace(/Estimado\/a/g, 'Hola').replace(/Atentamente,/g, 'Un saludo,');
  return text;
}

function mockScoreLead(lead: Record<string, unknown>): { score: number; reason: string; suggestions: string[] } {
  let score = 40;
  const reasons: string[] = [];
  const suggestions: string[] = [];

  const source = (lead.source as string || '').toLowerCase();
  if (source === 'referral') { score += 25; reasons.push('Referido por cliente existente (+25)'); }
  else if (source === 'web') { score += 15; reasons.push('Llegó por búsqueda orgánica (+15)'); }
  else if (source === 'event') { score += 20; reasons.push('Contacto en evento presencial (+20)'); }
  else if (source === 'social') { score += 10; reasons.push('Interacción en redes sociales (+10)'); }
  else if (source === 'cold_call') { score += 5; reasons.push('Llamada en frío (+5)'); }

  const status = (lead.status as string || '').toLowerCase();
  if (status === 'qualified') { score += 20; reasons.push('Ya calificado (+20)'); }
  else if (status === 'contacted') { score += 10; reasons.push('Contacto establecido (+10)'); }
  else if (status === 'new') suggestions.push('Hacer primer contacto a la brevedad');

  if (lead.company) { score += 10; reasons.push('Tiene empresa asociada (+10)'); }
  else suggestions.push('Completar información de empresa');
  if (lead.phone) { score += 5; reasons.push('Teléfono disponible (+5)'); }
  else suggestions.push('Obtener número de teléfono');
  if (lead.email) { score += 5; reasons.push('Email disponible (+5)'); }

  if (!lead.notes) suggestions.push('Agregar notas de la conversación');
  if (status === 'new' && source === 'cold_call') suggestions.push('Prioridad baja — considerar nurturing automatizado');

  score = Math.min(100, Math.max(0, score));
  return {
    score,
    reason: reasons.length > 0 ? reasons.join('. ') + '.' : 'Puntuación basada en datos disponibles.',
    suggestions: suggestions.slice(0, 3),
  };
}

function mockChat(question: string, context: Record<string, unknown>): string {
  const q = question.toLowerCase();
  const { leads, opportunities, tasks } = context as { leads: number; opportunities: number; tasks: number };

  if (q.includes('lead') || q.includes('prospecto')) return `Actualmente tienes **${leads} leads** en tu CRM. Te recomiendo priorizar los que tienen mayor score y fuente "referral", ya que tienen mayor probabilidad de conversión. ¿Quieres que analice los leads específicos?`;
  if (q.includes('oportunidad') || q.includes('pipeline')) return `Tu pipeline tiene **${opportunities} oportunidades** activas. Para maximizar el cierre este mes, enfócate en las que están en etapa "Propuesta" o "Negociación" con fecha de cierre próxima.`;
  if (q.includes('tarea') || q.includes('pendiente')) return `Tienes **${tasks} tareas pendientes**. Te sugiero revisar primero las marcadas como urgentes o vencidas. ¿Quieres que te ayude a priorizar tu lista?`;
  if (q.includes('email') || q.includes('correo')) return `Puedo ayudarte a redactar correos personalizados. Ve a la pestaña **"Generador de Correos"** y selecciona el lead o contacto al que quieres escribirle. Tengo templates para introducción, seguimiento, propuesta y recordatorio.`;
  if (q.includes('score') || q.includes('puntuación') || q.includes('calificación')) return `El scoring automático analiza: fuente del lead, estado actual, datos de contacto completos y notas. Ve a la pestaña **"Scoring de Leads"** para ver y mejorar las puntuaciones de todos tus leads.`;
  if (q.includes('hola') || q.includes('ayuda') || q.includes('qué puedes')) return `¡Hola! Soy tu asistente de CRM con IA. Puedo ayudarte con:\n\n• **Scoring** — calificar leads automáticamente\n• **Correos** — redactar emails personalizados\n• **Insights** — analizar tu pipeline y actividades\n\n¿Qué necesitas hoy?`;
  return `Entiendo tu pregunta sobre "${question}". Con base en tu CRM: tienes ${leads} leads, ${opportunities} oportunidades abiertas y ${tasks} tareas pendientes. Para un análisis más detallado, activa OpenAI agregando tu API key al archivo \`.env\` del backend.`;
}

// ─── Service ──────────────────────────────────────────────────────

export class AIService {
  private isAIEnabled() { return !!process.env.OPENAI_API_KEY; }

  async generateEmail(params: {
    recipientName: string; recipientCompany: string; purpose: string;
    tone: string; senderName: string; senderCompany: string; extraContext?: string;
  }) {
    const aiResult = await gpt(
      'Eres un asistente experto en ventas B2B en México. Redacta correos profesionales, concisos y personalizados en español. No uses emojis.',
      `Redacta un correo de ${params.purpose} en tono ${params.tone} para:
- Destinatario: ${params.recipientName} de ${params.recipientCompany}
- Remitente: ${params.senderName} de ${params.senderCompany}
${params.extraContext ? `- Contexto adicional: ${params.extraContext}` : ''}
El correo debe ser natural, no genérico, máximo 150 palabras.`
    );

    return {
      email: aiResult || mockGenerateEmail(params),
      aiPowered: !!aiResult,
    };
  }

  async scoreLead(leadId: string, companyId: string) {
    const lead = get<Record<string, unknown>>('SELECT * FROM leads WHERE id = ? AND company_id = ?', [leadId, companyId]);
    if (!lead) throw new Error('Lead no encontrado');

    const aiResult = await gpt(
      'Eres un experto en ventas B2B. Analiza leads de CRM y devuelve SOLO un JSON válido con: score (0-100), reason (string), suggestions (array de strings, máx 3).',
      `Analiza este lead y devuelve JSON:
Nombre: ${lead.first_name} ${lead.last_name || ''}
Empresa: ${lead.company || 'N/A'}
Fuente: ${lead.source || 'desconocida'}
Estado: ${lead.status}
Score actual: ${lead.score}
Notas: ${lead.notes || 'Sin notas'}
Teléfono disponible: ${lead.phone ? 'Sí' : 'No'}
Email disponible: ${lead.email ? 'Sí' : 'No'}`
    );

    let result;
    if (aiResult) {
      try { result = JSON.parse(aiResult.replace(/```json\n?|\n?```/g, '')); } catch { result = mockScoreLead(lead); }
    } else { result = mockScoreLead(lead); }

    // Update score in DB
    const { run } = await import('../../database/db');
    run('UPDATE leads SET score = ?, updated_at = ? WHERE id = ?', [result.score, new Date().toISOString(), leadId]);

    return { ...result, leadId, leadName: `${lead.first_name} ${lead.last_name || ''}`.trim(), aiPowered: !!aiResult };
  }

  async scoreAllLeads(companyId: string) {
    const leads = all<{ id: string }>('SELECT id FROM leads WHERE company_id = ? AND status != ?', [companyId, 'converted']);
    const results = [];
    for (const lead of leads.slice(0, 20)) {
      try { results.push(await this.scoreLead(lead.id, companyId)); } catch { continue; }
    }
    return { scored: results.length, results };
  }

  async chat(question: string, companyId: string) {
    const leads = Number((get<{ c: number }>('SELECT COUNT(*) as c FROM leads WHERE company_id = ?', [companyId]))?.c || 0);
    const opportunities = Number((get<{ c: number }>('SELECT COUNT(*) as c FROM opportunities WHERE company_id = ? AND status = ?', [companyId, 'open']))?.c || 0);
    const tasks = Number((get<{ c: number }>('SELECT COUNT(*) as c FROM crm_tasks WHERE company_id = ? AND status = ?', [companyId, 'pending']))?.c || 0);
    const oppValue = Number((get<{ s: number }>('SELECT COALESCE(SUM(amount),0) as s FROM opportunities WHERE company_id = ? AND status = ?', [companyId, 'open']))?.s || 0);

    const aiResult = await gpt(
      `Eres un asistente de CRM inteligente para PROSPERA.AI. Responde en español, de forma concisa y útil.
Datos actuales del CRM:
- Leads activos: ${leads}
- Oportunidades abiertas: ${opportunities} (valor: $${oppValue.toLocaleString('es-MX')} MXN)
- Tareas pendientes: ${tasks}`,
      question
    );

    return {
      answer: aiResult || mockChat(question, { leads, opportunities, tasks }),
      aiPowered: !!aiResult,
    };
  }

  getStatus() {
    return {
      aiEnabled: this.isAIEnabled(),
      message: this.isAIEnabled()
        ? 'IA activa con OpenAI GPT-4o Mini'
        : 'Modo demo activo. Agrega OPENAI_API_KEY en backend/.env para activar IA real.',
    };
  }
}
