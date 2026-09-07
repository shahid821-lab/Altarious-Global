import { json, bad, requireDB } from '../../../server/lib.js';

/**
 * POST /api/admin/publish — trigger the Cloudflare Pages deploy hook so the static site is rebuilt from D1.
 * GET  /api/admin/publish — status: last publish time, last content change, whether unpublished changes exist.
 */
export async function onRequestPost({ env }) {
  if (!env.DEPLOY_HOOK_URL) return bad('DEPLOY_HOOK_URL is not configured. Create a Deploy Hook in Cloudflare Pages → Settings → Builds and add its URL as an environment variable.', 503);
  const res = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
  if (!res.ok) return bad(`Deploy hook failed (${res.status}).`, 502);
  const db = requireDB(env);
  await db.prepare("INSERT INTO meta (key, value) VALUES ('last_publish_at', strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run();
  return json({ ok: true, message: 'Publish started. The site rebuilds in about 1–2 minutes.' });
}

export async function onRequestGet({ env }) {
  const db = requireDB(env);
  const rows = (await db.prepare("SELECT key, value FROM meta WHERE key IN ('last_publish_at','content_updated_at')").all()).results;
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const count = (await db.prepare('SELECT COUNT(*) n FROM content').first())?.n || 0;
  return json({ ok: true, configured: !!env.DEPLOY_HOOK_URL, lastPublishAt: m.last_publish_at || null, contentUpdatedAt: m.content_updated_at || null, unpublished: !!(m.content_updated_at && (!m.last_publish_at || m.content_updated_at > m.last_publish_at)), contentRows: count });
}
