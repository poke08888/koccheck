// Database entry point. Picks the adapter from the environment:
//   DATABASE_URL set  -> PostgreSQL (multi-user / production)
//   otherwise         -> SQLite file (zero-config default)
//
// Uses top-level await so importers receive a fully-connected `db`.
import { createSqlite } from './db/sqlite.js';
import { createPg } from './db/pg.js';

export const USING_PG = !!process.env.DATABASE_URL;

export const db = USING_PG ? await createPg() : await createSqlite();

console.log(`[db] dialect=${db.dialect}${USING_PG ? ' (' + maskUrl(process.env.DATABASE_URL) + ')' : ''}`);

export async function getSetting(key, fallback = null) {
  const row = await db.get('SELECT value FROM settings WHERE key = ?', [key]);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return row.value; }
}

export async function setSetting(key, value) {
  await db.run(
    'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [key, JSON.stringify(value)]
  );
}

function maskUrl(u) {
  try { const x = new URL(u); return `${x.protocol}//${x.username ? x.username + '@' : ''}${x.host}${x.pathname}`; }
  catch { return 'pg'; }
}
