import { esc, md, fmtDate } from './util.mjs';
import { headlineLines, signalSection, boardSection, explorerSection, transferSection, articleToc, sparkline, faqSet, widgetEnabled } from './blocks.mjs';
import { icon, SERVICE_ICON } from './icons.mjs';
import { anchorRail, coverageGrid, productComparison, volumeCalculator, criteriaBuilder, onboardingTimeline, buyerMarquee, faqSearch, commercialModels, stickyEnquiryBar } from './comp-a.mjs';
import { multiStepEnquiry, callWidget, keyTakeaways, relatedRail, termTooltips, factStrip, metricRibbon, commandPalette, consentBar } from './comp-b.mjs';

const TYPE_NAME = { 'inbound-calls': 'Inbound Calls', 'live-transfers': 'Live Transfers' };
const FALLBACK = { insurance: '/assets/img/vertical-insurance.svg', 'home-services': '/assets/img/vertical-home-services.svg', 'web-leads': '/assets/img/vertical-web-leads.svg' };

/* ============================================================
   image helpers
   ============================================================ */

/**
 * Emit a section only when its component actually rendered something.
 * Operational claims that are not configured in the CMS must leave no empty shell.
 */
/** Read one widget's CMS slice, or null when the widget is switched off. */
function cms(ctx, key) {
  const s = ctx.settings || {};
  return widgetEnabled(s, key) ? s[key] || null : null;
}

function sectionIf(html, wrap) {
  return html ? wrap(html) : '';
}

/** Resolve a photo for a key, walking a fallback chain. */
export function photo(ctx, ...keys) {
  const p = ctx.photos || {};
  for (const k of keys) {
    if (!k) continue;
    if (typeof k === 'string' && (k.startsWith('/') || k.startsWith('http'))) return k;
    if (p[k]) return p[k];
  }
  return '/assets/img/og-default.svg';
}

/** All photo variants registered for a key: "auto-insurance", "auto-insurance-2", ... */
export function variantsFor(ctx, key) {
  const p = ctx.photos || {};
  const out = [];
  if (p[key]) out.push(p[key]);
  for (let i = 2; i <= 12; i++) if (p[`${key}-${i}`]) out.push(p[`${key}-${i}`]);
  return out;
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

/**
 * Deterministically choose a photo for one slot on one page, preferring a variant
 * that has not been used elsewhere on that page. `used` is a per-page Set.
 */
export function pickPhoto(ctx, { used, keys, seed, explicit }) {
  if (explicit) { used && used.add(explicit); return explicit; }
  /* Pool every variant across the fallback chain, most specific first, so a page with more
     image slots than a sub-vertical has photos widens into vertical and brand imagery
     instead of repeating the same shot. */
  const pool = [];
  for (const key of keys) {
    if (!key) continue;
    for (const u of variantsFor(ctx, key)) if (!pool.includes(u)) pool.push(u);
  }
  if (!pool.length) return photo(ctx, ...keys);
  const free = used ? pool.filter((u) => !used.has(u)) : pool;
  const list = free.length ? free : pool;
  const url = list[hash(seed || keys[0]) % list.length];
  used && used.add(url);
  return url;
}

/** Generic imagery used only once a page has exhausted its topical photos. */
const BRAND_POOL = ['brand-data-analytics', 'brand-team-meeting', 'brand-callcenter-agent', 'brand-abstract-tech', 'brand-hero-office', 'brand-server-network', 'brand-city-skyline'];

/** <img> with explicit dimensions (no layout shift) and a responsive srcset for managed photos. */
export function img(src, alt, opts = {}) {
  const { w = 1200, h = 800, lazy = true, cls = '', priority = false, parallax = null, scale = null, sizes = null } = opts;
  const managed = /^\/assets\/img\/photos\/[^/]+\.jpg$/.test(src);
  const srcset = managed ? ` srcset="${esc(src.replace('.jpg', '-sm.jpg'))} 760w, ${esc(src)} 1500w" sizes="${esc(sizes || (w > 900 ? '100vw' : '(max-width: 700px) 100vw, ' + w + 'px'))}"` : '';
  return `<img src="${esc(src)}" alt="${esc(alt)}"${srcset} width="${w}" height="${h}"${cls ? ` class="${cls}"` : ''}${
    priority ? ' fetchpriority="high" decoding="sync"' : lazy ? ' loading="lazy" decoding="async"' : ' decoding="async"'
  }${parallax !== null ? ` data-parallax="${parallax}"` : ''}${scale ? ` data-parallax-scale="${scale}"` : ''}>`;
}

/** Photo block with brand veil. */
function mediaBox(src, alt, { ratio = 'ratio-16-9', cls = '', plain = false, w = 1200, h = 675, priority = false } = {}) {
  return `<div class="media ${ratio} ${plain ? 'plain' : ''} ${cls}">${img(src, alt, { w, h, priority })}</div>`;
}

/* ============================================================
   layout
   ============================================================ */

export function layout(ctx, page) {
  const { site } = ctx;
  const base = site.domain.replace(/\/$/, '');
  const canonical = base + page.path;
  const title = page.seo?.title ? `${page.seo.title} | ${site.name}` : site.name;
  const desc = page.seo?.description || site.positioning;
  const ogImage = base + (page.image || '/assets/img/og-default.svg');
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: site.name, url: site.domain, description: site.positioning, logo: base + '/assets/img/favicon.svg', contactPoint: { '@type': 'ContactPoint', email: site.contact.email, contactType: 'sales' } },
    ...(page.jsonld || []),
  ];
  if (page.breadcrumbs?.length) {
    jsonld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: page.breadcrumbs.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: base + b.href })) });
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
${page.seo?.keywords?.length ? `<meta name="keywords" content="${esc(page.seo.keywords.join(', '))}">` : ''}
<meta property="og:type" content="${page.ogType || 'website'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#060a13" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<script>(function(){var d=document.documentElement;try{var t=localStorage.getItem('ag-theme');if(t)d.setAttribute('data-theme',t);}catch(e){}if(window.IntersectionObserver&&!matchMedia('(prefers-reduced-motion: reduce)').matches)d.className+=' js';})();</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@500;600&display=swap">
<link rel="stylesheet" href="${ctx.assets?.css || '/assets/css/site.css'}">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body class="${page.bodyClass || ''}">
<div class="scroll-progress" aria-hidden="true"></div>
<a class="skip" href="#main">Skip to content</a>
${header(ctx)}
<main id="main">
${page.breadcrumbs?.length && !page.crumbsInHero ? breadcrumbs(page.breadcrumbs) : ''}
${page.body}
</main>
${footer(ctx)}
${consentBar(site)}
${page.glossary ? termTooltips({ terms: (ctx.settings?.glossary?.enabled !== false ? ctx.settings?.glossary?.terms : []) }) : ''}
<script src="${ctx.assets?.js || '/assets/js/site.js'}" defer></script>
${site.turnstileSiteKey && page.hasForm ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' : ''}
</body>
</html>`;
}

function header(ctx) {
  const { site, verticals, subVerticals } = ctx;
  const active = verticals.filter((v) => v.active !== false);
  const mega = active
    .map((v) => {
      const subs = subVerticals.filter((s) => s.vertical === v.slug && s.active !== false);
      return `<div class="mega-col">
  <a class="mega-title" href="/${v.slug}/">${esc(v.name)}</a>
  <ul>${subs.slice(0, 7).map((s) => `<li><a href="/${v.slug}/${s.slug}/">${esc(s.name)}</a></li>`).join('')}
  ${subs.length > 7 ? `<li><a class="more" href="/${v.slug}/">All ${subs.length} ${esc(v.name.toLowerCase())} programs →</a></li>` : ''}</ul>
</div>`;
    })
    .join('');
  const services = site.services.map((s) => `<li><a href="/services/${s.slug}/">${esc(s.name)}<span>${esc(s.short.slice(0, 62))}…</span></a></li>`).join('');
  return `<header class="site-header">
<div class="container header-inner">
  <a class="brand" href="/" aria-label="${esc(site.name)} home">${logoSvg()}<span>${esc(site.name)}</span></a>
  <nav id="site-nav" class="site-nav">
    <ul class="nav-list">
      <li class="has-dropdown"><a href="/services/">Services</a><button class="dd-toggle" aria-label="Toggle Services menu"></button><div class="dropdown"><ul>${services}</ul></div></li>
      <li class="has-dropdown has-mega"><a href="/verticals/">Verticals</a><button class="dd-toggle" aria-label="Toggle Verticals menu"></button><div class="dropdown mega">${mega}</div></li>
      <li class="nav-optional"><a href="/resources/">Resources</a></li>
      <li class="nav-optional"><a href="/case-studies/">Case Studies</a></li>
      <li><a href="/about/">About</a></li>
      <li><a href="/contact/">Contact</a></li>
    </ul>
    <a class="btn btn-primary nav-cta" href="/contact/">${esc(site.ctas.primary)}</a>
  </nav>
  <div class="header-tools">
    ${commandPalette()}
    <button class="theme-toggle" aria-label="Switch theme" title="Switch theme">
      <svg class="moon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
      <svg class="sun" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg>
    </button>
    <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Toggle navigation"><span></span><span></span><span></span></button>
  </div>
</div>
</header>`;
}

function footer(ctx) {
  const { site, verticals, subVerticals } = ctx;
  const year = new Date().getFullYear();
  const cols = verticals
    .filter((v) => v.active !== false)
    .map((v) => {
      const subs = subVerticals.filter((s) => s.vertical === v.slug && s.active !== false).slice(0, 6);
      return `<div><h4><a href="/${v.slug}/">${esc(v.name)}</a></h4><ul>${subs.map((s) => `<li><a href="/${v.slug}/${s.slug}/">${esc(s.name)}</a></li>`).join('')}<li><a href="/${v.slug}/">View all →</a></li></ul></div>`;
    })
    .join('');
  return `<footer class="site-footer">
<div class="container">
  <div class="footer-grid">
    <div class="footer-brand">
      <a class="brand" href="/">${logoSvg()}<span>${esc(site.name)}</span></a>
      <p style="margin-top:16px">${esc(site.positioning)}</p>
      <p><a href="mailto:${esc(site.contact.email)}">${esc(site.contact.email)}</a></p>
      <a class="btn btn-primary" href="/contact/" style="margin-top:8px">${esc(site.ctas.primary)}</a>
    </div>
    <div><h4>Services</h4><ul>${site.services.map((s) => `<li><a href="/services/${s.slug}/">${esc(s.name)}</a></li>`).join('')}</ul></div>
    ${cols}
    <div><h4>Company</h4><ul><li><a href="/about/">About Us</a></li><li><a href="/case-studies/">Case Studies</a></li><li><a href="/resources/">Resources</a></li><li><a href="/contact/">Contact</a></li><li><a href="/privacy/">Privacy Policy</a></li><li><a href="/terms/">Terms of Service</a></li></ul></div>
  </div>
  <div class="footer-bottom">
    <p>${esc(site.footerNote)}</p>
    <p>© ${year} ${esc(site.legalName)}</p>
  </div>
</div>
</footer>`;
}

function logoSvg() {
  return `<svg class="logo" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2dd4bf"/><stop offset="1" stop-color="#3b82f6"/></linearGradient></defs><path d="M16 2 30 28H2L16 2Z" fill="url(#lg)"/><path d="M16 11.5l7.2 13H8.8l7.2-13Z" fill="var(--bg)"/><circle cx="16" cy="21" r="2.6" fill="url(#lg)"/></svg>`;
}

