// Seed the DB from a TikTok Shop "Live Analysis" .xlsx export.
//
//   node seed.js [path/to/file.xlsx] ["Brand name"]
//
// Works against SQLite (default) or Postgres (set DATABASE_URL). Wipes and
// reloads session data, sets default scoring weights / alert thresholds, and
// creates a default admin user.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { db, setSetting } from './src/db.js';
import { ingest } from './src/ingest.js';
import { ensureAdmin } from './src/auth.js';
import { DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS } from './src/defaults.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_XLSX = join(__dirname, '..', 'project', 'uploads', 'Live Analysis20260416084057 (1).xlsx');
const xlsxPath = process.argv[2] || DEFAULT_XLSX;
const brandName = process.argv[3] || 'Macaron Cos';

await setSetting('weights', DEFAULT_WEIGHTS);
await setSetting('thresholds', DEFAULT_THRESHOLDS);

console.log(`[seed] reading ${xlsxPath}`);
const buf = readFileSync(xlsxPath);
const { count, minDay, maxDay } = await ingest(db, buf, { brandName, fileName: basename(xlsxPath), reset: true });

await ensureAdmin(db);

const tot = await db.get('SELECT COUNT(*) n, SUM(gmv) g FROM sessions');
const nk = await db.get('SELECT COUNT(*) n FROM kocs');
console.log(`[seed] sessions=${tot.n}  gmv=${Math.round(tot.g).toLocaleString('en-US')}  kocs=${nk.n}`);
console.log(`[seed] range ${minDay} -> ${maxDay}  brand="${brandName}"  (${count} rows)`);
console.log('[seed] done');
await db.close();
