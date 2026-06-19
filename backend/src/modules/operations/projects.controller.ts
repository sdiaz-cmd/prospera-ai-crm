import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import { projectsService } from './projects.service';
import { sendSuccess, sendError } from '../../utils/response';
import { get as dbGet } from '../../database/db';

// ─── Role helpers ─────────────────────────────────────────────────────────────

interface UserCompany { is_owner: number; role_name: string }

function getUserCompany(req: AuthenticatedRequest): UserCompany | undefined {
  return dbGet<UserCompany>(
    `SELECT uc.is_owner, r.name as role_name
     FROM user_companies uc JOIN roles r ON uc.role_id = r.id
     WHERE uc.user_id = ? AND uc.company_id = ?`,
    [req.user!.userId, req.user!.companyId]
  ) ?? undefined;
}

function isAdminOrChief(uc: UserCompany | undefined): boolean {
  return !!(uc?.is_owner ||
    uc?.role_name === 'Administrador' ||
    uc?.role_name === 'Gerente' ||
    uc?.role_name === 'CEO / Gerencia' ||
    uc?.role_name === 'Jefe de Servicio Técnico');
}

function isTech(uc: UserCompany | undefined): boolean {
  return uc?.role_name === 'Técnico';
}

function userName(req: AuthenticatedRequest): string {
  const u = dbGet<{ first_name: string | null; last_name: string | null }>(
    'SELECT first_name, last_name FROM users WHERE id = ?', [req.user!.userId]
  );
  return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || req.user!.email : req.user!.email;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export const listProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uc = getUserCompany(req);
    const tech = isTech(uc);
    const includeFinancials = !tech;

    const params: Record<string, string | number> = {};
    if (req.query.status)   params.status   = String(req.query.status);
    if (req.query.type)     params.type     = String(req.query.type);
    if (req.query.priority) params.priority = String(req.query.priority);
    if (req.query.search)   params.search   = String(req.query.search);
    if (req.query.page)     params.page     = Number(req.query.page);
    if (req.query.limit)    params.limit    = Number(req.query.limit);

    // Técnicos only see their own projects
    if (tech) params.techId = req.user!.userId;

    const result = projectsService.findAll(req.user!.companyId, params, includeFinancials);
    sendSuccess(res, result);
  } catch (err) { next(err); }
};

export const getProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uc = getUserCompany(req);
    const tech = isTech(uc);
    const project = projectsService.findById(req.params.id, req.user!.companyId, !tech);

    // Técnico can only view projects they're assigned to
    if (tech) {
      const onTeam = dbGet(
        'SELECT 1 FROM project_team WHERE project_id = ? AND user_id = ?',
        [req.params.id, req.user!.userId]
      );
      const isLead = project.leadTechId === req.user!.userId;
      if (!onTeam && !isLead) { sendError(res, 'Sin acceso a este proyecto', 403); return; }
    }

    sendSuccess(res, project);
  } catch (err) { next(err); }
};

export const createProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uc = getUserCompany(req);
    if (!isAdminOrChief(uc) && uc?.role_name !== 'Ejecutivo Comercial' && uc?.role_name !== 'Vendedor') {
      sendError(res, 'Sin permiso para crear proyectos', 403); return;
    }
    if (!req.body.name?.trim()) { sendError(res, 'El nombre del proyecto es requerido', 400); return; }
    const project = projectsService.create(
      req.user!.companyId, req.user!.userId, userName(req), req.body
    );
    sendSuccess(res, project, 'Proyecto creado', 201);
  } catch (err) { next(err); }
};

export const updateProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uc = getUserCompany(req);
    if (isTech(uc)) { sendError(res, 'Sin permiso para editar proyectos', 403); return; }
    const project = projectsService.update(
      req.params.id, req.user!.companyId, req.user!.userId, userName(req), req.body
    );
    sendSuccess(res, project, 'Proyecto actualizado');
  } catch (err) { next(err); }
};

export const changeProjectStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.body as { status?: string };
    if (!status) { sendError(res, 'status es requerido', 400); return; }
    const project = projectsService.changeStatus(
      req.params.id, req.user!.companyId, req.user!.userId, userName(req), status
    );
    sendSuccess(res, project, 'Estado actualizado');
  } catch (err) { next(err); }
};

export const deleteProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uc = getUserCompany(req);
    if (!isAdminOrChief(uc)) { sendError(res, 'Sin permiso para eliminar proyectos', 403); return; }
    projectsService.delete(req.params.id, req.user!.companyId);
    sendSuccess(res, null, 'Proyecto eliminado');
  } catch (err) { next(err); }
};

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uc = getUserCompany(req);
    const tech = isTech(uc);
    const stats = tech
      ? projectsService.getDashboardStats(req.user!.companyId)
      : projectsService.getDashboardStats(req.user!.companyId);
    sendSuccess(res, stats);
  } catch (err) { next(err); }
};

// ─── Logs (bitácora) ──────────────────────────────────────────────────────────

export const getLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logs = projectsService.getLogs(req.params.id, req.user!.companyId);
    sendSuccess(res, logs);
  } catch (err) { next(err); }
};

