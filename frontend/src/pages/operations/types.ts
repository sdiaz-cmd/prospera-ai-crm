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
  creado: 'bg-slate-500/20 text-slate-300',
  planificacion: 'bg-blue-500/20 text-blue-300',
  pendiente_oc: 'bg-amber-500/20 text-amber-300',
  pendiente_pago: 'bg-orange-500/20 text-orange-300',
  pendiente_materiales: 'bg-yellow-500/20 text-yellow-300',
  en_compra: 'bg-purple-500/20 text-purple-300',
  en_ingenieria: 'bg-violet-500/20 text-violet-300',
  en_preparacion: 'bg-indigo-500/20 text-indigo-300',
  en_bodega: 'bg-cyan-500/20 text-cyan-300',
  despacho_programado: 'bg-sky-500/20 text-sky-300',
  instalacion_agendada: 'bg-teal-500/20 text-teal-300',
  en_ruta: 'bg-blue-400/20 text-blue-200',
  en_instalacion: 'bg-green-500/20 text-green-300',
  en_pruebas: 'bg-lime-500/20 text-lime-300',
  pendiente_observaciones: 'bg-orange-600/20 text-orange-300',
  pendiente_cliente: 'bg-amber-600/20 text-amber-300',
  capacitacion: 'bg-emerald-500/20 text-emerald-300',
  acta_pendiente: 'bg-pink-500/20 text-pink-300',
  entregado: 'bg-emerald-600/20 text-emerald-200',
  garantia: 'bg-blue-600/20 text-blue-200',
  postventa: 'bg-purple-600/20 text-purple-200',
  cerrado: 'bg-gray-600/20 text-gray-400',
  cancelado: 'bg-red-500/20 text-red-400',
};

export const PRIORITY_COLORS: Record<string, string> = {
  baja:   'bg-green-500/20 text-green-300',
  media:  'bg-yellow-500/20 text-yellow-300',
  alta:   'bg-orange-500/20 text-orange-300',
  critica:'bg-red-500/20 text-red-400',
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
  fileUrl: string | null; fileSize: number | null; mimeType: string | null;
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
