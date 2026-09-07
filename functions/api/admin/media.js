import { json, bad, readBody, requireDB, clip } from '../../../server/lib.js';

const MAX_BYTES = 1_600_000; // decoded size cap (~1.5 MB); the admin resizes images before upload
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

/**
 * GET    /api/admin/media?limit=&q=   → list library items (no image data)
 * POST   /api/admin/media {filename, mime, dataUrl, alt, width, height} → store, returns {url}
 * PATCH  /api/admin/media {id, alt}
 * DELETE /api/admin/media?id=
 */
export async function onRequestGet({ request, env }) {
  const db = requireDB(env);
  const u = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(u.searchParams.get('limit') || 60)));
  const q = clip(u.searchParams.get('q'), 80);
  const rows = q
    ? (await db.prepare('SELECT id, filename, mime, bytes, width, height, alt, created_at FROM media WHERE filename LIKE ? OR alt LIKE ? ORDER BY created_at DESC LIMIT ?').bind(`%${q}%`, `%${q}%`, limit).all()).results
    : (await db.prepare('SELECT id, filename, mime, bytes, width, height, alt, created_at FROM media ORDER BY created_at DESC LIMIT ?').bind(limit).all()).results;
  return json({ ok: true, items: rows.map((r) => ({ ...r, url: `/media/${r.id}` })) });
}

export async function onRequestPost({ request, env, data: ctxData }) {
  const db = requireDB(env);
  const body = await readBody(request);
  const filename = clip(body.filename, 160) || 'image';
  const mime = clip(body.mime, 60);
  if (!ALLOWED.includes(mime)) return bad(`Unsupported image type "${mime}". Use JPEG, PNG, WebP, GIF or SVG.`);
  const dataUrl = String(body.dataUrl || '');
  const b64 = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;
  if (!b64) return bad('No image data received.');
  const bytes = Math.floor((b64.length * 3) / 4);
  if (bytes > MAX_BYTES) return bad(`Image is too large (${(bytes / 1048576).toFixed(1)} MB). The limit is 1.5 MB — try a smaller image.`);

  const id = `${Date.now().toString(36)}${crypto.randomUUID().slice(0, 8)}`;
  await db
    .prepare('INSERT INTO media (id, filename, mime, bytes, width, height, alt, data, created_by) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(id, filename, mime, bytes, Number(body.width) || null, Number(body.height) || null, clip(body.alt, 300) || null, b64, ctxData?.session?.u || 'admin')
    .run();
  return json({ ok: true, id, url: `/media/${id}`, filename, bytes, width: Number(body.width) || null, height: Number(body.height) || null });
}

export async function onRequestPatch({ request, env }) {
  const db = requireDB(env);
  const { id, alt } = await readBody(request);
  if (!id) return bad('id required');
  await db.prepare('UPDATE media SET alt = ? WHERE id = ?').bind(clip(alt, 300), String(id)).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const db = requireDB(env);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return bad('id required');
  await db.prepare('DELETE FROM media WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
