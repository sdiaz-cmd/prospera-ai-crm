import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | Date, format = 'short'): string {
  const d = new Date(date);
  if (format === 'short') {
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function getInitials(firstName: string, lastName?: string): string {
  const first = firstName?.charAt(0).toUpperCase() || '';
  const last = lastName?.charAt(0).toUpperCase() || '';
  return `${first}${last}`;
}

export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Ahora mismo';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days} días`;
  return formatDate(date);
}

export const ACTIVITY_TYPES: Record<string, { label: string; color: string }> = {
  call: { label: 'Llamada', color: 'text-blue-600' },
  email: { label: 'Correo', color: 'text-purple-600' },
  meeting: { label: 'Reunión', color: 'text-green-600' },
  note: { label: 'Nota', color: 'text-yellow-600' },
  demo: { label: 'Demo', color: 'text-indigo-600' },
  visit: { label: 'Visita', color: 'text-pink-600' },
};

export const LEAD_STATUS: Record<string, { label: string; color: string }> = {
  new: { label: 'Nuevo', color: 'bg-blue-100 text-blue-700' },
  contacted: { label: 'Contactado', color: 'bg-purple-100 text-purple-700' },
  qualified: { label: 'Calificado', color: 'bg-green-100 text-green-700' },
  unqualified: { label: 'No calificado', color: 'bg-gray-100 text-gray-600' },
  converted: { label: 'Convertido', color: 'bg-emerald-100 text-emerald-700' },
};

export const LEAD_SOURCES: Record<string, string> = {
  web: 'Sitio Web',
  referral: 'Referido',
  social: 'Redes Sociales',
  cold_call: 'Llamada en Frío',
  event: 'Evento',
  other: 'Otro',
};

export const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  trial: { label: 'Prueba', color: 'bg-yellow-100 text-yellow-700' },
  starter: { label: 'Starter', color: 'bg-blue-100 text-blue-700' },
  growth: { label: 'Growth', color: 'bg-purple-100 text-purple-700' },
  enterprise: { label: 'Enterprise', color: 'bg-indigo-100 text-indigo-700' },
};
