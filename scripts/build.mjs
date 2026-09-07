/**
 * build.mjs — content → dist/ static site. Node built-ins only.
 * Content source: D1 (CMS) when CF_ACCOUNT_ID/CF_D1_DATABASE_ID/CF_API_TOKEN are set, else content/*.json.
 * Validates the content model (PRD §19: every active product needs ≥ 2 related articles) and internal links.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadContentAny, loadContent, contentToRows, writeFile, copyDir, esc } from './lib/util.mjs';
import { bundleAssets, searchIndex } from './lib/bundle.mjs';
import * as T from './lib/templates.mjs';

const DIST = path.join(ROOT, 'dist');
const t0 = Date.now();
const today = new Date().toISOString().slice(0, 10);
const ctx = await loadContentAny();
console.log(`content source: ${ctx.source}`);
const { site, verticals, subVerticals, products, articles, pages } = ctx;

/* ---------- validation ---------- */
const errors = [];
const vmap = Object.fromEntries(verticals.map((v) => [v.slug, v]));
const svmap = Object.fromEntries(subVerticals.map((s) => [s.slug, s]));
for (const sv of subVerticals) if (!vmap[sv.vertical]) errors.push(`sub-vertical "${sv.slug}" references unknown vertical "${sv.vertical}"`);
for (const p of products) {
  if (!vmap[p.vertical]) errors.push(`product ${p.subVertical}/${p.type} references unknown vertical "${p.vertical}"`);
  if (!svmap[p.subVertical]) errors.push(`product ${p.subVertical}/${p.type} references unknown sub-vertical`);
  if (!['inbound-calls', 'live-transfers'].includes(p.type)) errors.push(`product ${p.subVertical}/${p.type}: invalid type`);
}
const relatedFor = (p) => articles.filter((a) => a.vertical === p.vertical && a.subVertical === p.subVertical && a.product === p.type && a.active !== false);
const isActive = (p) => p.active !== false && vmap[p.vertical]?.active !== false && svmap[p.subVertical]?.active !== false;
for (const p of products.filter(isActive)) {
  const n = relatedFor(p).length;
  if (n < 2) errors.push(`product ${p.subVertical}/${p.type} has ${n} related article(s); minimum is 2 (run: node scripts/scaffold.mjs)`);
}
const slugs = new Set();
for (const a of articles) {
  if (slugs.has(a.slug)) errors.push(`duplicate article slug "${a.slug}"`);
  slugs.add(a.slug);
  if (!vmap[a.vertical] || !svmap[a.subVertical]) errors.push(`article "${a.slug}" has unknown vertical/sub-vertical`);
  if (!products.find((p) => p.vertical === a.vertical && p.subVertical === a.subVertical && p.type === a.product)) errors.push(`article "${a.slug}" references a product that does not exist (${a.subVertical}/${a.product})`);
}
for (const sv of subVerticals.filter((s) => s.active !== false && vmap[s.vertical]?.active !== false)) {
  for (const type of ['inbound-calls', 'live-transfers']) if (!products.find((p) => p.subVertical === sv.slug && p.type === type)) errors.push(`sub-vertical "${sv.slug}" is missing product ${type} (run: node scripts/scaffold.mjs)`);
}
if (errors.length) {
  console.error('\nBUILD FAILED — content validation errors:\n' + errors.map((e) => '  • ' + e).join('\n') + '\n');
  process.exit(1);
}

/* ---------- emit ---------- */
fs.rmSync(DIST, { recursive: true, force: true });
copyDir(path.join(ROOT, 'public'), DIST);

/* one stylesheet and one script: the terrain engine and component modules are concatenated in */
const bundle = bundleAssets(DIST);
ctx.assets = bundle.assets;
console.log(bundle.report);

/* index consumed by the command palette */
writeFile(path.join(DIST, 'search-index.json'), JSON.stringify(searchIndex(ctx)));

const urls = [];
function page(urlPath, html, priority = 0.6) {
  const file = urlPath.endsWith('.html') ? path.join(DIST, urlPath) : path.join(DIST, urlPath, 'index.html');
  writeFile(file, html);
  if (!urlPath.endsWith('.html')) urls.push({ loc: urlPath, priority });
}

