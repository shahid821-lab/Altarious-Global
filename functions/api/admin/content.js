import { json, bad, readBody, requireDB, clip, slugify } from '../../../server/lib.js';

const KINDS = ['site', 'vertical', 'sub-vertical', 'product', 'article', 'page', 'settings'];

/**
 * CMS content API (D1 table `content`).
 * GET    /api/admin/content?kind=article            → list (summaries, no article bodies)
 * GET    /api/admin/content?kind=article&slug=x     → one entity
 * GET    /api/admin/content?all=1                   → everything (for relationship pickers)
 * PUT    /api/admin/content  {kind, slug, data, prevSlug?} → upsert (rename when prevSlug differs)
 * DELETE /api/admin/content?kind=&slug=
 */
export async function onRequestGet({ request, env }) {
  const db = requireDB(env);
  const u = new URL(request.url);
  const kind = u.searchParams.get('kind');
  const slug = u.searchParams.get('slug');
  if (u.searchParams.get('all')) {
    const rows = (await db.prepare('SELECT kind, slug, json, updated_at FROM content').all()).results;
    return json({ ok: true, rows: rows.map((r) => ({ ...r, data: summary(r.kind, JSON.parse(r.json)), json: undefined })) });
  }
  if (!KINDS.includes(kind)) return bad('kind required');
  if (slug) {
    const row = await db.prepare('SELECT kind, slug, json, updated_at, updated_by FROM content WHERE kind = ? AND slug = ?').bind(kind, slug).first();
    return row ? json({ ok: true, kind, slug, data: JSON.parse(row.json), updated_at: row.updated_at, updated_by: row.updated_by }) : bad('Not found', 404);
  }
  const rows = (await db.prepare('SELECT kind, slug, json, updated_at FROM content WHERE kind = ? ORDER BY slug').bind(kind).all()).results;
  return json({ ok: true, kind, items: rows.map((r) => ({ slug: r.slug, updated_at: r.updated_at, ...summary(kind, JSON.parse(r.json)) })) });
}

export async function onRequestPut({ request, env, data: ctxData }) {
  const db = requireDB(env);
  const body = await readBody(request);
  const { kind, prevSlug } = body;
  let { slug, data } = body;
  if (!KINDS.includes(kind)) return bad('Invalid kind');
  if (!data || typeof data !== 'object') return bad('data object required');
  slug = kind === 'site' || kind === 'settings' ? kind : kind === 'product' ? `${slugify(data.subVertical || '')}--${slugify(data.type || '')}` : slugify(slug || data.slug || data.name || data.title || '');
  if (!slug) return bad('slug required');

  const err = validate(kind, data, slug);
  if (err) return bad(err);
  if (kind !== 'site' && kind !== 'page' && kind !== 'product') data.slug = slug;

  /* referential checks */
  if (kind === 'sub-vertical' || kind === 'product' || kind === 'article') {
    const v = await db.prepare("SELECT 1 FROM content WHERE kind='vertical' AND slug=?").bind(data.vertical).first();
    if (!v) return bad(`Unknown vertical "${data.vertical}"`);
  }
  if (kind === 'product' || kind === 'article') {
    const s = await db.prepare("SELECT json FROM content WHERE kind='sub-vertical' AND slug=?").bind(data.subVertical).first();
    if (!s) return bad(`Unknown sub-vertical "${data.subVertical}"`);
    if (JSON.parse(s.json).vertical !== data.vertical) return bad('Sub-vertical does not belong to the selected vertical');
  }
  if (kind === 'article') {
    const p = await db.prepare("SELECT 1 FROM content WHERE kind='product' AND slug=?").bind(`${data.subVertical}--${data.product}`).first();
    if (!p) return bad(`Product "${data.product}" does not exist for ${data.subVertical}. Create the product first.`);
  }

  const user = ctxData?.session?.u || 'admin';
  const stmts = [];
  if (prevSlug && prevSlug !== slug) stmts.push(db.prepare('DELETE FROM content WHERE kind = ? AND slug = ?').bind(kind, prevSlug));
  stmts.push(
    db.prepare(`INSERT INTO content (kind, slug, json, updated_at, updated_by) VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'), ?)
                ON CONFLICT(kind, slug) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at, updated_by = excluded.updated_by`).bind(kind, slug, JSON.stringify(data), user),
  );
  stmts.push(db.prepare("INSERT INTO meta (key, value) VALUES ('content_updated_at', strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value"));
  await db.batch(stmts);
  return json({ ok: true, kind, slug });
}