function breadcrumbs(items, onDark = false) {
  return `<nav class="breadcrumbs container ${onDark ? 'on-dark' : ''}" aria-label="Breadcrumb"><ol>${items
    .map((b, i) => (i === items.length - 1 ? `<li aria-current="page">${esc(b.name)}</li>` : `<li><a href="${b.href}">${esc(b.name)}</a></li>`))
    .join('')}</ol></nav>`;
}

/* ============================================================
   blocks
   ============================================================ */

export function hero({ eyebrow, headline, subheadline, primary, secondary, compact = false, meta = '', image = null, alt = '', figure = null, crumbs = null, priority = true, terrain = null, terrainSeed = '', terrainPeaks = null, terrainLabel = '' }) {
  /* Signal Terrain is the hero treatment site-wide; photography now carries the
     evidence layer (cards, media frames, article lead images) instead. */
  const media = terrain
    ? `<div class="hero-media" data-terrain="${esc(terrain)}"${terrainSeed ? ` data-terrain-seed="${esc(terrainSeed)}"` : ''}${terrainPeaks ? ` data-terrain-peaks="${esc(JSON.stringify(terrainPeaks))}"` : ''}${terrainLabel ? ` data-terrain-label="${esc(terrainLabel)}"` : ''}></div>`
    : image
      ? `<div class="hero-media">${img(image, alt, { w: 1600, h: 1000, priority, lazy: false, parallax: 0.12, scale: '1.12' })}</div>`
      : `<div class="hero-media"><div class="orb orb-a" data-parallax="0.08"></div><div class="orb orb-b" data-parallax="-0.06"></div></div>`;
  const content = `
  ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
  <h1>${headlineLines(headline).map((l) => `<span class="line"><i>${esc(l)}</i></span>`).join('')}</h1>
  ${meta}
  ${subheadline ? `<p class="lead" data-reveal style="--i:1">${esc(subheadline)}</p>` : ''}
  ${primary || secondary ? `<div class="hero-actions" data-reveal style="--i:2">${primary ? `<a class="btn btn-primary btn-lg" href="${primary.href}">${esc(primary.label)}${arrow()}</a>` : ''}${secondary ? `<a class="btn btn-ghost btn-lg" href="${secondary.href}">${esc(secondary.label)}</a>` : ''}</div>` : ''}`;
  return `<section class="hero grid-bg noise ${compact ? 'hero-compact' : ''}">
${media}
${crumbs ? `<div class="container" style="position:relative;z-index:2">${breadcrumbs(crumbs, true).replace('container ', '')}</div>` : ''}
<div class="container">
  <div class="hero-inner ${figure ? '' : 'single'}">
    <div>${content}</div>
    ${figure || ''}
  </div>
</div>
</section>`;
}

const arrow = () => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>`;

export function ticker(items) {
  return `<div class="ticker" aria-hidden="true"><div class="ticker-track">${items.map((t) => `<span class="ticker-item">${esc(t)}</span>`).join('')}</div></div>`;
}

export function statsBand(stats) {
  return `<section class="stats-band"><div class="container"><div class="stats">${stats
    .map((s, i) => {
      const num = String(s.value).match(/^(\d+)(\D*)$/);
      const val = num ? `<span class="count-up" data-count="${num[1]}" data-suffix="${esc(num[2])}">0${esc(num[2])}</span>` : esc(s.value);
      return `<div data-reveal style="--i:${i}"><strong>${val}</strong><span>${esc(s.label)}</span>${sparkline(i + 2)}</div>`;
    })
    .join('')}</div></div></section>`;
}

export function ctaBand(cta, href = '/contact/') {
  return `<section class="cta-band noise"><div class="container cta-inner">
  <div data-reveal><h2>${esc(cta.headline)}</h2><p>${esc(cta.text)}</p></div>
  <a class="btn btn-primary btn-lg" href="${href}" data-reveal style="--i:1">${esc(cta.button)}${arrow()}</a>
</div></section>`;
}

export function processSection(steps, { title = 'How It Works', sub = '', image = null, alt = '', alt2 = null } = {}) {
  return `<section class="section alt"><div class="container">
  <div data-reveal><p class="eyebrow">Process</p><h2 class="section-title">${esc(title)}</h2>${sub ? `<p class="section-sub">${esc(sub)}</p>` : ''}</div>
  <div class="process-layout">
    <ol class="steps">${steps.map((s, i) => `<li class="step" data-reveal style="--i:${i}"><span class="step-num">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div></li>`).join('')}</ol>
    ${image ? `<div class="process-sticky" data-reveal="right"><div class="media-frame ratio-4-3">${img(image, alt, { w: 900, h: 675 })}</div>${alt2 ? `<div class="side-card" style="margin-top:20px"><p style="margin:0" class="muted">${esc(alt2)}</p></div>` : ''}</div>` : ''}
  </div>
