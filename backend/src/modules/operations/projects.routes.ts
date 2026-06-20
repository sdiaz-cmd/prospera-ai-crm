import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadSingle, UPLOAD_DIR } from '../../middleware/upload.middleware';
import path from 'path';
import fs from 'fs';
import {
  listProjects, getProject, createProject, updateProject, changeProjectStatus,
  deleteProject, getDashboardStats,
  getLogs, addLog,
  getTeam, addTeamMember, removeTeamMember,
  getTasks, createTask, updateTask, deleteTask,
  getChecklist, addChecklistItem, bulkAddChecklist, toggleChecklistItem, deleteChecklistItem,
  getDocuments, addDocument, uploadDocument, deleteDocument,
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
router.get('/:id/documents',           getDocuments);
router.post('/:id/documents',          addDocument);
router.post('/:id/documents/upload',   (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, uploadDocument);
router.delete('/:id/documents/:docId', deleteDocument);

// ── Serve uploaded files (authenticated) ──────────────────────────────────────
router.get('/uploads/:filename', (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename); // prevent path traversal
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) { res.status(404).json({ success: false, message: 'Archivo no encontrado' }); return; }
  res.sendFile(filePath);
});

// ── Installed Equipment ───────────────────────────────────────────────────────
router.get('/:id/equipment',           getEquipment);
router.post('/:id/equipment',          addEquipment);
router.delete('/:id/equipment/:equipId', deleteEquipment);

export default router;
