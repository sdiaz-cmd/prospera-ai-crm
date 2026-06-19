import { run, get, all } from '../../database/db';
import { v4 as uuid } from 'uuid';

// ─── Constants ────────────────────────────────────────────────────────────────

export const PROJECT_STATUSES = [
  'creado', 'planificacion', 'pendiente_oc', 'pendiente_pago',
  'pendiente_materiales', 'en_compra', 'en_ingenieria', 'en_preparacion',
  'en_bodega', 'despacho_programado', 'instalacion_agendada', 'en_ruta',
  'en_instalacion', 'en_pruebas', 'pendiente_observaciones', 'pendiente_cliente',
  'capacitacion', 'acta_pendiente', 'entregado', 'garantia', 'postventa',
  'cerrado', 'cancelado',
] as const;

export type ProjectStatus = typeof PROJECT_STATUSES[number];

export const PROJECT_TYPES = [
  'led', 'videoconferencia', 'audio', 'cctv', 'networking', 'control',
  'domotica', 'totem', 'lcd', 'unipol', 'estructura_metalica',
  'mantencion_preventiva', 'mantencion_correctiva', 'garantia',
  'visita_tecnica', 'interno', 'demo', 'servicio_especial',
  'actualizacion_tecnologica', 'other',
] as const;

export const PROJECT_ORIGINS = [
  'manual', 'opportunity', 'warranty', 'maintenance_preventive',
  'maintenance_corrective', 'ticket', 'internal', 'demo', 'partner',
  'tech_update', 'technical_visit', 'special',
] as const;

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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Project {
  id: string; companyId: string; code: string; name: string; description: string | null;
  origin: string; originId: string | null;
  type: string; priority: string; status: string;
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
  // joined
  sellerName?: string; chiefName?: string; leadTechName?: string;
  accountName?: string; cuadrillaName?: string;
  taskCount?: number; completedTaskCount?: number;
  checklistTotal?: number; checklistDone?: number;
}

export interface ProjectLog {
  id: string; projectId: string; userId: string | null; userName: string | null;
  type: string; title: string; description: string | null;
  oldValue: string | null; newValue: string | null; createdAt: string;
}