export const addLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, type } = req.body as { title?: string; description?: string; type?: string };
    if (!title?.trim()) { sendError(res, 'title es requerido', 400); return; }
    projectsService.addLog(
      req.params.id, req.user!.companyId, req.user!.userId, userName(req),
      type || 'comment', title.trim(), description
    );
    sendSuccess(res, null, 'Nota agregada', 201);
  } catch (err) { next(err); }
};

// ─── Team ─────────────────────────────────────────────────────────────────────

export const getTeam = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const team = projectsService.getTeam(req.params.id);
    sendSuccess(res, team);
  } catch (err) { next(err); }
};

export const addTeamMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uc = getUserCompany(req);
    if (!isAdminOrChief(uc)) { sendError(res, 'Sin permiso', 403); return; }
    const { userId, role } = req.body as { userId?: string; role?: string };
    if (!userId) { sendError(res, 'userId es requerido', 400); return; }
    projectsService.addTeamMember(req.params.id, userId, role || 'tecnico');
    const team = projectsService.getTeam(req.params.id);
    sendSuccess(res, team, 'Miembro agregado', 201);
  } catch (err) { next(err); }
};

export const removeTeamMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uc = getUserCompany(req);
    if (!isAdminOrChief(uc)) { sendError(res, 'Sin permiso', 403); return; }
    projectsService.removeTeamMember(req.params.id, req.params.userId);
    sendSuccess(res, null, 'Miembro removido');
  } catch (err) { next(err); }
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const getTasks = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tasks = projectsService.getTasks(req.params.id);
    sendSuccess(res, tasks);
  } catch (err) { next(err); }
};

export const createTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.body.title?.trim()) { sendError(res, 'title es requerido', 400); return; }
    const task = projectsService.createTask(req.params.id, req.user!.companyId, req.body);
    sendSuccess(res, task, 'Tarea creada', 201);
  } catch (err) { next(err); }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = projectsService.updateTask(req.params.taskId, req.params.id, req.body);
    sendSuccess(res, task, 'Tarea actualizada');
  } catch (err) { next(err); }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uc = getUserCompany(req);
    if (isTech(uc)) { sendError(res, 'Sin permiso', 403); return; }
    projectsService.deleteTask(req.params.taskId, req.params.id);
    sendSuccess(res, null, 'Tarea eliminada');
  } catch (err) { next(err); }
};

// ─── Checklist ────────────────────────────────────────────────────────────────

export const getChecklist = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const items = projectsService.getChecklist(req.params.id);
    sendSuccess(res, items);
  } catch (err) { next(err); }
};

export const addChecklistItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { item } = req.body as { item?: string };
    if (!item?.trim()) { sendError(res, 'item es requerido', 400); return; }
    const created = projectsService.addChecklistItem(req.params.id, req.user!.companyId, req.body);
    sendSuccess(res, created, 'Item creado', 201);
  } catch (err) { next(err); }
};

export const bulkAddChecklist = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { items } = req.body as { items?: { category: string; item: string }[] };
    if (!Array.isArray(items) || items.length === 0) { sendError(res, 'items[] es requerido', 400); return; }
    projectsService.bulkAddChecklist(req.params.id, req.user!.companyId, items);
    const checklist = projectsService.getChecklist(req.params.id);
    sendSuccess(res, checklist, 'Checklist cargado', 201);
  } catch (err) { next(err); }
};

export const toggleChecklistItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const item = projectsService.toggleChecklistItem(req.params.itemId, req.params.id, req.user!.userId);
    sendSuccess(res, item);
  } catch (err) { next(err); }
};

export const deleteChecklistItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uc = getUserCompany(req);
    if (!isAdminOrChief(uc)) { sendError(res, 'Sin permiso', 403); return; }
    projectsService.deleteChecklistItem(req.params.itemId, req.params.id);
    sendSuccess(res, null, 'Item eliminado');
  } catch (err) { next(err); }
};

// ─── Documents ────────────────────────────────────────────────────────────────

export const getDocuments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const docs = projectsService.getDocuments(req.params.id);
    sendSuccess(res, docs);
  } catch (err) { next(err); }
};

export const addDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, name } = req.body as { type?: string; name?: string };
    if (!type?.trim() || !name?.trim()) { sendError(res, 'type y name son requeridos', 400); return; }
    const doc = projectsService.addDocument(req.params.id, req.user!.companyId, req.user!.userId, req.body);
    sendSuccess(res, doc, 'Documento agregado', 201);
  } catch (err) { next(err); }
};

export const deleteDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    projectsService.deleteDocument(req.params.docId, req.params.id);
    sendSuccess(res, null, 'Documento eliminado');
  } catch (err) { next(err); }
};

// ─── Installed Equipment ──────────────────────────────────────────────────────

export const getEquipment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const equipment = projectsService.getEquipment(req.params.id);
    sendSuccess(res, equipment);
  } catch (err) { next(err); }
};

export const addEquipment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const equip = projectsService.addEquipment(req.params.id, req.user!.companyId, req.body);
    sendSuccess(res, equip, 'Equipo registrado', 201);
  } catch (err) { next(err); }
};

export const deleteEquipment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uc = getUserCompany(req);
    if (!isAdminOrChief(uc)) { sendError(res, 'Sin permiso', 403); return; }
    projectsService.deleteEquipment(req.params.equipId, req.params.id);
    sendSuccess(res, null, 'Equipo eliminado');
  } catch (err) { next(err); }
};
