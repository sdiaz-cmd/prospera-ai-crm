/* eslint-disable @typescript-eslint/no-require-imports */
// node:sqlite es experimental en Node 22 — se estabilizará en Node 24
// @ts-ignore
const { DatabaseSync } = require('node:sqlite');
import path from 'path';

// DATABASE_PATH puede ser ruta absoluta o relativa al directorio backend/
// En Railway, el volumen persistente se monta en /data
const defaultPath = process.env.NODE_ENV === 'production' ? '/data/prospera.db' : './dev.db';
const rawPath = process.env.DATABASE_PATH || defaultPath;
const dbPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);

export const db = new DatabaseSync(dbPath);

// Integridad referencial activada
db.exec('PRAGMA foreign_keys = ON');

// ─── Query helpers ────────────────────────────────────────────────

export function run(sql: string, params: unknown[] = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

export function get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
  const stmt = db.prepare(sql);
  const row = stmt.get(...params);
  return row ? (Object.assign({}, row) as T) : undefined;
}

export function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  return (stmt.all(...params) as unknown[]).map((r) => Object.assign({}, r)) as T[];
}

export function count(sql: string, params: unknown[] = []): number {
  const stmt = db.prepare(sql);
  const row = stmt.get(...params) as Record<string, unknown> | undefined;
  if (!row) return 0;
  const val = Object.values(row)[0];
  return typeof val === 'number' ? val : Number(val) || 0;
}

export default db;
