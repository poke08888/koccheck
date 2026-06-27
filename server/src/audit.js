// Audit log — records who did what, when. Logging never throws into the caller.
export async function logAction(db, actor, action, detail = '') {
  try {
    await db.run(
      'INSERT INTO audit_log(ts,user_id,username,action,detail) VALUES(?,?,?,?,?)',
      [new Date().toISOString(), actor?.uid ?? null, actor?.username ?? null, action, detail]
    );
  } catch (e) {
    console.error('[audit] failed to log', action, e.message);
  }
}

export async function recentAudit(db, limit = 200) {
  return db.all('SELECT id, ts, username, action, detail FROM audit_log ORDER BY id DESC LIMIT ?', [limit]);
}