page('/', T.homePage(ctx), 1.0);
page('/about/', T.aboutPage(ctx), 0.7);
page('/services/', T.servicesIndexPage(ctx), 0.8);
for (const s of site.services) page(`/services/${s.slug}/`, T.servicePage(ctx, s.slug), 0.8);
page('/verticals/', T.verticalsIndexPage(ctx), 0.8);
page('/case-studies/', T.caseStudiesPage(ctx), 0.7);
page('/contact/', T.contactPage(ctx), 0.9);
page('/404.html', T.notFoundPage(ctx));

const activeVerticals = verticals.filter((v) => v.active !== false);
const crumb = (name, href) => ({ name, href });
for (const v of activeVerticals) {
  page(`/${v.slug}/`, T.verticalPage(ctx, v), 0.9);
  const subs = subVerticals.filter((s) => s.vertical === v.slug && s.active !== false);
  for (const sv of subs) {
    page(`/${v.slug}/${sv.slug}/`, T.subVerticalPage(ctx, v, sv), 0.8);
    for (const p of products.filter((p) => p.vertical === v.slug && p.subVertical === sv.slug && p.active !== false)) {
      const related = relatedFor(p);
      page(`/${v.slug}/${sv.slug}/${p.type}/`, T.productPage(ctx, v, sv, p, related), 0.8);
      for (const a of related) {
        const others = articles.filter((x) => x.slug !== a.slug && x.active !== false && x.subVertical === a.subVertical).slice(0, 3);
        const fill = others.length < 3 ? articles.filter((x) => x.slug !== a.slug && x.active !== false && x.vertical === a.vertical && x.product === a.product && !others.includes(x)).slice(0, 3 - others.length) : [];
        page(T.articleUrl(a), T.articlePage(ctx, a, v, sv, p, [...others, ...fill]), 0.6);
      }
      const typeName = p.type === 'inbound-calls' ? 'Inbound Calls' : 'Live Transfers';
      page(`/resources/${v.slug}/${sv.slug}/${p.type}/`, T.resourcesIndexPage(ctx, {
        path: `/resources/${v.slug}/${sv.slug}/${p.type}/`,
        title: `${p.name} Knowledge`,
        description: `Knowledge articles supporting ${p.name}.`,
        intro: `Articles explaining consumer intent, qualification and acquisition for ${p.name}.`,
        articles: related,
        crumbs: [crumb('Home', '/'), crumb('Resources', '/resources/'), crumb(v.name, `/resources/${v.slug}/`), crumb(sv.name, `/resources/${v.slug}/${sv.slug}/`), crumb(typeName, `/resources/${v.slug}/${sv.slug}/${p.type}/`)],
      }), 0.4);
    }
    page(`/resources/${v.slug}/${sv.slug}/`, T.resourcesIndexPage(ctx, {
      path: `/resources/${v.slug}/${sv.slug}/`,
      title: `${sv.name} Knowledge`,
      description: `Knowledge articles about ${sv.name} inbound calls, live transfers and customer acquisition.`,
      intro: `Product knowledge for ${sv.name} acquisition programs.`,
      articles: articles.filter((a) => a.subVertical === sv.slug && a.active !== false),
      crumbs: [crumb('Home', '/'), crumb('Resources', '/resources/'), crumb(v.name, `/resources/${v.slug}/`), crumb(sv.name, `/resources/${v.slug}/${sv.slug}/`)],
    }), 0.5);
  }
  page(`/resources/${v.slug}/`, T.resourcesIndexPage(ctx, {
    path: `/resources/${v.slug}/`,
    title: `${v.name} Knowledge`,
    description: `Knowledge articles about ${v.name} customer acquisition, inbound calls and live transfers.`,
    intro: v.description,
    articles: articles.filter((a) => a.vertical === v.slug && a.active !== false),
    crumbs: [crumb('Home', '/'), crumb('Resources', '/resources/'), crumb(v.name, `/resources/${v.slug}/`)],
  }), 0.6);
}
page('/resources/', T.resourcesIndexPage(ctx, {
  path: '/resources/',
  title: 'Product Knowledge & Resources',
  description: 'Industry knowledge articles on consumer intent, qualification and customer acquisition across insurance, home services and web lead verticals.',
  intro: 'Industry knowledge supporting every acquisition product we offer.',
  articles: articles.filter((a) => a.active !== false && vmap[a.vertical]?.active !== false),
  crumbs: [crumb('Home', '/'), crumb('Resources', '/resources/')],
}), 0.7);

