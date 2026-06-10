import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(__dirname, '../../../dev.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('🗑️  Base de datos eliminada');
}

import('./migrate').then(() => import('./seed'));
