import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, Building2, User, Tag, Star, Edit2, Plus,
  Send, CheckSquare, MessageSquare, Clock, CheckCircle2, X, Loader2,
  MoreVertical, Trash2, PhoneCall, Calendar, ExternalLink
} from 'lucide-react';
import { contactsService, emailService, tasksService, activitiesService } from '@/services/crm.service';
import type { Contact, ContactEmail, CrmTask, Activity } from '@/types';
import { toast } from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(c: Contact) {
  return `${c.firstName?.[0] || ''}${c.lastName?.[0] || ''}`.toUpperCase() || '?';
}

function fullName(c: Contact) {
  return [c.firstName, c.lastName].filter(Boolean).join(' ');
}

function relativeDate(d: string) {
  return formatDistanceToNow(new Date(d), { addSuffix: true, locale: es });
}

function fmtDate(d: string) {
  return format(new Date(d), "d MMM yyyy, HH:mm", { locale: es });
}

const STATUS_OPTS: { value: string; label: string; color: string }[] = [
  { value: 'active',   label: 'Activo',   color: 'bg-green-100 text-green-700' },
  { value: 'inactive', label: 'Inactivo', color: 'bg-gray-100 text-gray-600'   },
  { value: 'prospect', label: 'Prospecto',color: 'bg-blue-100 text-blue-700'   },
  { value: 'client',   label: 'Cliente',  color: 'bg-purple-100 text-purple-700'},
  { value: 'closed',   label: 'Cerrado',  color: 'bg-red-100 text-red-600'     },
];

function StatusBadge({ status, onClick }: { status: string; onClick: () => void }) {
  const opt = STATUS_OPTS.find(o => o.value === status) ?? { label: status, color: 'bg-gray-100 text-gray-600' };
  return (
    <button onClick={onClick} className={`px-3 py-1 rounded-full text-xs font-medium ${opt.color} hover:opacity-80 transition-opacity flex items-center gap-1`}>
      {opt.label} <span className="opacity-60">▼</span>
    </button>
  );
}

// ── Timeline ───────────────────────────────────────────────────────────────────

type TEvent = {
  id: string;
  type: 'email' | 'task' | 'activity' | 'note';
  date: string;
  title: string;
  subtitle?: string;
  meta?: string;
  done?: boolean;
};