export interface ProjectTask {
  id: string; projectId: string; parentId: string | null;
  title: string; description: string | null;
  status: string; priority: string; assignedTo: string | null;
  dueDate: string | null; estimatedHours: number; actualHours: number;
  sortOrder: number; createdAt: string; updatedAt: string;
  assigneeName?: string;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface PRow {
  id: string; company_id: string; code: string; name: string; description: string | null;
  origin: string; origin_id: string | null; type: string; priority: string; status: string;
  account_id: string | null; contact_id: string | null;
  client_name: string | null; client_email: string | null; client_phone: string | null;
  address: string | null; city: string | null; region: string | null;
  country: string; coordinates: string | null;
  seller_id: string | null; service_chief_id: string | null; lead_tech_id: string | null;
  cuadrilla_id: string | null;
  commitment_date: string | null; installation_date: string | null;
  delivery_date: string | null; close_date: string | null;
  sale_amount: number; estimated_cost: number; actual_cost: number;
  estimated_hours: number; actual_hours: number;
  commercial_notes: string | null; technical_notes: string | null; risks: string | null;
  created_by: string | null; created_at: string; updated_at: string;
  seller_name?: string; chief_name?: string; lead_tech_name?: string;
  account_name?: string; cuadrilla_name?: string;
  task_count?: number; completed_task_count?: number;
  checklist_total?: number; checklist_done?: number;
}

function mapProject(r: PRow, includeFinancials = true): Project {
  return {
    id: r.id, companyId: r.company_id, code: r.code, name: r.name,
    description: r.description, origin: r.origin, originId: r.origin_id,
    type: r.type, priority: r.priority, status: r.status,
    accountId: r.account_id, contactId: r.contact_id,
    clientName: r.client_name, clientEmail: r.client_email, clientPhone: r.client_phone,
    address: r.address, city: r.city, region: r.region, country: r.country,
    coordinates: r.coordinates,
    sellerId: r.seller_id, serviceChiefId: r.service_chief_id, leadTechId: r.lead_tech_id,
    cuadrillaId: r.cuadrilla_id,
    commitmentDate: r.commitment_date, installationDate: r.installation_date,
    deliveryDate: r.delivery_date, closeDate: r.close_date,
    saleAmount:     includeFinancials ? Number(r.sale_amount     || 0) : 0,
    estimatedCost:  includeFinancials ? Number(r.estimated_cost  || 0) : 0,
    actualCost:     includeFinancials ? Number(r.actual_cost     || 0) : 0,
    estimatedHours: Number(r.estimated_hours || 0),
    actualHours:    Number(r.actual_hours    || 0),
    commercialNotes: r.commercial_notes, technicalNotes: r.technical_notes, risks: r.risks,
    createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at,
    sellerName:    r.seller_name,
    chiefName:     r.chief_name,
    leadTechName:  r.lead_tech_name,
    accountName:   r.account_name,
    cuadrillaName: r.cuadrilla_name,
    taskCount:      Number(r.task_count      || 0),
    completedTaskCount: Number(r.completed_task_count || 0),
    checklistTotal: Number(r.checklist_total || 0),
    checklistDone:  Number(r.checklist_done  || 0),
  };
}

const PROJECT_SELECT = `
  SELECT p.*,
    (SELECT name FROM accounts WHERE id = p.account_id) as account_name,
    (SELECT name FROM cuadrillas WHERE id = p.cuadrilla_id) as cuadrilla_name,
    (u1.first_name || ' ' || u1.last_name) as seller_name,
    (u2.first_name || ' ' || u2.last_name) as chief_name,
    (u3.first_name || ' ' || u3.last_name) as lead_tech_name,
    (SELECT COUNT(*) FROM project_tasks WHERE project_id = p.id) as task_count,
    (SELECT COUNT(*) FROM project_tasks WHERE project_id = p.id AND status = 'completada') as completed_task_count,
    (SELECT COUNT(*) FROM project_checklist_items WHERE project_id = p.id) as checklist_total,
    (SELECT COUNT(*) FROM project_checklist_items WHERE project_id = p.id AND is_completed = 1) as checklist_done
  FROM projects p
  LEFT JOIN users u1 ON p.seller_id = u1.id
  LEFT JOIN users u2 ON p.service_chief_id = u2.id
  LEFT JOIN users u3 ON p.lead_tech_id = u3.id
`;

function nextCode(companyId: string): string {
  const row = get<{ c: number }>('SELECT COUNT(*) as c FROM projects WHERE company_id = ?', [companyId]);
  const n = Number(row?.c || 0) + 1;
  return `OP-${String(n).padStart(5, '0')}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ProjectsService {

  findAll(companyId: string, params: {
    status?: string; type?: string; priority?: string;
    search?: string; techId?: string;
    page?: number; limit?: number;
  } = {}, includeFinancials = true): { projects: Project[]; total: number } {
    const page  = params.page  || 1;
    const limit = Math.min(params.limit || 50, 200);
    const offset = (page - 1) * limit;

    const conditions = ['p.company_id = ?'];
    const vals: unknown[] = [companyId];

    if (params.status)   { conditions.push('p.status = ?');   vals.push(params.status); }
    if (params.type)     { conditions.push('p.type = ?');     vals.push(params.type); }
    if (params.priority) { conditions.push('p.priority = ?'); vals.push(params.priority); }
    if (params.search)   {
      conditions.push('(p.name LIKE ? OR p.code LIKE ? OR p.client_name LIKE ?)');
      const s = `%${params.search}%`;
      vals.push(s, s, s);
    }
    if (params.techId) {
      conditions.push('(p.lead_tech_id = ? OR EXISTS (SELECT 1 FROM project_team pt WHERE pt.project_id = p.id AND pt.user_id = ?))');
      vals.push(params.techId, params.techId);
    }

    const where = conditions.join(' AND ');
    const rows = all<PRow>(`${PROJECT_SELECT} WHERE ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`, [...vals, limit, offset]);
    const totalRow = get<{ c: number }>(`SELECT COUNT(*) as c FROM projects p WHERE ${where}`, vals);

    return {
      projects: rows.map(r => mapProject(r, includeFinancials)),
      total: Number(totalRow?.c || 0),
    };
  }

  findById(id: string, companyId: string, includeFinancials = true): Project {
    const row = get<PRow>(`${PROJECT_SELECT} WHERE p.id = ? AND p.company_id = ?`, [id, companyId]);
    if (!row) throw new Error('Proyecto no encontrado');
    return mapProject(row, includeFinancials);
  }

  create(companyId: string, userId: string, userName: string, data: Record<string, unknown>): Project {
    const id   = uuid();
    const code = nextCode(companyId);

    run(`INSERT INTO projects (
      id, company_id, code, name, description, origin, origin_id,
      type, priority, status, account_id, contact_id,
      client_name, client_email, client_phone,
      address, city, region, country, coordinates,
      seller_id, service_chief_id, lead_tech_id, cuadrilla_id,
      commitment_date, installation_date, delivery_date,
      sale_amount, estimated_cost, estimated_hours,
      commercial_notes, technical_notes, risks, created_by
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, companyId, code, data.name, data.description || null,
      data.origin || 'manual', data.originId || null,
      data.type || 'other', data.priority || 'media', data.status || 'creado',
      data.accountId || null, data.contactId || null,
      data.clientName || null, data.clientEmail || null, data.clientPhone || null,
      data.address || null, data.city || null, data.region || null,
      data.country || 'Chile', data.coordinates || null,
      data.sellerId || null, data.serviceChiefId || null, data.leadTechId || null,
      data.cuadrillaId || null,
      data.commitmentDate || null, data.installationDate || null, data.deliveryDate || null,
      Number(data.saleAmount || 0), Number(data.estimatedCost || 0), Number(data.estimatedHours || 0),
      data.commercialNotes || null, data.technicalNotes || null, data.risks || null,
      userId,
    ]);

