// Shared ingestion: parse a TikTok Shop "Live Analysis" .xlsx buffer and load
// it into the DB for a brand. Used by both the seed script and the live upload
// endpoint. Dependency-free .xlsx (zip) reader via node:zlib.
import { inflateRawSync } from 'node:zlib';
import { computeKocStats, applyScores } from './scoring.js';
import { getSetting } from './db.js';

/* ----------------------------- minimal unzip ----------------------------- */
function readZipEntry(buf, wantName) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Không phải file .xlsx hợp lệ');
  const cdCount = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < cdCount; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name !== wantName) continue;
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);
    return method === 8 ? inflateRawSync(raw) : Buffer.from(raw);
  }
  throw new Error(`Không tìm thấy ${wantName} trong file`);
}

/* --------------------------- worksheet parsing --------------------------- */
function colToIndex(ref) {
  const m = /^([A-Z]+)/.exec(ref);
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}
function decode(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}
function parseRows(xml) {
  const rows = [];
  const rowRe = /<row[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const cells = [];
    const cellRe = /<c\s+r="([A-Z]+\d+)"([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm;
    while ((cm = cellRe.exec(rm[2]))) {
      const idx = colToIndex(cm[1]);
      const attrs = cm[2] || '';
      const body = cm[3] || '';
      let val = '';
      if (/t="inlineStr"/.test(attrs) || /<is>/.test(body)) {
        const t = body.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        val = t ? decode(t[1]) : '';
      } else {
        const v = body.match(/<v>([\s\S]*?)<\/v>/);
        val = v ? decode(v[1]) : '';
      }
      cells[idx] = val;
    }
    rows.push({ r: +rm[1], cells });
  }
  return rows;
}

const num = (v) => {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[%,\s₫]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
function parseStart(v) {
  const m = /(\d{4})[/-](\d{2})[/-](\d{2})[/\s]+(\d{1,2}):(\d{2})/.exec(String(v || ''));
  if (!m) return { day: null, hour: null, hm: null, iso: null };
  const [, y, mo, d, h, mi] = m;
  const hh = h.padStart(2, '0');
  return { day: `${y}-${mo}-${d}`, hour: +h, hm: `${hh}:${mi}`, iso: `${y}-${mo}-${d} ${hh}:${mi}` };
}
function parseDuration(v) {
  const m = /(?:(\d+)\s*h)?\s*(?:(\d+)\s*min)?/.exec(String(v || ''));
  return (m && m[1] ? +m[1] : 0) * 60 + (m && m[2] ? +m[2] : 0);
}

// Parse the buffer into normalized session rows. Throws on a structurally
// invalid file so the upload endpoint can return a clear error.
export function parseXlsx(buffer) {
  const sheetXml = readZipEntry(buffer, 'xl/worksheets/sheet1.xml').toString('utf8');
  const rows = parseRows(sheetXml);
  const header = rows.find((r) => r.r === 3);
  if (!header || !/nhà sáng tạo/i.test((header.cells || []).join('|'))) {
    throw new Error('File không đúng định dạng "Live Analysis" của TikTok Shop (header phải ở dòng 3).');
  }
  const out = [];
  let minDay = null, maxDay = null;
  for (const { r, cells: c } of rows) {
    if (r < 4) continue;
    const id = (c[0] || '').trim();
    const name = (c[1] || '').trim();
    if (!id || !name) continue;
    const st = parseStart(c[3]);
    if (st.day) { if (!minDay || st.day < minDay) minDay = st.day; if (!maxDay || st.day > maxDay) maxDay = st.day; }
    out.push({
      id, name, user: (c[2] || '').trim(),
      iso: st.iso, day: st.day, hour: st.hour, hm: st.hm, dur: parseDuration(c[4]),
      gmv: num(c[5]), gmvLive: num(c[14]), prodAdded: num(c[6]), distinctSold: num(c[7]),
      orders: num(c[8]), ordersLive: num(c[9]), itemsSold: num(c[10]), customers: num(c[11]),
      avgPrice: num(c[12]), cvrSession: num(c[13]), viewers: num(c[15]), views: num(c[16]),
      watch: num(c[17]), comments: num(c[18]), shares: num(c[19]), likes: num(c[20]),
      newfol: num(c[21]), impr: num(c[22]), clicks: num(c[23]), ctr: num(c[24])
    });
  }
  if (!out.length) throw new Error('Không tìm thấy dòng dữ liệu phiên nào trong file.');
  return { rows: out, minDay, maxDay };
}

async function getOrCreateBrand(db, name) {
  let b = await db.get('SELECT id FROM brands WHERE name = ?', [name]);
  if (!b) {
    await db.run('INSERT INTO brands(name, plan) VALUES(?, ?)', [name, 'Growth']);
    b = await db.get('SELECT id FROM brands WHERE name = ?', [name]);
  }
  return b.id;
}

// Ingest a parsed/raw buffer into the DB. reset=true wipes existing data first
// (used by the initial seed); reset=false appends (used by uploads).
export async function ingest(db, buffer, { brandName, fileName, reset = false } = {}) {
  const { rows, minDay, maxDay } = parseXlsx(buffer);

  await db.tx(async (t) => {
    if (reset) {
      await t.run('DELETE FROM sessions');
      await t.run('DELETE FROM koc_stats');
      await t.run('DELETE FROM datasets');
      await t.run('DELETE FROM kocs');
      await t.run('DELETE FROM brands');
    }
    const brandId = await getOrCreateBrand(t, brandName);

    // Create the dataset row first so every session can carry its dataset_id
    // (enables precise deletion of a single upload batch later).
    const dsVals = ['Live Analysis ' + (maxDay ? maxDay.replace(/-/g, '') : ''), brandId,
      fileName || 'upload.xlsx', rows.length, minDay, maxDay, new Date().toISOString()];
    const dsSql = `INSERT INTO datasets(label,brand_id,file_name,sessions,date_from,date_to,created_at)
                   VALUES(?,?,?,?,?,?,?)`;
    let datasetId;
    if (t.dialect === 'pg') {
      datasetId = (await t.get(dsSql + ' RETURNING id', dsVals)).id;
    } else {
      datasetId = Number((await t.run(dsSql, dsVals)).lastInsertRowid);
    }

    const UPK = `INSERT INTO kocs(id,name,username,brand_id) VALUES(?,?,?,?)
                 ON CONFLICT(id) DO UPDATE SET name=excluded.name, username=excluded.username`;
    const INS = `INSERT INTO sessions
      (koc_id,brand_id,dataset_id,started_at,day,hour,start_hm,duration_min,gmv,gmv_live,
       products_added,distinct_sold,orders,orders_live,items_sold,customers,avg_price,
       cvr_session,viewers,views,watch_avg_sec,comments,shares,likes,new_followers,
       impressions,clicks,ctr)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

    const seen = new Set();
    for (const r of rows) {
      if (!seen.has(r.id)) { await t.run(UPK, [r.id, r.name, r.user, brandId]); seen.add(r.id); }
      await t.run(INS, [
        r.id, brandId, datasetId, r.iso, r.day, r.hour, r.hm, r.dur, r.gmv, r.gmvLive,
        r.prodAdded, r.distinctSold, r.orders, r.ordersLive, r.itemsSold, r.customers, r.avgPrice,
        r.cvrSession, r.viewers, r.views, r.watch, r.comments, r.shares, r.likes, r.newfol,
        r.impr, r.clicks, r.ctr
      ]);
    }
  });

  await rescore(db);
  return { count: rows.length, minDay, maxDay };
}

// Re-score every KOC with the current weights.
async function rescore(db) {
  const weights = await getSetting('weights', null);
  const w = weights ? Object.fromEntries(weights.map((x) => [x.key, x.v])) : undefined;
  await applyScores(db, await computeKocStats(db), w);
}

// Delete one uploaded dataset: drop its sessions, prune KOCs with no remaining
// sessions, then re-score. Returns the number of sessions removed.
export async function deleteDataset(db, id) {
  const before = await db.get('SELECT COUNT(*) n FROM sessions WHERE dataset_id = ?', [id]);
  await db.tx(async (t) => {
    await t.run('DELETE FROM sessions WHERE dataset_id = ?', [id]);
    await t.run('DELETE FROM datasets WHERE id = ?', [id]);
    await t.run('DELETE FROM koc_stats');                 // rebuilt by rescore()
    await t.run('DELETE FROM kocs WHERE id NOT IN (SELECT DISTINCT koc_id FROM sessions)');
  });
  await rescore(db);
  return { removed: before?.n || 0 };
}