</div></section>`;
}

export function featureGrid(items, title, sub = '', { alt = false, eyebrow = '' } = {}) {
  return `<section class="section ${alt ? 'alt' : ''}"><div class="container">
  ${title ? `<div data-reveal>${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}<h2 class="section-title">${esc(title)}</h2>${sub ? `<p class="section-sub">${esc(sub)}</p>` : ''}</div>` : ''}
  <div class="grid grid-auto">${items.map((f, i) => `<div class="feature" data-reveal style="--i:${i % 3}"><span class="feature-icon">${icon(f.title, { size: 20 })}</span><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></div>`).join('')}</div>
</div></section>`;
}

const checkIcon = () => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

export function articleUrl(a) {
  return `/resources/${a.vertical}/${a.subVertical}/${a.product}/${a.slug}/`;
}

export function articleCard(a, ctx, i = 0, used = null) {
  const url = articleUrl(a);
  const sv = ctx.subVerticals.find((s) => s.slug === a.subVertical);
  const src = pickPhoto(ctx, { used, explicit: a.featuredImage, keys: [a.subVertical, `vertical-${a.vertical}`, ...BRAND_POOL], seed: 'article:' + a.slug });
  return `<article class="card article-card zoom-parent" data-reveal style="--i:${i % 3}">
  <a href="${url}" tabindex="-1" aria-hidden="true">${mediaBox(src, '', { ratio: 'ratio-16-9', w: 640, h: 360 })}</a>
  <div class="card-body">
    <p class="card-meta">${esc(sv?.name || a.subVertical)} · ${esc(TYPE_NAME[a.product] || a.product)}</p>
    <h3><a href="${url}">${esc(a.title)}</a></h3>
    <p>${esc(a.excerpt)}</p>
    <a class="link-arrow" href="${url}">Read article</a>
  </div>
</article>`;
}

export function productCard(p, sv, v, ctx, i = 0, used = null) {
  const href = `/${v.slug}/${sv.slug}/${p.type}/`;
  const src = pickPhoto(ctx, { used, explicit: p.featuredImage, keys: [sv.slug, `service-${p.type}`, `vertical-${v.slug}`], seed: 'product:' + sv.slug + ':' + p.type });
  return `<a class="card product-card ${p.type} zoom-parent" href="${href}" data-reveal style="--i:${i}">
  ${mediaBox(src, '', { ratio: 'ratio-3-2', w: 700, h: 466 })}
  <div class="card-body">
    <span class="pill ${p.type}">${esc(TYPE_NAME[p.type])}</span>
    <h3 style="margin-top:14px">${esc(p.name)}</h3>
    <p>${esc(p.hero?.subheadline || '')}</p>
    <span class="link-arrow">View product page</span>
  </div>
</a>`;
}

export function subVerticalCard(sv, v, ctx, i = 0, withMedia = true, used = null) {
  const src = pickPhoto(ctx, { used, explicit: sv.featuredImage, keys: [sv.slug, `vertical-${v.slug}`], seed: 'sv:' + sv.slug });
  return `<a class="card sv-card ${withMedia ? 'with-media' : ''} zoom-parent" href="/${v.slug}/${sv.slug}/" data-reveal style="--i:${i % 3}">
  ${withMedia ? mediaBox(src, '', { ratio: 'ratio-16-9', w: 640, h: 360 }) : ''}
  <div class="card-body">
    <h3>${esc(sv.name)}</h3>
    <p>${esc(sv.shortDescription)}</p>
    <span class="tags"><span>Inbound Calls</span><span>Live Transfers</span></span>
  </div>
</a>`;
}

export function verticalCard(v, count, ctx, i = 0) {
  const src = photo(ctx, v.featuredImage, `vertical-${v.slug}`, FALLBACK[v.slug]);
  return `<a class="card vertical-card tilt zoom-parent" href="/${v.slug}/" data-reveal style="--i:${i}">
  ${mediaBox(src, '', { ratio: 'ratio-3-2', w: 700, h: 466 })}
  <div class="card-body">
    <span class="count">${count} PROGRAMS</span>
    <h3 style="margin-top:8px">${esc(v.name)}</h3>
    <p>${esc(v.tagline)}</p>
    <span class="link-arrow">Explore ${esc(v.name)}</span>
  </div>
</a>`;
}

export function faqBlock(faq) {
  if (!faq?.length) return '';
  return `<section class="section faq"><div class="container narrow">
  <div data-reveal><p class="eyebrow">FAQ</p><h2 class="section-title">Frequently asked questions</h2></div>
  <div style="margin-top:32px">${faq.map((f, i) => `<details data-reveal style="--i:${i}"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>
</div></section>`;
}

export function faqJsonLd(faq) {
  if (!faq?.length) return [];
  return [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }];
}

