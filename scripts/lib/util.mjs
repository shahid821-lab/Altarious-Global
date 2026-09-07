import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const ROOT = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
export const CONTENT = path.join(ROOT, 'content');

export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`Invalid JSON in ${file}: ${e.message}`);
  }
}

export function readDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ file: path.join(dir, f), data: readJson(path.join(dir, f)) }));
}

/** Photo manifest: { "<key>": "/assets/img/photos/<file>.jpg" }. Written by scripts/assign-photos.mjs. */
export function loadPhotos() {
  const f = path.join(ROOT, 'public', 'assets', 'img', 'photos', 'photos.json');
  return fs.existsSync(f) ? readJson(f) : {};
}

/** Operational settings (coverage, hours, published metrics). */
export function loadSettings() {
  const f = path.join(CONTENT, 'settings.json');
  return fs.existsSync(f) ? readJson(f) : {};
}

/** Load content from the JSON seed files in content/. */
export function loadContent() {
  const site = readJson(path.join(CONTENT, 'site.json'));
  const verticals = readDir(path.join(CONTENT, 'verticals')).map((x) => x.data).sort(byOrder);
  const subVerticals = readDir(path.join(CONTENT, 'sub-verticals')).map((x) => x.data).sort(byOrder);
  const products = readDir(path.join(CONTENT, 'products')).map((x) => x.data);
  const articles = readDir(path.join(CONTENT, 'articles')).map((x) => x.data).sort(byDate);
  const pages = {};
  for (const { file, data } of readDir(path.join(CONTENT, 'pages'))) pages[path.basename(file, '.json')] = data;
  return { site, verticals, subVerticals, products, articles, pages, photos: loadPhotos(), settings: loadSettings(), source: 'json' };
}

/**
 * Load content from the CMS store (D1) through the Cloudflare D1 HTTP API.
 * Requires CF_ACCOUNT_ID, CF_D1_DATABASE_ID, CF_API_TOKEN. Returns null when not configured
 * or when the table is empty (so the build falls back to JSON).
 */
export async function loadContentFromD1() {
  const { CF_ACCOUNT_ID, CF_D1_DATABASE_ID, CF_API_TOKEN } = process.env;
  if (!CF_ACCOUNT_ID || !CF_D1_DATABASE_ID || !CF_API_TOKEN) return null;
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_DATABASE_ID}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: 'SELECT kind, slug, json FROM content' }),
  });
  if (!res.ok) throw new Error(`D1 API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const rows = data?.result?.[0]?.results || [];
  if (!rows.length) return null;
  return contentFromRows(rows);
}

/** Turn CMS rows ({kind, slug, json}) into the same shape as loadContent(). */
export function contentFromRows(rows) {
  const out = { site: null, verticals: [], subVerticals: [], products: [], articles: [], pages: {}, photos: loadPhotos(), settings: null, source: 'd1' };
  for (const r of rows) {
    const data = typeof r.json === 'string' ? JSON.parse(r.json) : r.json;
    switch (r.kind) {
      case 'site': out.site = data; break;
      case 'vertical': out.verticals.push(data); break;
      case 'sub-vertical': out.subVerticals.push(data); break;
      case 'product': out.products.push(data); break;
      case 'article': out.articles.push(data); break;
      case 'page': out.pages[r.slug] = data; break;
      case 'settings': out.settings = data; break;
    }
  }
  const seed = loadContent();
  out.site = out.site || seed.site;
  out.settings = out.settings || seed.settings;
  for (const k of Object.keys(seed.pages)) if (!out.pages[k]) out.pages[k] = seed.pages[k];
  out.verticals.sort(byOrder);
  out.subVerticals.sort(byOrder);
  out.articles.sort(byDate);
  return out;
}

/** D1 if configured and populated, else JSON. */
export async function loadContentAny() {
  /* Local testing of the CMS path: CONTENT_ROWS_FILE=path to `wrangler d1 execute ... --json` output */
  if (process.env.CONTENT_ROWS_FILE) {
    const raw = readJson(path.resolve(process.env.CONTENT_ROWS_FILE));
    const rows = Array.isArray(raw) ? raw[0]?.results || raw : raw.results || [];
    return contentFromRows(rows);
  }
  try {
    const d1 = await loadContentFromD1();
    if (d1) return d1;
  } catch (e) {
    console.warn('! Could not load content from D1, falling back to JSON:', e.message);
  }
  return loadContent();
}

/** Flatten a content object into CMS rows (used for seed export). */
export function contentToRows(c) {
  const rows = [{ kind: 'site', slug: 'site', json: c.site }];
  if (c.settings) rows.push({ kind: 'settings', slug: 'settings', json: c.settings });
  for (const v of c.verticals) rows.push({ kind: 'vertical', slug: v.slug, json: v });
  for (const s of c.subVerticals) rows.push({ kind: 'sub-vertical', slug: s.slug, json: s });
  for (const p of c.products) rows.push({ kind: 'product', slug: `${p.subVertical}--${p.type}`, json: p });
  for (const a of c.articles) rows.push({ kind: 'article', slug: a.slug, json: a });
  for (const [k, v] of Object.entries(c.pages)) rows.push({ kind: 'page', slug: k, json: v });
  return rows;
}

function byDate(a, b) {
  return a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : a.title.localeCompare(b.title);
}

function byOrder(a, b) {
  return (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name);
}

export function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function slugify(s) {
  return String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function fmtDate(iso) {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : ''));
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

/** Minimal markdown → HTML: headings, paragraphs, ul/ol, bold, italic, links, blockquote. */
export function md(src = '') {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let para = [];
  let list = null; // 'ul' | 'ol'
  const flushPara = () => {
    if (para.length) {
      html += `<p>${inline(para.join(' '))}</p>\n`;
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      html += `</${list}>\n`;
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    let m;
    if ((m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/))) {
      flushPara();
      flushList();
      html += `<figure><img src="${esc(m[2])}" alt="${esc(m[1])}" loading="lazy" decoding="async">${m[3] ? `<figcaption>${esc(m[3])}</figcaption>` : ''}</figure>\n`;
    } else if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushPara();
      flushList();
      html += '<hr>\n';
    } else if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flushPara();
      flushList();
      const lvl = m[1].length;
      const text = m[2].trim();
      html += `<h${lvl} id="${slugify(text)}">${inline(text)}</h${lvl}>\n`;
    } else if ((m = line.match(/^[-*]\s+(.*)$/))) {
      flushPara();
      if (list !== 'ul') {
        flushList();
        list = 'ul';
        html += '<ul>\n';
      }
      html += `<li>${inline(m[1])}</li>\n`;
    } else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
      flushPara();
      if (list !== 'ol') {
        flushList();
        list = 'ol';
        html += '<ol>\n';
      }
      html += `<li>${inline(m[1])}</li>\n`;
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flushPara();
      flushList();
      html += `<blockquote><p>${inline(m[1])}</p></blockquote>\n`;
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return html;
}

function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy" decoding="async">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
}

export function words(str) {
  return String(str).split(/\s+/).filter(Boolean).length;
}

/** Short content hashes for cache-busted asset URLs (assets are served immutable). */
export function assetVersions() {
  const v = {};
  for (const [key, rel] of [['css', 'assets/css/site.css'], ['js', 'assets/js/site.js']]) {
    const f = path.join(ROOT, 'public', rel);
    const hash = fs.existsSync(f) ? createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 8) : '0';
    v[key] = '/' + rel + '?v=' + hash;
  }
  return v;
}