function buildTimeline(emails: ContactEmail[], tasks: CrmTask[], activities: Activity[]): TEvent[] {
  const events: TEvent[] = [
    ...emails.map(e => ({
      id: e.id, type: 'email' as const, date: e.createdAt,
      title: `Email: "${e.subject}"`,
      subtitle: `Para: ${e.toEmail}`,
      meta: e.openedAt ? `Abierto ${relativeDate(e.openedAt)} ✓` : 'Sin abrir',
    })),
    ...tasks.map(t => ({
      id: t.id, type: 'task' as const, date: t.createdAt,
      title: t.title,
      subtitle: t.dueDate ? `Vence: ${format(new Date(t.dueDate), 'd MMM', { locale: es })}` : undefined,
      meta: t.status === 'completed' ? 'Completada' : t.status === 'in_progress' ? 'En progreso' : 'Pendiente',
      done: t.status === 'completed',
    })),
    ...activities.map(a => ({
      id: a.id, type: 'activity' as const, date: a.createdAt,
      title: a.subject || a.type,
      subtitle: a.body,
      meta: a.durationMinutes ? `${a.durationMinutes} min` : undefined,
    })),
  ];
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function TEventIcon({ type }: { type: TEvent['type'] }) {
  const cls = "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0";
  if (type === 'email') return <div className={`${cls} bg-blue-100`}><Mail className="w-4 h-4 text-blue-600" /></div>;
  if (type === 'task')  return <div className={`${cls} bg-green-100`}><CheckSquare className="w-4 h-4 text-green-600" /></div>;
  if (type === 'note')  return <div className={`${cls} bg-yellow-100`}><MessageSquare className="w-4 h-4 text-yellow-600" /></div>;
  return <div className={`${cls} bg-purple-100`}><PhoneCall className="w-4 h-4 text-purple-600" /></div>;
}

function TimelineCard({ ev }: { ev: TEvent }) {
  return (
    <div className="flex gap-3">
      <TEventIcon type={ev.type} />
      <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium text-gray-900 ${ev.done ? 'line-through opacity-60' : ''}`}>{ev.title}</p>
          <span className="text-xs text-gray-400 whitespace-nowrap">{relativeDate(ev.date)}</span>
        </div>
        {ev.subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{ev.subtitle}</p>}
        {ev.meta && (
          <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium
            ${ev.type === 'email' && ev.meta.includes('✓') ? 'bg-green-100 text-green-700' :
              ev.type === 'email' ? 'bg-gray-100 text-gray-500' :
              ev.done ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {ev.meta}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Email Compose Modal ────────────────────────────────────────────────────────

function ComposeModal({ contact, onClose, onSent }: {
  contact: Contact;
  onClose: () => void;
  onSent: (email: ContactEmail) => void;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!subject.trim() || !body.trim()) { toast.error('Completa asunto y cuerpo'); return; }
    if (!contact.email) { toast.error('El contacto no tiene email'); return; }
    setSending(true);
    try {
      const bodyHtml = `<div style="font-family:sans-serif;line-height:1.6;color:#333">${body.replace(/\n/g, '<br>')}</div>`;
      const email = await emailService.sendToContact(contact.id, { toEmail: contact.email, subject, bodyHtml });
      toast.success('Email enviado');
      onSent(email);
      onClose();
    } catch { toast.error('Error al enviar email'); }
    finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Nuevo email</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
            <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">Para: <strong>{contact.email || 'Sin email'}</strong></span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Asunto</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Escribe el asunto..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Mensaje</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              placeholder="Escribe tu mensaje aquí..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            El email incluirá seguimiento de apertura automático
          </p>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">Cancelar</button>
          <button
            onClick={handleSend}
            disabled={sending || !contact.email}
            className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar email
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New Task Modal ─────────────────────────────────────────────────────────────

function NewTaskModal({ contactId, onClose, onCreated }: {
  contactId: string;
  onClose: () => void;
  onCreated: (task: CrmTask) => void;
}) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) { toast.error('El título es requerido'); return; }
    setSaving(true);
    try {
      const task = await tasksService.create({ title, contactId, dueDate: dueDate || undefined, priority });
      toast.success('Tarea creada');
      onCreated(task);
      onClose();
    } catch { toast.error('Error al crear tarea'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-green-600" />
            <h3 className="font-semibold text-gray-900">Nueva tarea</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="¿Qué hay que hacer?"
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha límite</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prioridad</label>
              <select value={priority} onChange={e => setPriority(e.target.value as typeof priority)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white">
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Crear tarea
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status Dropdown ────────────────────────────────────────────────────────────

function StatusDropdown({ current, onChange }: { current: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <StatusBadge status={current} onClick={() => setOpen(o => !o)} />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-8 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]">
            {STATUS_OPTS.map(o => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${current === o.value ? 'font-semibold' : ''}`}>
                <span className={`w-2 h-2 rounded-full ${o.color.replace('text-', 'bg-').split(' ')[0]}`} />
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [contact, setContact]     = useState<Contact | null>(null);
  const [emails, setEmails]       = useState<ContactEmail[]>([]);
  const [tasks, setTasks]         = useState<CrmTask[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading]     = useState(true);

  const [showCompose, setShowCompose]   = useState(false);
  const [showNewTask, setShowNewTask]   = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [c, em, tk, ac] = await Promise.all([
        contactsService.getById(id),
        emailService.listByContact(id),
        tasksService.getAll({ contactId: id }),
        activitiesService.getAll({ contactId: id }),
      ]);
      setContact(c);
      setEmails(em);
      setTasks(tk.tasks || []);
      setActivities(ac.activities || []);
    } catch { toast.error('Error al cargar el contacto'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(status: string) {
    if (!contact) return;
    try {
      await contactsService.update(contact.id, { status });
      setContact(prev => prev ? { ...prev, status } : prev);
      toast.success('Estado actualizado');
    } catch { toast.error('Error al actualizar estado'); }
    setEditingStatus(false);
  }

  async function toggleTask(task: CrmTask) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const updated = await tasksService.update(task.id, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    } catch { toast.error('Error al actualizar tarea'); }
  }

  async function deleteTask(taskId: string) {
    try {
      await tasksService.delete(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Tarea eliminada');
    } catch { toast.error('Error al eliminar tarea'); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-gray-500">Contacto no encontrado</p>
        <button onClick={() => navigate('/crm/contacts')} className="text-blue-600 text-sm hover:underline">Volver a contactos</button>
      </div>
    );
  }

  const timeline = buildTimeline(emails, tasks, activities);
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const scoreColor = contact.leadScore >= 70 ? 'bg-green-500' : contact.leadScore >= 40 ? 'bg-yellow-400' : 'bg-red-400';

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* Header bar */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/crm/contacts')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Contactos</span>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/crm/contacts/${id}/edit`)} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
            Editar
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <div className="px-6 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-10">
              {/* Avatar */}
              <div className="flex items-end gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-blue-600">
                  {initials(contact)}
                </div>
                <div className="pb-1">
                  <h1 className="text-xl font-bold text-gray-900">{fullName(contact)}</h1>
                  <p className="text-sm text-gray-500">
                    {[contact.position, contact.accountName || contact.department].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2 pb-1">
                <StatusDropdown current={contact.status} onChange={handleStatusChange} />
                <button onClick={() => setShowCompose(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Enviar email</span>
                </button>
                <button onClick={() => setShowNewTask(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tarea</span>
                </button>
              </div>
            </div>

            {/* Contact info chips */}
            <div className="flex flex-wrap gap-2 mt-4">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-700 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  {contact.email}
                </a>
              )}
              {(contact.phone || contact.mobile) && (
                <a href={`tel:${contact.phone || contact.mobile}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-700 transition-colors">
                  <Phone className="w-3.5 h-3.5 text-green-500" />
                  {contact.phone || contact.mobile}
                </a>
              )}
              {contact.accountName && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-700">
                  <Building2 className="w-3.5 h-3.5 text-purple-500" />
                  {contact.accountName}
                </span>
              )}
              {contact.source && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-600">
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  {contact.source}
                </span>
              )}
              {contact.tags?.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-medium text-indigo-700">
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline — left 2/3 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Actividad</h2>
              <span className="text-xs text-gray-400">{timeline.length} evento{timeline.length !== 1 ? 's' : ''}</span>
            </div>

            {timeline.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Sin actividad registrada</p>
                <p className="text-gray-400 text-xs mt-1">Envía un email o crea una tarea para empezar</p>
              </div>
            ) : (
              <div className="relative space-y-3">
                {/* Vertical line */}
                <div className="absolute left-4 top-4 bottom-4 w-px bg-gray-200" />
                <div className="space-y-3 pl-0">
                  {timeline.map(ev => <TimelineCard key={ev.id} ev={ev} />)}
                </div>
              </div>
            )}
          </div>

          {/* Right panel — 1/3 */}
          <div className="space-y-4">
            {/* Stats card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Resumen</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Emails', value: emails.length, color: 'text-blue-600' },
                  { label: 'Tareas', value: tasks.length, color: 'text-green-600' },
                  { label: 'Abiertos', value: emails.filter(e => e.openedAt).length, color: 'text-purple-600' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Lead score */}
              {contact.leadScore > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> Lead score</span>
                    <span className="font-semibold text-gray-700">{contact.leadScore}/100</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${scoreColor} rounded-full transition-all`} style={{ width: `${contact.leadScore}%` }} />
                  </div>
                </div>
              )}
              {/* Assignee */}
              {contact.assignee && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                    {contact.assignee.firstName?.[0]}{contact.assignee.lastName?.[0]}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Ejecutivo asignado</p>
                    <p className="text-sm font-medium text-gray-900">{contact.assignee.firstName} {contact.assignee.lastName}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tasks card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Tareas</h3>
                <button onClick={() => setShowNewTask(true)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-6">
                  <CheckSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Sin tareas</p>
                  <button onClick={() => setShowNewTask(true)} className="mt-2 text-xs text-blue-600 hover:underline">+ Crear tarea</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map(task => (
                    <div key={task.id} className="group flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <button onClick={() => toggleTask(task)} className="mt-0.5 flex-shrink-0">
                        {task.status === 'completed'
                          ? <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                          : <div className="w-4 h-4 rounded-full border-2 border-gray-300 hover:border-green-500 transition-colors" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}`}>
                          {task.title}
                        </p>
                        {task.dueDate && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(task.dueDate), 'd MMM', { locale: es })}
                          </p>
                        )}
                      </div>
                      <button onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 hover:text-red-500 transition-all text-gray-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contact notes */}
            {contact.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Notas</h3>
                <p className="text-sm text-amber-900 leading-relaxed">{contact.notes}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="text-xs text-gray-400 space-y-1 px-1">
              <p>Creado: {fmtDate(contact.createdAt)}</p>
              <p>Actualizado: {fmtDate(contact.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCompose && (
        <ComposeModal
          contact={contact}
          onClose={() => setShowCompose(false)}
          onSent={email => setEmails(prev => [email, ...prev])}
        />
      )}
      {showNewTask && (
        <NewTaskModal
          contactId={contact.id}
          onClose={() => setShowNewTask(false)}
          onCreated={task => setTasks(prev => [task, ...prev])}
        />
      )}
    </div>
  );
}
