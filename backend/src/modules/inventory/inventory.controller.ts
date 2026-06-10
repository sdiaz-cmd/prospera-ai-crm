import { Response } from 'express';
import { InventoryService } from './inventory.service';
import { AuthenticatedRequest } from '../../types';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx');

const service = new InventoryService();

export async function getStock(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user!.companyId;
  const { search, lowStock } = req.query;
  const data = service.getStock(companyId, { search: search as string, lowStock: lowStock === 'true' });
  res.json(data);
}

export async function getSummary(req: AuthenticatedRequest, res: Response) {
  res.json(service.getSummary(req.user!.companyId));
}

export async function getMovements(req: AuthenticatedRequest, res: Response) {
  const { productId, limit } = req.query;
  res.json(service.getMovements(req.user!.companyId, productId as string, Number(limit) || 50));
}

export async function addMovement(req: AuthenticatedRequest, res: Response) {
  try {
    const result = service.addMovement(req.user!.companyId, req.user!.userId, req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ message: (e as Error).message });
  }
}

export async function analyzeExcel(req: AuthenticatedRequest, res: Response) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const file = (req as any).file as { buffer: Buffer } | undefined;
    if (!file) { res.status(400).json({ message: 'No se recibió archivo' }); return; }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];

    if (raw.length === 0) { res.status(400).json({ message: 'El archivo está vacío' }); return; }

    const headers = Object.keys(raw[0]);
    const columnMap = mapColumns(headers);

    const items = raw.map((row, i) => ({
      _row: i + 2,
      name: String(row[columnMap.name] ?? '').trim(),
      sku: columnMap.sku ? String(row[columnMap.sku] ?? '').trim() : '',
      category: columnMap.category ? String(row[columnMap.category] ?? '').trim() : '',
      unit: columnMap.unit ? String(row[columnMap.unit] ?? '').trim() : 'pza',
      salePrice: columnMap.salePrice ? toNum(row[columnMap.salePrice]) : 0,
      costPrice: columnMap.costPrice ? toNum(row[columnMap.costPrice]) : 0,
      stock: columnMap.stock ? toNum(row[columnMap.stock]) : 0,
      minStock: columnMap.minStock ? toNum(row[columnMap.minStock]) : 0,
    })).filter(r => r.name);

    res.json({ items, columnMap, totalRows: raw.length, mappedRows: items.length });
  } catch (e) {
    res.status(500).json({ message: 'Error al procesar el archivo: ' + (e as Error).message });
  }
}

export async function importExcel(req: AuthenticatedRequest, res: Response) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'No hay items para importar' }); return;
    }
    const result = service.importProducts(req.user!.companyId, req.user!.userId, items);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: (e as Error).message });
  }
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function mapColumns(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const patterns: Record<string, RegExp> = {
    name:      /nombre|name|producto|descripci[oó]n|item|art[ií]culo/i,
    sku:       /sku|c[oó]digo|code|referencia|ref|clave/i,
    category:  /categor|familia|tipo|grupo/i,
    unit:      /unidad|unit|um|medida/i,
    salePrice: /precio.*venta|venta|sale.*price|price|precio$/i,
    costPrice: /costo|cost|precio.*costo/i,
    stock:     /stock|cantidad|qty|inventario|existencia/i,
    minStock:  /m[ií]nimo|min.*stock|stock.*min/i,
  };
  for (const [field, pattern] of Object.entries(patterns)) {
    const match = headers.find(h => pattern.test(h));
    if (match) map[field] = match;
  }
  if (!map.name && headers[0]) map.name = headers[0];
  return map;
}
