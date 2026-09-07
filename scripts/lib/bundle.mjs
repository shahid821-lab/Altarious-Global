/**
 * Asset bundling: the site ships ONE stylesheet and ONE script, so adding the terrain
 * engine and the component modules must not add requests. Each source file stays separate
 * in `public/` for maintenance; the build concatenates them into dist and hashes the result.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT } from './util.mjs';

/* Order matters: site.css defines the tokens every later file consumes. */
const CSS_PARTS = ['assets/css/site.css', 'assets/css/icons.css', 'assets/css/terrain.css', 'assets/css/comp-a.css', 'assets/css/comp-b.css'];
const JS_PARTS = ['assets/js/site.js', 'assets/js/terrain.js', 'assets/js/comp-a.js', 'assets/js/comp-b.js'];

function concat(parts, dist, label) {
  const chunks = [];
  const included = [];
  for (const rel of parts) {
    const f = path.join(ROOT, 'public', rel);
    if (!fs.existsSync(f)) continue;
    chunks.push(`/* ===== ${rel} ===== */\n${fs.readFileSync(f, 'utf8').trim()}\n`);
    included.push(path.basename(rel));
    /* the part is bundled, so it must not also ship on its own */
    const copied = path.join(dist, rel);
    if (fs.existsSync(copied) && rel !== parts[0]) fs.rmSync(copied);
  }
  const out = chunks.join('\n');
  const target = path.join(dist, parts[0]);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, out);
  const hash = createHash('sha256').update(out).digest('hex').slice(0, 8);
  return { url: '/' + parts[0] + '?v=' + hash, bytes: out.length, included, label };
}

/** Bundle CSS and JS into dist and return the versioned URLs for <link> and <script>. */
export function bundleAssets(dist) {
  const css = concat(CSS_PARTS, dist, 'css');
  const js = concat(JS_PARTS, dist, 'js');
  return {
    assets: { css: css.url, js: js.url },
    report: `bundled css ${(css.bytes / 1024).toFixed(0)}KB (${css.included.join(' + ')}), js ${(js.bytes / 1024).toFixed(0)}KB (${js.included.join(' + ')})`,
  };
}

/** Search index consumed by the command palette (C19). */
export function searchIndex(ctx) {
  const { verticals, subVerticals, products, articles, site } = ctx;
  const TYPE = { 'inbound-calls': 'Inbound Calls', 'live-transfers': 'Live Transfers' };
  const rows = [];
  for (const s of site.services) rows.push({ t: s.name, u: `/services/${s.slug}/`, g: 'Service' });
  for (const v of verticals.filter((v) => v.active !== false)) rows.push({ t: v.name, u: `/${v.slug}/`, g: 'Vertical' });
  for (const s of subVerticals.filter((s) => s.active !== false)) {
    const v = verticals.find((x) => x.slug === s.vertical);
    if (v) rows.push({ t: s.name, u: `/${v.slug}/${s.slug}/`, g: 'Sub-vertical' });
  }
  for (const p of products.filter((p) => p.active !== false)) rows.push({ t: p.name, u: `/${p.vertical}/${p.subVertical}/${p.type}/`, g: TYPE[p.type] || 'Product' });
  for (const a of articles.filter((a) => a.active !== false)) rows.push({ t: a.title, u: `/resources/${a.vertical}/${a.subVertical}/${a.product}/${a.slug}/`, g: 'Article' });
  for (const [t, u] of [['About Us', '/about/'], ['Case Studies', '/case-studies/'], ['Contact', '/contact/'], ['Resources', '/resources/'], ['All verticals', '/verticals/']]) rows.push({ t, u, g: 'Page' });
  return rows;
}