page('/privacy/', T.simplePage(ctx, { path: '/privacy/', title: 'Privacy Policy', description: `Privacy policy for ${site.name}.`, html: legal('privacy', site) }), 0.3);
page('/terms/', T.simplePage(ctx, { path: '/terms/', title: 'Terms of Service', description: `Terms of service for ${site.name}.`, html: legal('terms', site) }), 0.3);

/* ---------- sitemap, robots, headers ---------- */
const base = site.domain.replace(/\/$/, '');
writeFile(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((u) => `  <url><loc>${esc(base + u.loc)}</loc><lastmod>${today}</lastmod><priority>${u.priority.toFixed(1)}</priority></url>`)
  .join('\n')}\n</urlset>\n`);
writeFile(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: ${base}/sitemap.xml\n`);
writeFile(path.join(DIST, '_headers'), `/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: SAMEORIGIN\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/admin/*\n  X-Robots-Tag: noindex\n  Cache-Control: no-store\n`);

/* seed export for the admin "Import seed" action (always from the repo JSON) */
writeFile(path.join(DIST, 'admin', 'seed.json'), JSON.stringify(contentToRows(loadContent())));

/* ---------- internal link check ---------- */
const broken = new Set();
const known = new Set(urls.map((u) => u.loc));
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else if (e.name.endsWith('.html')) {
      const html = fs.readFileSync(f, 'utf8');
      for (const m of html.matchAll(/(?:src|srcset)="([^"]+)"/g)) {
        for (const cand of m[1].split(',')) {
          const u = cand.trim().split(/\s+/)[0];
          if (!u.startsWith('/') || u.startsWith('/media/')) continue;
          if (!fs.existsSync(path.join(DIST, u.split('?')[0]))) broken.add(`${u}  (image in ${path.relative(DIST, f)})`);
        }
      }
      for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
        const href = m[1];
        if (href.startsWith('/assets/') || href.startsWith('/api/') || href.startsWith('/admin')) continue;
        const norm = href.endsWith('/') ? href : href + '/';
        if (!known.has(norm) && !fs.existsSync(path.join(DIST, href))) broken.add(`${href}  (in ${path.relative(DIST, f)})`);
      }
    }
  }
})(DIST);
if (broken.size) {
  const list = [...broken].slice(0, 50).map((b) => '  • ' + b).join('\n');
  console.error(`\nBUILD FAILED — broken internal links:\n${list}${broken.size > 50 ? `\n  … and ${broken.size - 50} more` : ''}\n`);
  process.exit(1);
}

console.log(`Built ${urls.length + 1} pages → dist/ in ${Date.now() - t0}ms  (verticals ${activeVerticals.length}, sub-verticals ${subVerticals.filter((s) => s.active !== false).length}, products ${products.filter(isActive).length}, articles ${articles.length})`);

function legal(kind, site) {
  if (kind === 'privacy')
    return `<p><em>Last updated ${today}. This is a template policy; have counsel review before launch.</em></p>
<h2>Information we collect</h2><p>When you submit an inquiry we collect the information you provide (name, company, business email, phone number, areas of interest and message) together with the page you submitted from, the date and time, and technical data such as IP address and browser type.</p>
<h2>How we use it</h2><p>We use inquiry information to respond to you, to scope and deliver services you request, and to maintain records of our business relationship. We do not sell your personal information.</p>
<h2>Retention and security</h2><p>Inquiries are stored in access-controlled systems and retained for as long as reasonably necessary for the purposes above.</p>
<h2>Contact</h2><p>Questions about this policy: <a href="mailto:${esc(site.contact.email)}">${esc(site.contact.email)}</a>.</p>`;
  return `<p><em>Last updated ${today}. This is a template; have counsel review before launch.</em></p>
<h2>Use of this website</h2><p>Content on this website is provided for general information about ${esc(site.name)} services. Program availability, pricing and performance depend on vertical, geography and configuration and are set out in a written agreement.</p>
<h2>No guarantee of results</h2><p>Descriptions of products and illustrative case studies do not constitute a guarantee of volume, quality or outcome.</p>
<h2>Intellectual property</h2><p>All content on this website is the property of ${esc(site.legalName)} unless otherwise stated.</p>
<h2>Contact</h2><p><a href="mailto:${esc(site.contact.email)}">${esc(site.contact.email)}</a></p>`;
}
