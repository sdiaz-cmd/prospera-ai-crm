import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/utils/helpers';
import { Project, STATUS_COLORS, STATUS_LABELS } from './types';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function OperationsCalendar() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Fetch all projects (up to 200) to map by date
  const { data } = useQuery<{ projects: Project[] }>({
    queryKey: ['ops-calendar-projects'],
    queryFn: () => api.get('/projects?limit=200').then(r => r.data.data),
    staleTime: 60000,
  });
  const projects = data?.projects ?? [];

  // Map installation dates to projects
  const byDate: Record<string, Project[]> = {};
  projects.forEach(p => {
    if (p.installationDate) {
      const key = p.installationDate.slice(0, 10);
      (byDate[key] = byDate[key] || []).push(p);
    }
    if (p.commitmentDate && p.commitmentDate !== p.installationDate) {
      const key = p.commitmentDate.slice(0, 10);
      (byDate[key] = byDate[key] || []).push(p);
    }
  });

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-violet-400" /> Calendario de Operaciones
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="p-1.5 text-gray-500 hover:text-gray-800 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <span className="text-base font-semibold text-gray-800 w-44 text-center">{MONTHS_ES[month]} {year}</span>
          <button onClick={next} className="p-1.5 text-gray-500 hover:text-gray-800 transition-colors"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Instalación programada</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> Fecha compromiso</span>
      </div>

      {/* Calendar grid */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAYS_ES.map(d => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {Array.from({ length: cells.length / 7 }, (_, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-0">
            {cells.slice(wi * 7, wi * 7 + 7).map((day, di) => {
              const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
              const isToday = dateStr === todayStr;
              const dayProjects = dateStr ? (byDate[dateStr] || []) : [];

              return (
                <div
                  key={di}
                  className={cn(
                    'min-h-[90px] p-2 border-r border-gray-100 last:border-0',
                    !day && 'bg-white/[0.01]',
                    isToday && 'bg-blue-500/[0.05]'
                  )}
                >
                  {day && (
                    <>
                      <span className={cn(
                        'text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full',
                        isToday ? 'bg-blue-500 text-white' : 'text-gray-500'
                      )}>
                        {day}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {dayProjects.slice(0, 3).map(p => {
                          const isInstall = p.installationDate?.slice(0, 10) === dateStr;
                          return (
                            <Link
                              key={p.id}
                              to={`/operations/projects/${p.id}`}
                              className={cn(
                                'block px-1.5 py-0.5 rounded text-[10px] truncate transition-opacity hover:opacity-80',
                                isInstall ? 'bg-blue-500/30 text-blue-700' : 'bg-orange-500/20 text-orange-700'
                              )}
                              title={p.name}
                            >
                              {p.code}: {p.name}
                            </Link>
                          );
                        })}
                        {dayProjects.length > 3 && (
                          <span className="text-[10px] text-gray-400 px-1">+{dayProjects.length - 3} más</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Side list of this month's events */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-gray-500 mb-4">Eventos de {MONTHS_ES[month]}</h2>
        {(() => {
          const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
          const monthEvents = Object.entries(byDate)
            .filter(([k]) => k.startsWith(monthStr))
            .sort(([a], [b]) => a.localeCompare(b));
          if (monthEvents.length === 0) return <p className="text-gray-400 text-sm">Sin eventos este mes</p>;
          return (
            <div className="space-y-2">
              {monthEvents.map(([date, projs]) => (
                <div key={date} className="flex items-start gap-4">
                  <span className="text-xs text-gray-500 w-20 flex-shrink-0 font-mono">
                    {new Date(date + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                  </span>
                  <div className="flex-1 space-y-1">
                    {projs.map(p => (
                      <Link key={p.id} to={`/operations/projects/${p.id}`} className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[p.status] || 'bg-gray-500/20 text-gray-500')}>
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                        <span className="text-sm text-gray-500 hover:text-blue-700">{p.code}: {p.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