export async function onRequestDelete({ request, env }) {
  const db = requireDB(env);
  const u = new URL(request.url);
  const kind = u.searchParams.get('kind');
  const slug = u.searchParams.get('slug');
  if (!KINDS.includes(kind) || !slug) return bad('kind and slug required');
  if (kind === 'site' || kind === 'settings') return bad('Settings cannot be deleted');
  /* block deletes that would orphan children */
  if (kind === 'vertical') {
    const n = (await db.prepare("SELECT COUNT(*) n FROM content WHERE kind='sub-vertical' AND json_extract(json,'$.vertical')=?").bind(slug).first())?.n;
    if (n) return bad(`Vertical has ${n} sub-vertical(s). Delete or move them first.`);
  }
  if (kind === 'sub-vertical') {
    const n = (await db.prepare("SELECT COUNT(*) n FROM content WHERE kind IN ('product','article') AND json_extract(json,'$.subVertical')=?").bind(slug).first())?.n;
    if (n) return bad(`Sub-vertical has ${n} product(s)/article(s). Delete them first.`);
  }
  if (kind === 'product') {
    const [sub, type] = slug.split('--');
    const n = (await db.prepare("SELECT COUNT(*) n FROM content WHERE kind='article' AND json_extract(json,'$.subVertical')=? AND json_extract(json,'$.product')=?").bind(sub, type).first())?.n;
    if (n) return bad(`Product has ${n} article(s). Delete or reassign them first.`);
  }
  await db.prepare('DELETE FROM content WHERE kind = ? AND slug = ?').bind(kind, slug).run();
  return json({ ok: true });
}

function summary(kind, d) {
  switch (kind) {
    case 'article': return { title: d.title, vertical: d.vertical, subVertical: d.subVertical, product: d.product, publishedAt: d.publishedAt, author: d.author, excerpt: d.excerpt, active: d.active !== false };
    case 'product': return { name: d.name, type: d.type, vertical: d.vertical, subVertical: d.subVertical, active: d.active !== false };
    case 'sub-vertical': return { name: d.name, vertical: d.vertical, order: d.order, active: d.active !== false, shortDescription: d.shortDescription };
    case 'vertical': return { name: d.name, order: d.order, active: d.active !== false, tagline: d.tagline };
    case 'site': return { name: d.name, domain: d.domain };
    case 'page': return { title: d.seo?.title || d.hero?.headline || '' };
  }
  return {};
}

function validate(kind, d, slug) {
  const need = (keys) => { for (const k of keys) if (d[k] == null || d[k] === '') return `"${k}" is required`; return null; };
  switch (kind) {
    case 'vertical': return need(['name', 'tagline', 'description']);
    case 'sub-vertical': return need(['name', 'vertical', 'shortDescription']);
    case 'product': {
      const e = need(['type', 'vertical', 'subVertical', 'name']);
      if (e) return e;
      if (!['inbound-calls', 'live-transfers'].includes(d.type)) return 'type must be inbound-calls or live-transfers';
      if (slug !== `${d.subVertical}--${d.type}`) return `Product slug must be "${d.subVertical}--${d.type}"`;
      d.slug = d.type;
      return null;
    }
    case 'article': {
      const e = need(['title', 'vertical', 'subVertical', 'product', 'excerpt', 'body', 'publishedAt']);
      if (e) return e;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.publishedAt)) return 'publishedAt must be YYYY-MM-DD';
      if (clip(d.body, 100000).length < 200) return 'Article body is too short (minimum 200 characters)';
      return null;
    }
    case 'site': return need(['name', 'domain']);
    default: return null;
  }
}