    this.addLog(id, companyId, userId, userName, 'event', 'Proyecto creado', `Código: ${code}`);

    // Add team member if leadTechId provided
    if (data.leadTechId) {
      this.addTeamMember(id, data.leadTechId as string, 'lead_tech');
    }

    return this.findById(id, companyId);
  }

  update(id: string, companyId: string, userId: string, userName: string, data: Record<string, unknown>): Project {
    const existing = this.findById(id, companyId);
    const map: Record<string, string> = {
      name: 'name', description: 'description', type: 'type', priority: 'priority',
      clientName: 'client_name', clientEmail: 'client_email', clientPhone: 'client_phone',
      address: 'address', city: 'city', region: 'region', country: 'country', coordinates: 'coordinates',
      sellerId: 'seller_id', serviceChiefId: 'service_chief_id', leadTechId: 'lead_tech_id',
      cuadrillaId: 'cuadrilla_id', accountId: 'account_id', contactId: 'contact_id',
      commitmentDate: 'commitment_date', installationDate: 'installation_date',
      deliveryDate: 'delivery_date',
      saleAmount: 'sale_amount', estimatedCost: 'estimated_cost', actualCost: 'actual_cost',
      estimatedHours: 'estimated_hours', actualHours: 'actual_hours',
      commercialNotes: 'commercial_notes', technicalNotes: 'technical_notes', risks: 'risks',
    };
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (data[k] !== undefined) { sets.push(`${col} = ?`); vals.push(data[k]); }
    }
    if (sets.length > 0) {
      vals.push(new Date().toISOString(), id);
      run(`UPDATE projects SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, vals);
    }
    void existing;
    this.addLog(id, companyId, userId, userName, 'event', 'Proyecto actualizado');
    return this.findById(id, companyId);
  }

  changeStatus(id: string, companyId: string, userId: string, userName: string, newStatus: string): Project {
    const proj = this.findById(id, companyId);
    const oldStatus = proj.status;
    const closeDate = ['entregado', 'cerrado', 'cancelado'].includes(newStatus) ? new Date().toISOString() : null;

    run(
      `UPDATE projects SET status = ?, close_date = COALESCE(?, close_date), updated_at = ? WHERE id = ?`,
      [newStatus, closeDate, new Date().toISOString(), id]
    );
    this.addLog(id, companyId, userId, userName, 'status_change',
      `Estado cambiado: ${STATUS_LABELS[oldStatus] || oldStatus} → ${STATUS_LABELS[newStatus] || newStatus}`,
      null, oldStatus, newStatus
    );
    return this.findById(id, companyId);
  }

  delete(id: string, companyId: string): void {
    const ex = get('SELECT id FROM projects WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!ex) throw new Error('Proyecto no encontrado');
    run('DELETE FROM projects WHERE id = ? AND company_id = ?', [id, companyId]);
  }

  // ── Logs (bitácora) ───────────────────────────────────────────────

  addLog(projectId: string, companyId: string, userId: string | null, userName: string | null,
    type: string, title: string, description?: string | null,
    oldValue?: string | null, newValue?: string | null): void {
    run(
      `INSERT INTO project_logs (id, project_id, company_id, user_id, user_name, type, title, description, old_value, new_value)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [uuid(), projectId, companyId, userId, userName, type, title, description || null, oldValue || null, newValue || null]
    );
  }

  getLogs(projectId: string, companyId: string): ProjectLog[] {
    const rows = all<{
      id: string; project_id: string; user_id: string | null; user_name: string | null;
      type: string; title: string; description: string | null;
      old_value: string | null; new_value: string | null; created_at: string;
    }>('SELECT * FROM project_logs WHERE project_id = ? AND company_id = ? ORDER BY created_at ASC', [projectId, companyId]);
    return rows.map(r => ({
      id: r.id, projectId: r.project_id, userId: r.user_id, userName: r.user_name,
      type: r.type, title: r.title, description: r.description,
      oldValue: r.old_value, newValue: r.new_value, createdAt: r.created_at,
    }));
  }

  // ── Team ──────────────────────────────────────────────────────────

  addTeamMember(projectId: string, userId: string, role = 'tecnico'): void {
    const ex = get('SELECT id FROM project_team WHERE project_id = ? AND user_id = ?', [projectId, userId]);
    if (!ex) run('INSERT INTO project_team (id, project_id, user_id, role) VALUES (?,?,?,?)', [uuid(), projectId, userId, role]);
  }

  removeTeamMember(projectId: string, userId: string): void {
    run('DELETE FROM project_team WHERE project_id = ? AND user_id = ?', [projectId, userId]);
  }

  getTeam(projectId: string): { id: string; userId: string; role: string; firstName: string; lastName: string; email: string }[] {
    return all<{ id: string; user_id: string; role: string; first_name: string; last_name: string; email: string }>(
      `SELECT pt.id, pt.user_id, pt.role, u.first_name, u.last_name, u.email
       FROM project_team pt JOIN users u ON pt.user_id = u.id
       WHERE pt.project_id = ?`,
      [projectId]
    ).map(r => ({ id: r.id, userId: r.user_id, role: r.role, firstName: r.first_name, lastName: r.last_name, email: r.email }));
  }

  // ── Tasks ─────────────────────────────────────────────────────────

  getTasks(projectId: string): ProjectTask[] {
    return all<Record<string, unknown>>(
      `SELECT pt.*, (u.first_name || ' ' || u.last_name) as assignee_name
       FROM project_tasks pt LEFT JOIN users u ON pt.assigned_to = u.id
       WHERE pt.project_id = ? ORDER BY pt.sort_order, pt.created_at`,
      [projectId]
    ).map(r => ({
      id: r.id as string, projectId: r.project_id as string,
      parentId: r.parent_id as string | null, title: r.title as string,
      description: r.description as string | null, status: r.status as string,
      priority: r.priority as string, assignedTo: r.assigned_to as string | null,
      dueDate: r.due_date as string | null,
      estimatedHours: Number(r.estimated_hours || 0), actualHours: Number(r.actual_hours || 0),
      sortOrder: Number(r.sort_order || 0), createdAt: r.created_at as string, updatedAt: r.updated_at as string,
      assigneeName: r.assignee_name as string | undefined,
    }));
  }

  createTask(projectId: string, companyId: string, data: Record<string, unknown>): ProjectTask {
    const id = uuid();
    run(`INSERT INTO project_tasks (id, project_id, company_id, parent_id, title, description, status, priority, assigned_to, due_date, estimated_hours, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, projectId, companyId, data.parentId || null, data.title, data.description || null,
       data.status || 'pendiente', data.priority || 'media', data.assignedTo || null,
       data.dueDate || null, Number(data.estimatedHours || 0), Number(data.sortOrder || 0)]);
    return this.getTasks(projectId).find(t => t.id === id)!;
  }

  updateTask(taskId: string, projectId: string, data: Record<string, unknown>): ProjectTask {
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const [k, col] of Object.entries({
      title: 'title', description: 'description', status: 'status', priority: 'priority',
      assignedTo: 'assigned_to', dueDate: 'due_date', actualHours: 'actual_hours',
    })) {
      if (data[k] !== undefined) { sets.push(`${col} = ?`); vals.push(data[k]); }
    }
    if (sets.length > 0) {
      vals.push(new Date().toISOString(), taskId, projectId);
      run(`UPDATE project_tasks SET ${sets.join(', ')}, updated_at = ? WHERE id = ? AND project_id = ?`, vals);
    }
    return this.getTasks(projectId).find(t => t.id === taskId)!;
  }

  deleteTask(taskId: string, projectId: string): void {
    run('DELETE FROM project_tasks WHERE id = ? AND project_id = ?', [taskId, projectId]);
  }

  // ── Checklist ─────────────────────────────────────────────────────

  getChecklist(projectId: string): ChecklistItem[] {
    return all<Record<string, unknown>>(
      'SELECT * FROM project_checklist_items WHERE project_id = ? ORDER BY category, sort_order',
      [projectId]
    ).map(r => ({
      id: r.id as string, projectId: r.project_id as string,
      category: r.category as string, item: r.item as string,
      isRequired: !!(r.is_required), isCompleted: !!(r.is_completed),
      completedBy: r.completed_by as string | null, completedAt: r.completed_at as string | null,
      notes: r.notes as string | null, sortOrder: Number(r.sort_order || 0),
    }));
  }

  addChecklistItem(projectId: string, companyId: string, data: { category?: string; item: string; isRequired?: boolean; sortOrder?: number }): ChecklistItem {
    const id = uuid();
    run(`INSERT INTO project_checklist_items (id, project_id, company_id, category, item, is_required, sort_order)
         VALUES (?,?,?,?,?,?,?)`,
      [id, projectId, companyId, data.category || 'General', data.item, data.isRequired !== false ? 1 : 0, data.sortOrder || 0]);
    return this.getChecklist(projectId).find(i => i.id === id)!;
  }

  toggleChecklistItem(itemId: string, projectId: string, userId: string): ChecklistItem {
    const item = get<{ is_completed: number }>(
      'SELECT is_completed FROM project_checklist_items WHERE id = ? AND project_id = ?', [itemId, projectId]
    );
    if (!item) throw new Error('Item no encontrado');
    const newVal = item.is_completed ? 0 : 1;
    run(`UPDATE project_checklist_items SET is_completed = ?, completed_by = ?, completed_at = ? WHERE id = ?`,
      [newVal, newVal ? userId : null, newVal ? new Date().toISOString() : null, itemId]);
    return this.getChecklist(projectId).find(i => i.id === itemId)!;
  }

  deleteChecklistItem(itemId: string, projectId: string): void {
    run('DELETE FROM project_checklist_items WHERE id = ? AND project_id = ?', [itemId, projectId]);
  }

  bulkAddChecklist(projectId: string, companyId: string, items: { category: string; item: string }[]): void {
    items.forEach((item, i) => {
      this.addChecklistItem(projectId, companyId, { ...item, sortOrder: i });
    });
  }

  // ── Documents ─────────────────────────────────────────────────────

  getDocuments(projectId: string): ProjectDocument[] {
    return all<Record<string, unknown>>(
      'SELECT * FROM project_documents WHERE project_id = ? ORDER BY created_at DESC', [projectId]
    ).map(r => ({
      id: r.id as string, projectId: r.project_id as string,
      type: r.type as string, name: r.name as string,
      fileUrl: r.file_url as string | null, fileSize: r.file_size as number | null,
      mimeType: r.mime_type as string | null, notes: r.notes as string | null,
      uploadedBy: r.uploaded_by as string | null, createdAt: r.created_at as string,
    }));
  }

  addDocument(projectId: string, companyId: string, userId: string, data: {
    type: string; name: string; fileUrl?: string; notes?: string;
  }): ProjectDocument {
    const id = uuid();
    run(`INSERT INTO project_documents (id, project_id, company_id, type, name, file_url, notes, uploaded_by)
         VALUES (?,?,?,?,?,?,?,?)`,
      [id, projectId, companyId, data.type, data.name, data.fileUrl || null, data.notes || null, userId]);
    return this.getDocuments(projectId).find(d => d.id === id)!;
  }

  deleteDocument(docId: string, projectId: string): void {
    run('DELETE FROM project_documents WHERE id = ? AND project_id = ?', [docId, projectId]);
  }

  // ── Installed Equipment ───────────────────────────────────────────

  getEquipment(projectId: string): InstalledEquipment[] {
    return all<Record<string, unknown>>(
      'SELECT * FROM installed_equipment WHERE project_id = ? ORDER BY created_at', [projectId]
    ).map(r => ({
      id: r.id as string, projectId: r.project_id as string,
      accountId: r.account_id as string | null, brand: r.brand as string | null,
      model: r.model as string | null, sku: r.sku as string | null,
      serialNumber: r.serial_number as string | null,
      installationDate: r.installation_date as string | null,
      locationDetail: r.location_detail as string | null,
      warrantyStart: r.warranty_start as string | null, warrantyEnd: r.warranty_end as string | null,
      notes: r.notes as string | null, createdAt: r.created_at as string,
    }));
  }

  addEquipment(projectId: string, companyId: string, data: Record<string, unknown>): InstalledEquipment {
    const id = uuid();
    run(`INSERT INTO installed_equipment (id, project_id, company_id, account_id, brand, model, sku, serial_number, installation_date, location_detail, warranty_start, warranty_end, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, projectId, companyId, data.accountId || null, data.brand || null, data.model || null,
       data.sku || null, data.serialNumber || null, data.installationDate || null,
       data.locationDetail || null, data.warrantyStart || null, data.warrantyEnd || null, data.notes || null]);
    return this.getEquipment(projectId).find(e => e.id === id)!;
  }

  deleteEquipment(equipId: string, projectId: string): void {
    run('DELETE FROM installed_equipment WHERE id = ? AND project_id = ?', [equipId, projectId]);
  }

  // ── Dashboard stats ───────────────────────────────────────────────

  getDashboardStats(companyId: string) {
    const total = get<{ c: number }>('SELECT COUNT(*) as c FROM projects WHERE company_id = ?', [companyId]);
    const active = get<{ c: number }>(
      `SELECT COUNT(*) as c FROM projects WHERE company_id = ? AND status NOT IN ('cerrado','cancelado','entregado')`,
      [companyId]
    );
    const today = new Date().toISOString().split('T')[0];
    const installToday = get<{ c: number }>(
      `SELECT COUNT(*) as c FROM projects WHERE company_id = ? AND DATE(installation_date) = ?`,
      [companyId, today]
    );
    const delayed = get<{ c: number }>(
      `SELECT COUNT(*) as c FROM projects WHERE company_id = ? AND commitment_date < ? AND status NOT IN ('cerrado','cancelado','entregado')`,
      [companyId, today]
    );

    const byStatus: Record<string, number> = {};
    const statusRows = all<{ status: string; c: number }>(
      'SELECT status, COUNT(*) as c FROM projects WHERE company_id = ? GROUP BY status',
      [companyId]
    );
    statusRows.forEach(r => { byStatus[r.status] = Number(r.c); });

    return {
      total: Number(total?.c || 0),
      active: Number(active?.c || 0),
      installToday: Number(installToday?.c || 0),
      delayed: Number(delayed?.c || 0),
      byStatus,
    };
  }
}

export const projectsService = new ProjectsService();
