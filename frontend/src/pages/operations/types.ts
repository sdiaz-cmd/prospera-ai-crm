// ─── Operations Types ─────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  creado: 'Creado', planificacion: 'Planificación', pendiente_oc: 'Pendiente OC',
  pendiente_pago: 'Pendiente pago', pendiente_materiales: 'Pendiente materiales',
  en_compra: 'En compra', en_ingenieria: 'En ingeniería', en_preparacion: 'En preparación',
  en_bodega: 'En bodega', despacho_programado: 'Despacho programado',
  instalacion_agendada: 'Instalación agendada', en_ruta: 'En ruta',
  en_instalacion: 'En instalación', en_pruebas: 'En pruebas',
  pendiente_observaciones: 'Pendiente observaciones', pendiente_cliente: 'Pendiente cliente',
  capacitacion: 'Capacitación', acta_pendiente: 'Acta pendiente',
  entregado: 'Entregado', garantia: 'Garantía', postventa: 'Postventa',
  cerrado: 'Cerrado', cancelado: 'Cancelado',
};

export const STATUS_COLORS: Record<string, string> = {
  creado:                  'bg-slate-100 text-slate-600',
  planificacion:           'bg-blue-100 text-blue-700',
  pendiente_oc:            'bg-amber-100 text-amber-700',
  pendiente_pago:          'bg-orange-100 text-orange-700',
  pendiente_materiales:    'bg-yellow-100 text-yellow-700',
  en_compra:               'bg-purple-100 text-purple-700',
  en_ingenieria:           'bg-violet-100 text-violet-700',
  en_preparacion:          'bg-indigo-100 text-indigo-700',
  en_bodega:               'bg-cyan-100 text-cyan-700',
  despacho_programado:     'bg-sky-100 text-sky-700',
  instalacion_agendada:    'bg-teal-100 text-teal-700',
  en_ruta:                 'bg-blue-100 text-blue-600',
  en_instalacion:          'bg-green-100 text-green-700',
  en_pruebas:              'bg-lime-100 text-lime-700',
  pendiente_observaciones: 'bg-orange-100 text-orange-700',
  pendiente_cliente:       'bg-amber-100 text-amber-700',
  capacitacion:            'bg-emerald-100 text-emerald-700',
  acta_pendiente:          'bg-pink-100 text-pink-700',
  entregado:               'bg-emerald-100 text-emerald-700',
  garantia:                'bg-blue-100 text-blue-700',
  postventa:               'bg-purple-100 text-purple-700',
  cerrado:                 'bg-gray-100 text-gray-600',
  cancelado:               'bg-red-100 text-red-600',
};

export const PRIORITY_COLORS: Record<string, string> = {
  baja:    'bg-green-100 text-green-700',
  media:   'bg-yellow-100 text-yellow-700',
  alta:    'bg-orange-100 text-orange-700',
  critica: 'bg-red-100 text-red-700',
};
export const PRIORITY_LABELS: Record<string, string> = {
  baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica',
};

export const TYPE_LABELS: Record<string, string> = {
  led: 'LED', videoconferencia: 'Videoconferencia', audio: 'Audio', cctv: 'CCTV',
  networking: 'Networking', control: 'Control', domotica: 'Domótica', totem: 'Tótem',
  lcd: 'LCD', unipol: 'Unipol', estructura_metalica: 'Estructura metálica',
  mantencion_preventiva: 'Mantención preventiva', mantencion_correctiva: 'Mantención correctiva',
  garantia: 'Garantía', visita_tecnica: 'Visita técnica', interno: 'Interno',
  demo: 'Demo', servicio_especial: 'Servicio especial', actualizacion_tecnologica: 'Actualización tecnológica',
  other: 'Otro',
};

export const PROJECT_STATUSES = [
  'creado', 'planificacion', 'pendiente_oc', 'pendiente_pago',
  'pendiente_materiales', 'en_compra', 'en_ingenieria', 'en_preparacion',
  'en_bodega', 'despacho_programado', 'instalacion_agendada', 'en_ruta',
  'en_instalacion', 'en_pruebas', 'pendiente_observaciones', 'pendiente_cliente',
  'capacitacion', 'acta_pendiente', 'entregado', 'garantia', 'postventa',
  'cerrado', 'cancelado',
] as const;

export const PROJECT_TYPES = [
  'led', 'videoconferencia', 'audio', 'cctv', 'networking', 'control',
  'domotica', 'totem', 'lcd', 'unipol', 'estructura_metalica',
  'mantencion_preventiva', 'mantencion_correctiva', 'garantia',
  'visita_tecnica', 'interno', 'demo', 'servicio_especial',
  'actualizacion_tecnologica', 'other',
] as const;

export interface Project {
  id: string; companyId: string; code: string; name: string; description: string | null;
  origin: string; originId: string | null; type: string; priority: string; status: string;
  accountId: string | null; contactId: string | null;
  clientName: string | null; clientEmail: string | null; clientPhone: string | null;
  address: string | null; city: string | null; region: string | null;
  country: string; coordinates: string | null;
  sellerId: string | null; serviceChiefId: string | null; leadTechId: string | null;
  cuadrillaId: string | null;
  commitmentDate: string | null; installationDate: string | null;
  deliveryDate: string | null; closeDate: string | null;
  saleAmount: number; estimatedCost: number; actualCost: number;
  estimatedHours: number; actualHours: number;
  commercialNotes: string | null; technicalNotes: string | null; risks: string | null;
  createdBy: string | null; createdAt: string; updatedAt: string;
  sellerName?: string; chiefName?: string; leadTechName?: string;
  accountName?: string; cuadrillaName?: string;
  taskCount?: number; completedTaskCount?: number;
  checklistTotal?: number; checklistDone?: number;
}

export interface ProjectTask {
  id: string; projectId: string; parentId: string | null;
  title: string; description: string | null; status: string; priority: string;
  assignedTo: string | null; dueDate: string | null;
  estimatedHours: number; actualHours: number; sortOrder: number;
  createdAt: string; updatedAt: string; assigneeName?: string;
}

export interface ChecklistItem {
  id: string; projectId: string; category: string; item: string;
  isRequired: boolean; isCompleted: boolean;
  completedBy: string | null; completedAt: string | null;
  notes: string | null; sortOrder: number;
}

export interface ProjectDocument {
  id: string; projectId: string; type: string; name: string;
  fileUrl: string | null; filePath: string | null;
  fileSize: number | null; mimeType: string | null;
  notes: string | null; uploadedBy: string | null; createdAt: string;
}

export interface InstalledEquipment {
  id: string; projectId: string; accountId: string | null;
  brand: string | null; model: string | null; sku: string | null;
  serialNumber: string | null; installationDate: string | null;
  locationDetail: string | null; warrantyStart: string | null;
  warrantyEnd: string | null; notes: string | null; createdAt: string;
}

export interface ProjectLog {
  id: string; projectId: string; userId: string | null; userName: string | null;
  type: string; title: string; description: string | null;
  oldValue: string | null; newValue: string | null; createdAt: string;
}

export interface DashboardStats {
  total: number; active: number; installToday: number; delayed: number;
  byStatus: Record<string, number>;
}
