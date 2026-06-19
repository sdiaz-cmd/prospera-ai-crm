import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  listProjects, getProject, createProject, updateProject, changeProjectStatus,
  deleteProject, getDashboardStats,
  getLogs, addLog,
  getTeam, addTeamMember, removeTeamMember,
  getTasks, createTask, updateTask, deleteTask,
  getChecklist, addChecklistItem, bulkAddChecklist, toggleChecklistItem, deleteChecklistItem,
  getDocuments, addDocument, deleteDocument,
  getEquipment, addEquipment, deleteEquipment,
} from './projects.controller';

const router = Router();
router.use(authenticate);

// ── Projects ──────────────────────────────────────────────────────────────────
router.get('/dashboard', getDashboardStats);
router.get('/',          listProjects);
router.post('/',         createProject);
router.get('/:id',       getProject);
router.patch('/:id',     updateProject);
router.patch('/:id/status', changeProjectStatus);
router.delete('/:id',    deleteProject);

// ── Bitácora ──────────────────────────────────────────────────────────────────
router.get('/:id/logs',  getLogs);
router.post('/:id/logs', addLog);

// ── Team ──────────────────────────────────────────────────────────────────────
router.get('/:id/team',              getTeam);
router.post('/:id/team',             addTeamMember);
router.delete('/:id/team/:userId',   removeTeamMember);

// ── Tasks ─────────────────────────────────────────────────────────────────────
router.get('/:id/tasks',              getTasks);
router.post('/:id/tasks',             createTask);
router.patch('/:id/tasks/:taskId',    updateTask);
router.delete('/:id/tasks/:taskId',   deleteTask);

// ── Checklist ─────────────────────────────────────────────────────────────────
router.get('/:id/checklist',                      getChecklist);
router.post('/:id/checklist',                     addChecklistItem);
router.post('/:id/checklist/bulk',                bulkAddChecklist);
router.patch('/:id/checklist/:itemId/toggle',     toggleChecklistItem);
router.delete('/:id/checklist/:itemId',           deleteChecklistItem);

// ── Documents ─────────────────────────────────────────────────────────────────
router.get('/:id/documents',          getDocuments);
router.post('/:id/documents',         addDocument);
router.delete('/:id/documents/:docId', deleteDocument);

// ── Installed Equipment ───────────────────────────────────────────────────────
router.get('/:id/equipment',           getEquipment);
router.post('/:id/equipment',          addEquipment);
router.delete('/:id/equipment/:equipId', deleteEquipment);

export default router;
