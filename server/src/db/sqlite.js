// node:sqlite adapter (Node >= 22.5). Synchronous engine wrapped in an async
// interface so it is interchangeable with the Postgres adapter.
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { schemaSql, migrate } from './schema.js';

export async function createSqlite() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(__dirname, '..', '..', 'data');
  const dbPath = process.env.KOC_DB || join(dataDir, 'koc.db');
  mkdirSync(dataDir, { recursive: true });

  const sdb = new DatabaseSync(dbPath);
  sdb.exec(schemaSql('sqlite'));

  const adapter = {
    dialect: 'sqlite',
    async all(sql, params = []) { return sdb.prepare(sql).all(...params); },
    async get(sql, params = []) { return sdb.prepare(sql).get(...params); },
    async run(sql, params = []) { const r = sdb.prepare(sql).run(...params); return { changes: r.changes, lastInsertRowid: r.lastInsertRowid }; },
    async exec(sql) { sdb.exec(sql); },
    async tx(fn) {
      sdb.exec('BEGIN');
      try { const out = await fn(adapter); sdb.exec('COMMIT'); return out; }
      catch (e) { try { sdb.exec('ROLLBACK'); } catch {} throw e; }
    },
    async close() { sdb.close(); }
  };
  await migrate(adapter);
  return adapter;
}