export function inquiryForm(ctx, meta = {}, opts = {}) {
  const { site, verticals, subVerticals } = ctx;
  const products = ['PPC / Performance Marketing', 'Web Lead Generation', 'Inbound Calls', 'Live Transfers', 'Multiple / Not sure'];
  const vOpts = verticals.map((v) => `<option value="${esc(v.name)}" ${meta.verticalName === v.name ? 'selected' : ''}>${esc(v.name)}</option>`).join('');
  const svOpts = subVerticals
    .filter((s) => s.active !== false)
    .map((s) => `<option value="${esc(s.name)}" data-vertical="${esc(verticals.find((v) => v.slug === s.vertical)?.name || '')}" ${meta.subVerticalName === s.name ? 'selected' : ''}>${esc(s.name)}</option>`)
    .join('');
  const selectedProduct = meta.productName ? TYPE_NAME[meta.productName] || meta.productName : '';
  return `<form class="inquiry-form" method="post" action="/api/inquiries" novalidate data-inquiry>
  <input type="hidden" name="source_page" value="${esc(meta.sourcePage || '')}">
  <input type="hidden" name="source_url" value="${esc(meta.sourceUrl || '')}">
  <input type="hidden" name="vertical" value="${esc(meta.vertical || '')}">
  <input type="hidden" name="sub_vertical" value="${esc(meta.subVertical || '')}">
  <input type="hidden" name="product" value="${esc(meta.product || '')}">
  <input type="hidden" name="started_at" value="">
  <div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
  <div class="form-grid">
    <label>Full Name <span>*</span><input name="full_name" required autocomplete="name" maxlength="120" placeholder="Jane Cooper"></label>
    <label>Company Name <span>*</span><input name="company" required autocomplete="organization" maxlength="160" placeholder="Acme Insurance Group"></label>
    <label>Business Email <span>*</span><input type="email" name="email" required autocomplete="email" maxlength="200" placeholder="jane@company.com"></label>
    <label>Phone Number <span>*</span><input type="tel" name="phone" required autocomplete="tel" maxlength="40" placeholder="(555) 000-0000"></label>
    <label>Service / Product of Interest <span>*</span>
      <select name="service_interest" required><option value="">Select…</option>${products.map((p) => `<option ${selectedProduct === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
    <label>Vertical of Interest <span>*</span>
      <select name="vertical_interest" required><option value="">Select…</option>${vOpts}<option value="Other">Other / Multiple</option></select></label>
    <label class="full">Sub-Vertical (optional)
      <select name="sub_vertical_interest"><option value="">Select…</option>${svOpts}</select></label>
    <label class="full">Message <span>*</span><textarea name="message" rows="5" required maxlength="4000" placeholder="Tell us about your business, geography, qualification criteria and volume targets."></textarea></label>
  </div>
  ${site.turnstileSiteKey ? `<div class="cf-turnstile" data-sitekey="${esc(site.turnstileSiteKey)}"></div>` : ''}
  <p class="form-consent">By submitting, you agree to be contacted by ${esc(site.name)} about your inquiry. We do not sell your information.</p>
  <button class="btn btn-primary btn-lg full" type="submit">${esc(opts.button || site.ctas.primary)}${arrow()}</button>
  <p class="form-status" role="status" aria-live="polite"></p>
</form>`;
}

/* ============================================================
   pages
   ============================================================ */

export function homePage(ctx) {
  const used = new Set();
  const { site, verticals, subVerticals, pages, articles } = ctx;
  const h = pages.home;
  const heroImg = photo(ctx, h.hero?.image, 'brand-hero-office', 'brand-data-analytics');
  const figureImg = photo(ctx, h.hero?.figure, 'brand-callcenter-agent', 'service-inbound-calls');
  const figure = `<div class="hero-figure" data-reveal="right">
    <div class="media-frame ratio-4-3">${img(figureImg, 'Acquisition team at work', { w: 760, h: 570 })}</div>
    <div class="float-card tl" data-parallax="-0.05"><div><strong class="count-up" data-count="35" data-suffix="+">0</strong><span>Sub-vertical programs</span></div></div>
    <div class="float-card br" data-parallax="0.05"><div><strong>Real-time</strong><span>Call &amp; lead delivery</span></div></div>
  </div>`;
  const body = `
${hero({ eyebrow: h.hero.eyebrow, headline: h.hero.headline, subheadline: h.hero.subheadline, primary: { label: h.hero.primaryCta, href: '/contact/' }, secondary: { label: h.hero.secondaryCta, href: '/verticals/' }, terrain: 'home', terrainSeed: 'altarious-home', terrainPeaks: verticals.filter((v) => v.active !== false).map((v, i) => ({ label: v.name, x: 0.22 + i * 0.28, h: 0.9 - i * 0.12 })), figure })}
${buyerMarquee(h.trustBar)}
${statsBand(h.stats)}

<section class="section"><div class="container">
  <div class="section-head"><div data-reveal><p class="eyebrow">Acquisition products</p><h2 class="section-title">Four ways to put customers in front of your team</h2><p class="section-sub">${esc(site.positioning)}</p></div><a class="link-arrow" href="/services/">All services</a></div>
  <div class="grid grid-4">${site.services
    .map((s, i) => `<a class="card service-card tilt" href="/services/${s.slug}/" data-reveal style="--i:${i}"><span class="ic tilt-lift">${icon(SERVICE_ICON[s.slug] || s.name, { size: 22 })}</span><p class="num">0${i + 1}</p><h3>${esc(s.name)}</h3><p>${esc(s.short)}</p><span class="link-arrow">Learn more</span></a>`)
    .join('')}</div>
</div></section>

${sectionIf(boardSection(ctx, { verticals: verticals.filter((v) => v.active !== false), subVerticals: subVerticals.filter((s) => s.active !== false), tiles: cms(ctx, 'board')?.tiles, feed: cms(ctx, 'liveFeed') }), (h) => h)}
<section class="section"><div class="container"><div data-reveal><p class="eyebrow">Choosing a product</p><h2 class="section-title">Which acquisition product fits your team</h2><p class="section-sub">The same campaign infrastructure delivers three formats. The right one depends on how your sales operation works.</p></div>${productComparison({ highlight: null, rows: cms(ctx, 'comparison')?.rows })}</div></section>
${featureGrid(h.valueProps, 'Why businesses work with us', '', { eyebrow: 'The difference' })}

<section class="section"><div class="container">
  <div class="section-head"><div data-reveal><p class="eyebrow">Industry verticals</p><h2 class="section-title">Deep programs, not generic campaigns</h2><p class="section-sub">${esc(h.verticalsIntro)}</p></div><a class="link-arrow" href="/verticals/">Browse all verticals</a></div>
  <div class="grid grid-3">${verticals.filter((v) => v.active !== false).map((v, i) => verticalCard(v, subVerticals.filter((s) => s.vertical === v.slug && s.active !== false).length, ctx, i)).join('')}</div>
</div></section>

${processSection(h.howItWorks, { title: 'How a program comes together', sub: 'From scoping to scale, every stage is measured and adjustable.', image: photo(ctx, 'brand-team-meeting', 'brand-data-analytics'), alt: 'Program planning session' })}

<section class="section"><div class="container">
  <div class="section-head"><div data-reveal><p class="eyebrow">Product knowledge</p><h2 class="section-title">Industry intelligence behind every program</h2></div><a class="link-arrow" href="/resources/">All articles</a></div>
  <div class="grid grid-3">${articles.slice(0, 3).map((a, i) => articleCard(a, ctx, i, used)).join('')}</div>
</div></section>

${ctaBand(h.cta)}`;
  return layout(ctx, { path: '/', seo: h.seo, body, bodyClass: 'home', image: heroImg });
}

export function aboutPage(ctx) {
  const a = ctx.pages.about;
  const heroImg = photo(ctx, 'page-about', 'brand-team-meeting', 'brand-hero-office');
  const sideImg = photo(ctx, 'brand-data-analytics', 'brand-abstract-tech');
  const body = `
${hero({ ...a.hero, compact: true, terrain: 'page', terrainSeed: 'about', crumbs: [{ name: 'Home', href: '/' }, { name: 'About Us', href: '/about/' }] })}
<section class="section"><div class="container split">
  <div class="prose" data-reveal>${a.sections.map((s) => `<h2>${esc(s.title)}</h2>${s.body.map((p) => `<p>${esc(p)}</p>`).join('')}`).join('')}</div>
  <div data-reveal="right"><div class="media-frame ratio-4-3">${img(sideImg, 'Performance marketing operations', { w: 760, h: 570 })}</div>
    <div class="side-card" style="margin-top:22px"><h3>At a glance</h3><ul class="checks"><li>3 vertical groups, 35+ sub-vertical programs</li><li>Web leads, inbound calls and live transfers</li><li>Real-time delivery into your CRM or sales line</li><li>Consent documented on every record</li></ul></div>
  </div>
</div></section>
${featureGrid(a.values, 'What we stand for', '', { alt: true, eyebrow: 'Values' })}
${ctaBand(a.cta)}`;
  return layout(ctx, { path: '/about/', seo: a.seo, body, image: heroImg, crumbsInHero: true, breadcrumbs: [{ name: 'Home', href: '/' }, { name: 'About Us', href: '/about/' }] });
}

export function servicesIndexPage(ctx) {
  const s = ctx.pages.services.index;
  const items = ctx.pages.services.items;
  const heroImg = photo(ctx, 'service-ppc-marketing', 'brand-data-analytics');
  const crumbs = [{ name: 'Home', href: '/' }, { name: 'Services', href: '/services/' }];
  const body = `
${hero({ ...s.hero, compact: true, terrain: 'page', terrainSeed: 'services', crumbs })}
<section class="section"><div class="container"><div class="grid grid-2">${ctx.site.services
    .map((svc, i) => {
      const it = items[svc.slug];
      const src = photo(ctx, `service-${svc.slug}`, `service-${svc.slug.replace('ppc-performance-marketing', 'ppc-marketing').replace('web-lead-generation', 'web-leads')}`, 'brand-abstract-tech');
      return `<a class="card zoom-parent" href="/services/${svc.slug}/" data-reveal style="--i:${i % 2}">${mediaBox(src, '', { ratio: 'ratio-16-9', w: 760, h: 428 })}<div class="card-body" style="padding:32px"><span class="pill">0${i + 1}</span><h3 style="margin-top:14px">${esc(svc.name)}</h3><p>${esc(it?.hero?.subheadline || svc.short)}</p><span class="link-arrow">Explore service</span></div></a>`;
    })
    .join('')}</div></div></section>
<section class="section alt"><div class="container">
  <div data-reveal><p class="eyebrow">Coverage</p><h2 class="section-title">Available across every vertical</h2><p class="section-sub">Every sub-vertical has dedicated Inbound Calls and Live Transfers product pages.</p></div>
  <div class="grid grid-3">${ctx.verticals.filter((v) => v.active !== false).map((v, i) => verticalCard(v, ctx.subVerticals.filter((x) => x.vertical === v.slug && x.active !== false).length, ctx, i)).join('')}</div>
</div></section>
${sectionIf(coverageGrid({ product: null, states: ctx.settings?.coverage?.enabled ? ctx.settings.coverage : null }), (h) => `<section class="section"><div class="container"><div data-reveal><p class="eyebrow">Coverage</p><h2 class="section-title">Where programs run today</h2><p class="section-sub">Delivery is restricted to the states we are licensed or contracted to operate in.</p></div>${h}</div></section>`)}
<section class="section alt"><div class="container"><div data-reveal><p class="eyebrow">Commercial</p><h2 class="section-title">How programs are priced</h2></div>${commercialModels({ recommended: cms(ctx, 'commercial')?.recommended, models: cms(ctx, 'commercial')?.models })}</div></section>
<section class="section"><div class="container"><div data-reveal><p class="eyebrow">Getting started</p><h2 class="section-title">From first call to first delivery</h2></div>${onboardingTimeline({ steps: cms(ctx, 'onboarding')?.steps })}</div></section>
${ctaBand({ headline: 'Not sure which product fits?', text: 'Tell us about your sales operation and we will recommend the right mix of leads, calls and transfers.', button: ctx.site.ctas.secondary })}`;
  return layout(ctx, { path: '/services/', seo: s.seo, body, image: heroImg, crumbsInHero: true, breadcrumbs: crumbs });
}

export function servicePage(ctx, slug) {
  const s = ctx.pages.services.items[slug];
  const svc = ctx.site.services.find((x) => x.slug === slug);
  const related = slug === 'inbound-calls' || slug === 'live-transfers' ? ctx.products.filter((p) => p.type === slug && p.active !== false) : [];
  const key = { 'ppc-performance-marketing': 'service-ppc-marketing', 'web-lead-generation': 'service-web-leads', 'inbound-calls': 'service-inbound-calls', 'live-transfers': 'service-live-transfers' }[slug];
  const heroImg = photo(ctx, key, 'brand-abstract-tech');
  const crumbs = [{ name: 'Home', href: '/' }, { name: 'Services', href: '/services/' }, { name: svc.name, href: `/services/${slug}/` }];
  const body = `
${hero({ ...s.hero, compact: true, terrain: 'page', terrainSeed: 'svc-' + slug, terrainLabel: svc.name, primary: { label: s.cta.button, href: '/contact/' }, crumbs })}
<section class="section"><div class="container split">
  <div class="prose" data-reveal><h2>Overview</h2>${s.overview.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
  <div class="side-card sticky" data-reveal="right"><h3>Talk to our team</h3><p class="muted">${esc(s.cta.text)}</p><a class="btn btn-primary full" href="/contact/">${esc(s.cta.button)}</a></div>
</div></section>
${featureGrid(s.features, 'What you get', '', { alt: true, eyebrow: 'Capabilities' })}
${slug === 'inbound-calls' || slug === 'live-transfers' ? signalSection(s.process, { title: 'How it works', alt: false }) : processSection(s.process, { title: 'How it works', image: photo(ctx, key === 'service-inbound-calls' ? 'brand-callcenter-agent' : 'brand-data-analytics', 'brand-team-meeting'), alt: '' })}
${slug === 'inbound-calls' || slug === 'live-transfers' ? `<section class="section"><div class="container"><div data-reveal><p class="eyebrow">Model it</p><h2 class="section-title">What volume would mean for you</h2></div>${volumeCalculator({ vertical: null, subVertical: null, product: slug, ranges: cms(ctx, 'calculator'), disclaimer: cms(ctx, 'calculator')?.disclaimer })}</div></section>` : ''}
<section class="section alt"><div class="container"><div data-reveal><p class="eyebrow">Commercial</p><h2 class="section-title">How this is priced</h2></div>${commercialModels({ recommended: cms(ctx, 'commercial')?.recommended || slug, models: cms(ctx, 'commercial')?.models })}</div></section>
${related.length ? `<section class="section"><div class="container"><div data-reveal><p class="eyebrow">By vertical</p><h2 class="section-title">${esc(svc.name)} programs</h2><p class="section-sub">Dedicated product pages for every sub-vertical we support.</p></div>${ctx.verticals
    .filter((v) => v.active !== false)
    .map((v) => {
      const list = related.filter((p) => p.vertical === v.slug);
      return `<h3 class="group-title"><a href="/${v.slug}/">${esc(v.name)}</a></h3><ul class="link-grid">${list.map((p) => `<li><a href="/${p.vertical}/${p.subVertical}/${p.type}/">${esc(p.name)}</a></li>`).join('')}</ul>`;
    })
    .join('')}</div></section>` : ''}
${ctaBand(s.cta)}`;
  return layout(ctx, { path: `/services/${slug}/`, seo: s.seo, body, image: heroImg, crumbsInHero: true, breadcrumbs: crumbs });
}

export function verticalsIndexPage(ctx) {
  const used = new Set();
  const active = ctx.verticals.filter((v) => v.active !== false);
  const heroImg = photo(ctx, 'brand-city-skyline', 'brand-hero-office');
  const crumbs = [{ name: 'Home', href: '/' }, { name: 'Verticals', href: '/verticals/' }];
  const body = `
${hero({ eyebrow: 'Verticals', headline: 'Industry verticals we serve', subheadline: 'Three vertical groups, each with dedicated sub-vertical programs, Inbound Call and Live Transfer product pages, and supporting knowledge content.', compact: true, terrain: 'page', terrainSeed: 'verticals', terrainPeaks: active.map((v, i) => ({ label: v.name, x: 0.2 + i * 0.28, h: 0.85 - i * 0.1 })), crumbs })}
${active
  .map((v, vi) => {
    const subs = ctx.subVerticals.filter((s) => s.vertical === v.slug && s.active !== false);
    return `<section class="section ${vi % 2 ? 'alt' : ''}"><div class="container">
      <div class="section-head"><div data-reveal><p class="eyebrow">0${vi + 1} — ${esc(v.name)}</p><h2 class="section-title"><a href="/${v.slug}/" style="color:inherit">${esc(v.name)}</a></h2><p class="section-sub">${esc(v.description)}</p></div><a class="link-arrow" href="/${v.slug}/">Vertical overview</a></div>
      <div class="grid grid-3">${subs.map((s, i) => subVerticalCard(s, v, ctx, i, true, used)).join('')}</div>
    </div></section>`;
  })
  .join('')}
${ctaBand({ headline: 'Need a vertical not listed?', text: 'Our platform is built to add new verticals and sub-verticals quickly. Tell us what you sell.', button: ctx.site.ctas.secondary })}`;
  return layout(ctx, { path: '/verticals/', seo: { title: 'Industry Verticals', description: 'Customer acquisition programs across Insurance, Home Services and Web Leads verticals, with dedicated inbound call and live transfer products for every sub-vertical.' }, body, image: heroImg, crumbsInHero: true, breadcrumbs: crumbs });
}

export function verticalPage(ctx, v) {
  const used = new Set();
  const subs = ctx.subVerticals.filter((s) => s.vertical === v.slug && s.active !== false);
  const arts = ctx.articles.filter((a) => a.vertical === v.slug && a.active !== false).slice(0, 3);
  const heroImg = photo(ctx, v.featuredImage, `vertical-${v.slug}`, FALLBACK[v.slug]);
  const crumbs = [{ name: 'Home', href: '/' }, { name: 'Verticals', href: '/verticals/' }, { name: v.name, href: `/${v.slug}/` }];
  const body = `
${hero({ eyebrow: 'Vertical', headline: v.name, subheadline: v.tagline, compact: true, terrain: 'vertical', terrainSeed: 'v-' + v.slug, terrainLabel: v.name, terrainPeaks: subs.slice(0, 4).map((s, i) => ({ label: s.name, x: 0.18 + i * 0.22, h: 0.86 - i * 0.14 })), primary: { label: ctx.site.ctas.primary, href: '/contact/' }, secondary: { label: 'View sub-verticals', href: '#sub-verticals' }, crumbs })}
<section class="section"><div class="container split">
  <div class="prose" data-reveal>${v.intro.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
  <aside class="side-card sticky" data-reveal="right"><h3>Program capabilities</h3><ul class="checks">${v.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul><a class="btn btn-primary full" href="/contact/?vertical=${v.slug}">${esc(ctx.site.ctas.secondary)}</a></aside>
</div></section>
${explorerSection(ctx, v, subs, (s) => pickPhoto(ctx, { keys: [s.slug, `vertical-${v.slug}`], seed: 'ex:' + s.slug }))}
${sectionIf(coverageGrid({ product: null, states: ctx.settings?.coverage?.enabled ? ctx.settings.coverage : null }), (h) => `<section class="section"><div class="container"><div data-reveal><p class="eyebrow">Coverage</p><h2 class="section-title">Where ${esc(v.name.toLowerCase())} programs run</h2><p class="section-sub">Delivery is limited to the states we are licensed or contracted for.</p></div>${h}</div></section>`)}
${arts.length ? `<section class="section alt"><div class="container"><div class="section-head"><div data-reveal><p class="eyebrow">Knowledge</p><h2 class="section-title">${esc(v.name)} intelligence</h2></div><a class="link-arrow" href="/resources/${v.slug}/">All ${esc(v.name.toLowerCase())} articles</a></div><div class="grid grid-3">${arts.map((a, i) => articleCard(a, ctx, i, used)).join('')}</div></div></section>` : ''}
${ctaBand({ headline: `Acquire ${v.name.toLowerCase()} customers with ${ctx.site.name}`, text: 'Tell us your products, geography and capacity. We will scope the right program.', button: ctx.site.ctas.primary }, `/contact/?vertical=${v.slug}`)}`;
  return layout(ctx, { path: `/${v.slug}/`, seo: v.seo, body, glossary: true, image: heroImg, crumbsInHero: true, breadcrumbs: crumbs });
}

export function subVerticalPage(ctx, v, sv) {
  const used = new Set();
  const prods = ctx.products.filter((p) => p.vertical === v.slug && p.subVertical === sv.slug && p.active !== false);
  const arts = ctx.articles.filter((a) => a.vertical === v.slug && a.subVertical === sv.slug && a.active !== false);
  const siblings = ctx.subVerticals.filter((s) => s.vertical === v.slug && s.slug !== sv.slug && s.active !== false).slice(0, 8);
  const heroImg = pickPhoto(ctx, { used, explicit: sv.featuredImage, keys: [sv.slug, `vertical-${v.slug}`], seed: 'svhero:' + sv.slug });
  const crumbs = [{ name: 'Home', href: '/' }, { name: 'Verticals', href: '/verticals/' }, { name: v.name, href: `/${v.slug}/` }, { name: sv.name, href: `/${v.slug}/${sv.slug}/` }];
  const body = `
${hero({ eyebrow: `<a href="/${v.slug}/">${esc(v.name)}</a>`, headline: sv.name, subheadline: sv.shortDescription, compact: true, terrain: 'sub', terrainSeed: 'sv-' + sv.slug, terrainLabel: sv.name, primary: { label: ctx.site.ctas.moreInfo, href: `/contact/?vertical=${v.slug}&sub=${sv.slug}` }, secondary: { label: 'See products', href: '#products' }, crumbs })}
${factStrip(sv, { vertical: v.name })}
${anchorRail([{ id: 'overview', label: 'Overview' }, { id: 'products', label: 'Products' }, { id: 'qualification', label: 'Qualification' }, { id: 'knowledge', label: 'Knowledge' }])}
<section class="section" id="overview"><div class="container split">
  <div class="prose" data-reveal>${sv.description.map((p) => `<p>${esc(p)}</p>`).join('')}<h2>Market context</h2><p>${esc(sv.marketContext)}</p></div>
  <aside class="side-card sticky" data-reveal="right"><h3>Who we reach</h3><p class="muted">${esc(sv.consumerProfile)}</p><h3>Intent signals</h3><ul class="checks">${sv.intentSignals.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></aside>
</div></section>
<section class="section alt" id="products"><div class="container">
  <div data-reveal><p class="eyebrow">Products</p><h2 class="section-title">${esc(sv.name)} acquisition products</h2><p class="section-sub">Choose the delivery format that fits your sales operation, or run both.</p></div>
  <div class="grid grid-2">${prods.map((p, i) => productCard(p, sv, v, ctx, i, used)).join('')}</div>
</div></section>
<section class="section" id="qualification"><div class="container"><div data-reveal><p class="eyebrow">Qualification</p><h2 class="section-title">Build your filter</h2><p class="section-sub">Toggle the criteria you need and see how the program narrows.</p></div>${criteriaBuilder(sv, { chips: cms(ctx, 'criteria')?.chips })}</div></section>
<section class="section alt"><div class="container split even">
  <div class="prose" data-reveal><p class="eyebrow">Qualification</p><h2>What we screen for</h2><p>Standard criteria for ${esc(sv.name.toLowerCase())} programs. Every program is configured to your appetite.</p><ul class="checks">${sv.qualificationCriteria.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></div>
  <div data-reveal="right"><p class="eyebrow">Demand</p><h2 style="margin-bottom:18px">What consumers search for</h2><ul class="tags big">${sv.keywords.map((k) => `<li>${esc(k)}</li>`).join('')}</ul></div>
</div></section>
<section class="section"><div class="container narrow"><div data-reveal><p class="eyebrow">FAQ</p><h2 class="section-title">Questions buyers ask</h2><p class="section-sub">Search ${esc(sv.name.toLowerCase())} and general program questions.</p></div>${faqSearch(faqSet(sv))}</div></section>
${arts.length ? `<section class="section alt" id="knowledge"><div class="container"><div class="section-head"><div data-reveal><p class="eyebrow">Knowledge</p><h2 class="section-title">${esc(sv.name)} product knowledge</h2></div><a class="link-arrow" href="/resources/${v.slug}/${sv.slug}/">All articles</a></div><div class="grid grid-3">${arts.slice(0, 3).map((a, i) => articleCard(a, ctx, i, used)).join('')}</div></div></section>` : ''}
${siblings.length ? `<section class="section"><div class="container"><h2 class="section-title" data-reveal>More ${esc(v.name.toLowerCase())} programs</h2><ul class="link-grid" data-reveal>${siblings.map((s) => `<li><a href="/${v.slug}/${s.slug}/">${esc(s.name)}</a></li>`).join('')}<li><a href="/${v.slug}/">All ${esc(v.name)} →</a></li></ul></div></section>` : ''}
${ctaBand({ headline: `Interested in ${sv.name} customer acquisition?`, text: 'Tell us your criteria, geography and capacity and we will design a program.', button: ctx.site.ctas.secondary }, `/contact/?vertical=${v.slug}&sub=${sv.slug}`)}
${stickyEnquiryBar({ label: `${sv.name} · ${v.name}`, href: `/contact/?vertical=${v.slug}&sub=${sv.slug}`, product: '' })}`;
  return layout(ctx, { path: `/${v.slug}/${sv.slug}/`, seo: sv.seo, body, glossary: true, image: heroImg, jsonld: faqJsonLd(sv.faq), crumbsInHero: true, breadcrumbs: crumbs });
}

export function productPage(ctx, v, sv, p, relatedArticles) {
  const typeName = TYPE_NAME[p.type];
  const other = ctx.products.find((x) => x.vertical === v.slug && x.subVertical === sv.slug && x.type !== p.type && x.active !== false);
  const path = `/${v.slug}/${sv.slug}/${p.type}/`;
  const used = new Set();
  const heroImg = pickPhoto(ctx, { used, explicit: p.featuredImage, keys: [sv.slug, `service-${p.type}`], seed: 'phero:' + sv.slug + ':' + p.type });
  const procImg = photo(ctx, p.type === 'inbound-calls' ? 'brand-callcenter-agent' : 'service-live-transfers', 'brand-team-meeting');
  used.add(procImg);
  const formMeta = { sourcePage: p.name, sourceUrl: path, vertical: v.slug, subVertical: sv.slug, product: p.type, verticalName: v.name, subVerticalName: sv.name, productName: p.type };
  const crumbs = [{ name: 'Home', href: '/' }, { name: 'Verticals', href: '/verticals/' }, { name: v.name, href: `/${v.slug}/` }, { name: sv.name, href: `/${v.slug}/${sv.slug}/` }, { name: typeName, href: path }];
  const body = `
${hero({
    eyebrow: `<a href="/${v.slug}/">${esc(v.name)}</a> · <a href="/${v.slug}/${sv.slug}/">${esc(sv.name)}</a>`,
    headline: p.hero.headline,
    subheadline: p.hero.subheadline,
    primary: { label: p.hero.cta, href: '#inquiry' },
    secondary: other ? { label: `Compare with ${TYPE_NAME[other.type]}`, href: `/${v.slug}/${sv.slug}/${other.type}/` } : null,
    meta: `<div class="hero-meta"><span class="pill glass">${esc(typeName)}</span><span class="pill glass">Product page</span></div>`,
    terrain: 'product',
    terrainSeed: `p-${sv.slug}-${p.type}`,
    terrainLabel: typeName,
    crumbs,
  })}

${anchorRail([{ id: 'overview', label: 'Overview' }, { id: 'process', label: 'How it works' }, { id: 'qualification', label: 'Qualification' }, { id: 'product-knowledge', label: 'Knowledge' }, { id: 'inquiry', label: 'Enquire' }])}
<section class="section" id="overview"><div class="container split">
  <div class="prose" data-reveal>
    <p class="eyebrow">Overview</p>
    <h2>What ${esc(p.name)} is</h2>${p.overview.map((x) => `<p>${esc(x)}</p>`).join('')}
    <h3>Target consumer</h3><p>${esc(p.targetConsumer)}</p>
    <h3>Consumer intent</h3><p>${esc(p.consumerIntent)}</p>
    <h3>How ${esc(typeName.toLowerCase())} are generated</h3><p>${esc(p.howGenerated)}</p>
    <h3>Qualification approach</h3><p>${esc(p.qualification)}</p>
    <h3>Delivery process</h3><p>${esc(p.delivery)}</p>
  </div>
  <aside class="side-card sticky" data-reveal="right">
    <h3>Why businesses use this</h3>
    <ul class="checks">${p.whyUs.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
    <a class="btn btn-primary full" href="#inquiry">${esc(p.hero.cta)}</a>
    <p class="small muted" style="margin:14px 0 0">Or <a href="/${v.slug}/${sv.slug}/">return to ${esc(sv.name)}</a></p>
  </aside>
</div></section>

${signalSection(p.process, { title: 'How it works', sub: `The path from campaign to delivered ${typeName.toLowerCase()}.`, alt: true })}
${p.type === 'live-transfers' ? transferSection(sv) : ''}
<section class="section" id="qualification"><div class="container"><div data-reveal><p class="eyebrow">Qualification</p><h2 class="section-title">Set the filter for your desk</h2><p class="section-sub">Toggle criteria to see how tightly ${esc(p.name)} can be screened before delivery.</p></div>${criteriaBuilder(sv, { chips: cms(ctx, 'criteria')?.chips })}</div></section>
${featureGrid(p.benefits, 'Product benefits', '', { eyebrow: 'Benefits' })}
<section class="section"><div class="container"><div data-reveal><p class="eyebrow">Model it</p><h2 class="section-title">What this volume would mean</h2></div>${volumeCalculator({ vertical: v.slug, subVertical: sv.slug, product: p.type, ranges: cms(ctx, 'calculator'), disclaimer: cms(ctx, 'calculator')?.disclaimer })}</div></section>
<section class="section alt"><div class="container"><div data-reveal><p class="eyebrow">Compare</p><h2 class="section-title">${esc(sv.name)} across all three formats</h2></div>${productComparison({ highlight: p.type, rows: cms(ctx, 'comparison')?.rows })}</div></section>

<section class="section alt knowledge" id="product-knowledge"><div class="container">
  <div class="section-head"><div data-reveal><p class="eyebrow">Product knowledge</p><h2 class="section-title">Related industry articles</h2><p class="section-sub">Industry knowledge supporting ${esc(p.name)}.</p></div><a class="link-arrow" href="/resources/${v.slug}/${sv.slug}/">More ${esc(sv.name)} articles</a></div>
  <div class="grid grid-2">${relatedArticles.map((a, i) => articleCard(a, ctx, i, used)).join('')}</div>
</div></section>

<section class="section"><div class="container narrow"><div data-reveal><p class="eyebrow">FAQ</p><h2 class="section-title">Questions buyers ask</h2><p class="section-sub">Search ${esc(sv.name.toLowerCase())} and general program questions.</p></div>${faqSearch(faqSet(p, sv))}</div></section>

<section class="section" id="inquiry"><div class="container split">
  <div data-reveal>
    <p class="eyebrow">Get started</p>
    <h2>${esc(p.cta.headline)}</h2>
    <p class="lead">${esc(p.cta.text)}</p>
    <div class="side-card" style="margin-top:26px"><p class="small muted" style="margin:0">Your inquiry is tagged <strong>${esc(v.name)} → ${esc(sv.name)} → ${esc(typeName)}</strong> so the right specialist responds.</p></div>
    ${callWidget(ctx.site, { compact: true, hours: ctx.settings?.hours })}
  </div>
  <div class="form-card" data-reveal="right">${inquiryForm(ctx, formMeta, { button: p.cta.button })}</div>
</div></section>
${stickyEnquiryBar({ label: `${sv.name} · ${typeName}`, href: '#inquiry', product: p.type })}`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'Service', name: p.name, serviceType: typeName, provider: { '@type': 'Organization', name: ctx.site.name }, areaServed: 'US', description: p.seo.description, url: ctx.site.domain.replace(/\/$/, '') + path },
    ...faqJsonLd(p.faq),
  ];
  return layout(ctx, { path, seo: p.seo, body, hasForm: true, glossary: true, image: heroImg, jsonld, crumbsInHero: true, breadcrumbs: crumbs });
}

/** Three key takeaways for C13, derived from the article's own H2 sections. */
function articleTakeaways(a) {
  const heads = [];
  const re = /^##\s+(.+)$/gm;
  let m;
  while ((m = re.exec(a.body))) heads.push(m[1].trim());
  const body = a.body.replace(/^#{1,4}.*$/gm, '').split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 90 && !p.startsWith('-'));
  return heads.slice(0, 3).map((h, i) => {
    const sentence = (body[i] || body[0] || a.excerpt).split(/(?<=\.)\s/)[0];
    return `${h}: ${sentence}`;
  });
}

export function articlePage(ctx, a, v, sv, p, related) {
  const url = articleUrl(a);
  const typeName = TYPE_NAME[a.product];
  const productUrl = `/${v.slug}/${sv.slug}/${a.product}/`;
  const used = new Set();
  const leadImg = pickPhoto(ctx, { used, explicit: a.featuredImage, keys: [a.subVertical, `vertical-${a.vertical}`, ...BRAND_POOL], seed: 'article:' + a.slug });
  const heroImg = pickPhoto(ctx, { used, keys: [a.subVertical, `vertical-${a.vertical}`, ...BRAND_POOL], seed: 'abg:' + a.slug });
  const crumbs = [{ name: 'Home', href: '/' }, { name: 'Resources', href: '/resources/' }, { name: v.name, href: `/resources/${v.slug}/` }, { name: sv.name, href: `/resources/${v.slug}/${sv.slug}/` }, { name: a.title, href: url }];
  const body = `
<article>
<header class="article-hero grid-bg noise">
  <div class="hero-media" data-terrain="article" data-terrain-seed="a-${esc(a.slug)}"></div>
  <div class="container">${breadcrumbs(crumbs, true).replace('container ', '')}</div>
  <div class="container">
    <p class="eyebrow"><a href="/${v.slug}/">${esc(v.name)}</a> · <a href="/${v.slug}/${sv.slug}/">${esc(sv.name)}</a> · <a href="${productUrl}">${esc(typeName)}</a></p>
    <h1 data-reveal>${esc(a.title)}</h1>
    <p class="article-meta">${a.author ? `${esc(a.author)} · ` : ''}<time datetime="${esc(a.publishedAt)}">${esc(fmtDate(a.publishedAt))}</time></p>
  </div>
</header>
<div class="container article-lead-media" data-reveal="clip"><div class="media-frame ratio-16-9">${img(leadImg, esc(a.title), { w: 1200, h: 675 })}</div></div>
<div class="container article-layout">
  <div>
    ${keyTakeaways(articleTakeaways(a), `Interested in ${p?.name || sv.name + ' ' + typeName}? This is the market it serves.`)}
    <div class="prose article-body" data-reveal>${md(a.body)}</div>
  </div>
  <aside class="article-side">
    ${articleToc(a.body)}
    <div class="side-card">
      <div class="reading-bar"><i></i></div>
      <h3>Interested in ${esc(p?.name || sv.name + ' ' + typeName)}?</h3>
      <p class="muted small">${esc(p?.hero?.subheadline || sv.shortDescription)}</p>
      <a class="btn btn-primary full" href="${productUrl}#inquiry">Talk to our team</a>
      <a class="link-arrow" href="${productUrl}" style="margin-top:14px;display:inline-flex">View product page</a>
    </div>
    <div class="side-card">
      <h3>Related pages</h3>
      <ul class="plain-links"><li><a href="${productUrl}">${esc(p?.name || typeName)}</a></li><li><a href="/${v.slug}/${sv.slug}/">${esc(sv.name)} overview</a></li><li><a href="/${v.slug}/">${esc(v.name)} vertical</a></li><li><a href="/services/${a.product}/">${esc(typeName)} service</a></li></ul>
    </div>
  </aside>
</div>
</article>
${related.length ? `<section class="section alt"><div class="container">${relatedRail(related.map((r, i) => articleCard(r, ctx, i, used)), { title: 'Related articles', moreHref: `/resources/${v.slug}/${sv.slug}/` })}</div></section>` : ''}
${ctaBand({ headline: `Interested in ${p?.name || sv.name + ' ' + typeName}?`, text: 'Our team can scope a program for your geography, criteria and capacity.', button: 'Talk to Our Team' }, `${productUrl}#inquiry`)}`;
  const jsonld = [
    {
      '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.excerpt, datePublished: a.publishedAt,
      author: { '@type': 'Organization', name: a.author || ctx.site.name }, publisher: { '@type': 'Organization', name: ctx.site.name },
      image: ctx.site.domain.replace(/\/$/, '') + heroImg, mainEntityOfPage: ctx.site.domain.replace(/\/$/, '') + url,
      articleSection: `${v.name} / ${sv.name} / ${typeName}`,
    },
  ];
  return layout(ctx, { path: url, seo: a.seo || { title: a.title, description: a.excerpt }, body, ogType: 'article', glossary: true, image: leadImg, jsonld, crumbsInHero: true, breadcrumbs: crumbs });
}

export function resourcesIndexPage(ctx, { path, title, description, articles, crumbs, intro }) {
  const used = new Set();
  const groups = ctx.verticals.filter((v) => v.active !== false);
  const heroImg = photo(ctx, 'page-resources', 'brand-data-analytics', 'brand-abstract-tech');
  const body = `
${hero({ eyebrow: 'Resources', headline: title, subheadline: intro, compact: true, terrain: 'page', terrainSeed: 'res-' + path, crumbs })}
<section class="section"><div class="container">
  <nav class="filter-nav" aria-label="Filter by vertical" data-reveal><a href="/resources/" class="${path === '/resources/' ? 'on' : ''}">All</a>${groups.map((v) => `<a href="/resources/${v.slug}/" class="${path.startsWith('/resources/' + v.slug + '/') ? 'on' : ''}">${esc(v.name)}</a>`).join('')}</nav>
  <div class="grid grid-3">${articles.map((a, i) => articleCard(a, ctx, i, used)).join('')}</div>
  ${articles.length === 0 ? '<p class="muted">No articles yet.</p>' : ''}
</div></section>
${ctaBand({ headline: 'Turn knowledge into customers', text: 'Every article maps to a live acquisition product. Ask us how it would work for your business.', button: ctx.site.ctas.secondary })}`;
  return layout(ctx, { path, seo: { title, description }, body, image: heroImg, crumbsInHero: true, breadcrumbs: crumbs });
}

export function caseStudiesPage(ctx) {
  const c = ctx.pages['case-studies'];
  const heroImg = photo(ctx, 'page-case-studies', 'brand-data-analytics', 'brand-team-meeting');
  const crumbs = [{ name: 'Home', href: '/' }, { name: 'Case Studies', href: '/case-studies/' }];
  const body = `
${hero({ ...c.hero, compact: true, terrain: 'page', terrainSeed: 'cases', crumbs })}
${sectionIf(ctx.settings?.metrics?.enabled && (ctx.settings.metrics.items || []).length ? metricRibbon(ctx.settings.metrics.items) : '', (h) => `<section class="section"><div class="container"><div data-reveal><p class="eyebrow">Across the book</p><h2 class="section-title">What programs deliver</h2></div>${h}</div></section>`)}
<section class="section"><div class="container">${c.items
    .map((i, idx) => {
      const src = photo(ctx, i.image, i.link.split('/')[2], 'brand-team-meeting');
      return `<article class="case zoom-parent" data-reveal>
      ${mediaBox(src, '', { ratio: '', cls: '', w: 760, h: 560 })}
      <div class="case-content">
        <div class="case-head"><span class="pill">${esc(i.vertical)}</span><span class="pill live-transfers">${esc(i.product)}</span></div>
        <h2 style="font-size:var(--step-2)">${esc(i.title)}</h2>
        <div class="case-grid"><div><h4>Challenge</h4><p>${esc(i.challenge)}</p></div><div><h4>Approach</h4><p>${esc(i.approach)}</p></div><div><h4>Outcome</h4><p>${esc(i.outcome)}</p></div></div>
        <a class="link-arrow" href="${i.link}">View the related product</a>
      </div>
    </article>`;
    })
    .join('')}</div></section>
${ctaBand(c.cta)}`;
  return layout(ctx, { path: '/case-studies/', seo: c.seo, body, image: heroImg, crumbsInHero: true, breadcrumbs: crumbs });
}

export function contactPage(ctx) {
  const c = ctx.pages.contact;
  const heroImg = photo(ctx, 'page-contact', 'brand-callcenter-agent', 'brand-team-meeting');
  const crumbs = [{ name: 'Home', href: '/' }, { name: 'Contact', href: '/contact/' }];
  const body = `
${hero({ ...c.hero, compact: true, terrain: 'page', terrainSeed: 'contact', crumbs })}
<section class="section"><div class="container split">
  <div>
    <div class="grid" style="gap:16px">${c.reasons.map((r, i) => `<div class="feature" data-reveal style="--i:${i}"><span class="feature-icon">${icon(r.title, { size: 20 })}</span><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p></div>`).join('')}</div>
    <div class="side-card" style="margin-top:24px" data-reveal><h3>Direct</h3><p><a href="mailto:${esc(ctx.site.contact.email)}">${esc(ctx.site.contact.email)}</a></p><p>${esc(ctx.site.contact.phone)}</p><p class="muted small">${esc(ctx.site.contact.address)}</p></div>
  </div>
  <div class="form-card" id="inquiry" data-reveal="right">${multiStepEnquiry(ctx, { sourcePage: 'Contact', sourceUrl: '/contact/' }, {})}</div>
</div></section>
<section class="section alt"><div class="container"><div data-reveal><p class="eyebrow">Getting started</p><h2 class="section-title">What happens after you send this</h2></div>${onboardingTimeline({ steps: cms(ctx, 'onboarding')?.steps })}</div></section>
<section class="section"><div class="container narrow">${callWidget(ctx.site, { compact: false, hours: ctx.settings?.hours })}</div></section>`;
  return layout(ctx, { path: '/contact/', seo: c.seo, body, hasForm: true, image: heroImg, crumbsInHero: true, breadcrumbs: crumbs });
}

export function simplePage(ctx, { path, title, description, html, crumbName }) {
  const crumbs = [{ name: 'Home', href: '/' }, { name: crumbName || title, href: path }];
  const body = `${hero({ headline: title, compact: true, terrain: 'page', terrainSeed: 'legal-' + path, crumbs })}<section class="section"><div class="container narrow prose" data-reveal>${html}</div></section>`;
  return layout(ctx, { path, seo: { title, description }, body, crumbsInHero: true, breadcrumbs: crumbs });
}

export function notFoundPage(ctx) {
  const body = `${hero({ eyebrow: 'Error 404', headline: 'Page not found', subheadline: 'The page you requested does not exist or has moved.', compact: true, primary: { label: 'Back to home', href: '/' }, secondary: { label: 'Browse verticals', href: '/verticals/' } })}`;
  return layout(ctx, { path: '/404.html', seo: { title: 'Page not found', description: 'Page not found.' }, body });
}
