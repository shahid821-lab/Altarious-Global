import { json, bad, readBody, requireDB } from '../../../server/lib.js';

/**
 * POST /api/admin/seed {force?: boolean}
 * Imports the repo's seed content (dist/admin/seed.json, generated at build) into the D1 `content` table.
 * Without force, existing rows are kept (only missing rows are added).
 */
export async function onRequestPost({ request, env }) {
  const db = requireDB(env);
  const { force } = await readBody(request).catch(() => ({}));
  const origin = new URL(request.url).origin;
  const res = await env.ASSETS.fetch(new Request(`${origin}/admin/seed.json`));
  if (!res.ok) return bad('seed.json not found in the build output.', 500);
  const rows = await res.json();
  const existing = new Set((await db.prepare('SELECT kind, slug FROM content').all()).results.map((r) => `${r.kind}/${r.slug}`));
  let added = 0, updated = 0, skipped = 0;
  const stmts = [];
  for (const r of rows) {
    const key = `${r.kind}/${r.slug}`;
    if (existing.has(key) && !force) { skipped++; continue; }
    existing.has(key) ? updated++ : added++;
    stmts.push(db.prepare(`INSERT INTO content (kind, slug, json, updated_by) VALUES (?, ?, ?, 'seed') ON CONFLICT(kind, slug) DO UPDATE SET json = excluded.json, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_by = 'seed'`).bind(r.kind, r.slug, JSON.stringify(r.json)));
  }
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
  if (stmts.length) await db.prepare("INSERT INTO meta (key, value) VALUES ('content_updated_at', strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run();
  return json({ ok: true, added, updated, skipped, total: rows.length });
}
