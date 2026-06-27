// PostgreSQL adapter (node-postgres). Same async interface as the SQLite
// adapter so the rest of the app is dialect-agnostic.
//
// Two dialect bridges:
//  - placeholders: app SQL uses `?`; we rewrite to $1,$2,... for pg.
//  - numerics: pg returns BIGINT (oid 20) and NUMERIC (1700) as strings; we
//    parse them to JS numbers so math matches the SQLite path.
import pg from 'pg';
import { schemaSql, migrate } from './schema.js';

pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));   // int8
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // numeric

const toPg = (sql) => { let i = 0; return sql.replace(/\?/g, () => '$' + (++i)); };

export async function createPg() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.PG_POOL_MAX || 10)
  });
  await pool.query(schemaSql('pg'));

  const wrap = (q) => ({
    dialect: 'pg',
    async all(sql, params = []) { return (await q(toPg(sql), params)).rows; },
    async get(sql, params = []) { return (await q(toPg(sql), params)).rows[0]; },
    async run(sql, params = []) { const r = await q(toPg(sql), params); return { changes: r.rowCount, lastInsertRowid: undefined }; },
    async exec(sql) { await q(sql); }   // multi-statement DDL, no params
  });

  const adapter = {
    ...wrap((text, params) => pool.query(text, params)),
    async tx(fn) {
      const client = await pool.connect();
      const txAdapter = { ...wrap((text, params) => client.query(text, params)), tx: (f) => f(txAdapter) };
      try {
        await client.query('BEGIN');
        const out = await fn(txAdapter);
        await client.query('COMMIT');
        return out;
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        throw e;
      } finally { client.release(); }
    },
    async close() { await pool.end(); }
  };
  await migrate(adapter);
  return adapter;
}
