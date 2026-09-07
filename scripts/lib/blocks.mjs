/* ============================================================
   Blocks for approved design directions D2–D9.
   Imported by templates.mjs.
   ============================================================ */
import { esc } from './util.mjs';

/** Split a headline into 2–4 balanced lines for the D2 masked reveal. */
export function headlineLines(text) {
  const words = String(text).split(/\s+/);
  if (words.length <= 3) return [text];
  const target = words.length <= 6 ? 2 : words.length <= 10 ? 3 : 4;
  const per = Math.ceil(words.length / target);
  const lines = [];
  for (let i = 0; i < words.length; i += per) lines.push(words.slice(i, i + per).join(' '));
  return lines;
}

/* ---------- D3 · signal path diagram ---------- */
const NODE_X = [60, 265, 460, 655, 850];
const NODE_Y = [104, 52, 104, 52, 104];

export function signalSection(steps, { title = 'How it works', sub = '', eyebrow = 'Process', alt = false } = {}) {
  const pts = steps.slice(0, 5).map((s, i) => ({ x: NODE_X[i], y: NODE_Y[i], label: shortLabel(s.title) }));
  let dPath = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], mid = (a.x + b.x) / 2;
    dPath += ` C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`;
  }
  return `<section class="section ${alt ? 'alt' : ''}"><div class="container">
  <div class="section-head"><div data-reveal><p class="eyebrow">${esc(eyebrow)}</p><h2 class="section-title">${esc(title)}</h2>${sub ? `<p class="section-sub">${esc(sub)}</p>` : ''}</div><button class="btn btn-ghost signal-replay" type="button">Replay signal</button></div>
  <div class="signal" data-reveal>
    <svg viewBox="0 0 910 160" role="img" aria-label="${esc(steps.map((s) => s.title).join(' → '))}">
      <defs><linearGradient id="agWire" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2dd4bf"/><stop offset="1" stop-color="#3b82f6"/></linearGradient></defs>
      <path class="wire-base" d="${dPath}"/>
      <path class="wire-lit" d="${dPath}" stroke-dasharray="0 4000"/>
      ${pts.map((p, i) => `<g class="node" data-x="${p.x}"><circle cx="${p.x}" cy="${p.y}" r="7"/><text x="${p.x}" y="${p.y > 80 ? p.y + 26 : p.y - 18}" text-anchor="middle">${esc(p.label)}</text></g>`).join('')}
      <circle class="pulse" r="5" fill="#2dd4bf" opacity="0"/>
    </svg>
    <ol class="signal-steps">${steps.slice(0, 5).map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ol>
  </div>
</div></section>`;
}

function shortLabel(t) {
  const map = { 'PPC / Traffic Acquisition': 'PPC', 'Traffic Acquisition': 'Traffic', 'Consumer Interest': 'Intent', 'Call Initiated': 'Call', Qualification: 'Qualify', 'Inbound Call Delivered': 'Delivered', 'Live Connection': 'Bridge', 'Transfer to Client': 'Delivered' };
  return map[t] || t.split(/\s+/)[0];
}

/* ---------- D4 · operations board ---------- */

/** A widget is on unless the CMS has explicitly switched it off. */
export function widgetEnabled(settings, key) {
  const s = settings && typeof settings === 'object' ? settings[key] : null;
  if (!s || typeof s !== 'object') return true;
  return s.enabled !== false;
}

const BOARD_FALLBACK_TILES = [
  { label: 'Vertical groups', value: 'auto:verticals' },
  { label: 'Sub-vertical programs', value: 'auto:subVerticals' },
  { label: 'Delivery', value: 'Real-time' },
  { label: 'Product types', value: '3' },
];

const FEED_FALLBACK = {
  label: 'Delivery feed · illustrative',
  rows: [
    ['Auto Insurance', 'Quoted'], ['Medicare', 'Transferred'], ['Pest Control', 'Booked'],
    ['HVAC', 'Dispatched'], ['Personal Loans', 'Pre-qualified'], ['Roofing', 'Inspection set'],
    ['Final Expense', 'Application'], ['Solar', 'Site survey'], ['Legal', 'Case review'],
  ],
};

/* `auto:` values are derived from live content and cannot be faked from the CMS.
   `sim:` values are illustrative activity figures: the number comes from the clock,
   never from the visitor, so everyone loading the page in the same window sees the
   same figure. The tile is marked illustrative and the client script keeps it moving.
   Every other value renders exactly as the administrator typed it. */
function tileValue(raw, auto) {
  const v = String(raw == null ? '' : raw).trim();
  if (v.slice(0, 5) === 'auto:') {
    const k = v.slice(5);
    return Object.prototype.hasOwnProperty.call(auto, k) ? String(auto[k]) : '';
  }
  return v;
}

/** Deterministic value for an illustrative figure in a given time bucket. */
export function simulatedValue(fig, bucket) {
  const min = Number(fig.min), max = Number(fig.max);
  if (!isFinite(min) || !isFinite(max) || max < min) return null;
  let h = 2166136261;
  const key = String(fig.key) + ':' + bucket;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return min + (Math.abs(h) % (Math.floor(max - min) + 1));
}

/** The bucket index for "now" at the configured cadence. */
export function simulatedBucket(cadenceMinutes) {
  const m = Math.max(1, Number(cadenceMinutes) || 15);
  return Math.floor(Date.now() / (m * 60000));
}

export function boardSection(ctx, opts = {}) {
  const { verticals = [], subVerticals = [] } = opts;
  const auto = { verticals: verticals.length, subVerticals: subVerticals.length };
  const sim = opts.sim || {};

  const tiles = (opts.tiles != null ? opts.tiles : BOARD_FALLBACK_TILES)
    .map((t) => {
      if (!t || typeof t !== 'object') return null;
      const label = String(t.label == null ? '' : t.label).trim();
      const raw = String(t.value == null ? '' : t.value).trim();
      if (raw.slice(0, 4) === 'sim:') {
        const fig = (sim.figures || []).find((f) => f && f.key === raw.slice(4));
        if (!fig || sim.enabled === false) return null;
        const seed = simulatedValue(fig, simulatedBucket(sim.cadenceMinutes));
        if (seed == null) return null;
        /* rendered at rest so the page is complete without JavaScript */
        return `<div class="cell"><span class="k">${esc(label)} <em class="sim-tag">${esc(sim.label || 'Illustrative')}</em></span><span class="v" data-sim="${esc(fig.key)}" data-sim-min="${esc(fig.min)}" data-sim-max="${esc(fig.max)}" data-sim-cadence="${esc(sim.cadenceMinutes || 15)}" data-sim-suffix="${esc(fig.suffix || '')}">${esc(seed)}${esc(fig.suffix || '')}</span></div>`;
      }
      const value = tileValue(raw, auto);
      if (!label || value === '') return null;
      return `<div class="cell"><span class="k">${esc(label)}</span><span class="v">${esc(value)}</span></div>`;
    })
    .filter(Boolean)
    .join('');

  /* The delivery feed is illustrative and stays labelled as such. */
  const src = opts.feed != null ? opts.feed : FEED_FALLBACK;
  const rows = (src && Array.isArray(src.rows) ? src.rows : [])
    .filter((r) => Array.isArray(r) && r.length >= 2 && String(r[0]).trim())
    .map((r) => [String(r[0]), String(r[1])]);
  const feedLabel = String((src && src.label) || FEED_FALLBACK.label).trim() || FEED_FALLBACK.label;
  const feedCell = rows.length
    ? `<div class="cell tall wide"><span class="k">${esc(feedLabel)}</span><div class="feed" data-feed="${JSON.stringify(rows).replace(/"/g, '&quot;')}"></div></div>`
    : '';

  if (!feedCell && !tiles) return '';

  const bars = [10, 16, 23, 30, 26, 19, 14, 10, 7, 5];
  return `<section class="section alt"><div class="container">
  <div class="section-head"><div data-reveal><p class="eyebrow">Delivery infrastructure</p><h2 class="section-title">Built like an operations desk</h2><p class="section-sub">Programs are configured, monitored and adjusted per vertical — routing, qualification and delivery all reported back to source.</p></div></div>
  <div class="board" data-reveal>
    ${feedCell}
    ${tiles}
    <div class="cell wide"><span class="k">Call duration mix</span><div class="bars">${bars.map((h, i) => `<i class="${i === 3 ? 'hi' : ''}" style="height:${h * 3}%"></i>`).join('')}</div></div>
  </div>
</div></section>`;
}

/* ---------- D5 · vertical explorer ---------- */
export function explorerSection(ctx, v, subs, photoFor) {
  const items = subs.map((s) => ({
    name: s.name,
    vertical: v.name,
    text: s.shortDescription,
    href: `/${v.slug}/${s.slug}/`,
    img: photoFor(s),
  }));
  const json = JSON.stringify(items).replace(/"/g, '&quot;');
  return `<section class="section alt" id="sub-verticals"><div class="container">
  <div data-reveal><p class="eyebrow">Programs</p><h2 class="section-title">${esc(v.name)} sub-verticals</h2><p class="section-sub">Every sub-vertical has dedicated Inbound Calls and Live Transfers product pages with their own qualification logic and knowledge content. Hover a program to preview it.</p></div>
  <div class="explorer" data-items="${json}" data-reveal>
    <div class="ex-list" role="list">${subs.map((s) => `<a role="listitem" href="/${v.slug}/${s.slug}/">${esc(s.name)}</a>`).join('')}</div>
    <div class="ex-pane"></div>
  </div>
</div></section>`;
}

/* ---------- D6 · transfer visualiser ---------- */
export function transferSection(sv, { alt = false } = {}) {
  const name = sv.name.toLowerCase();
  const script = JSON.stringify([
    { stage: 0, amp: 0.22, text: `Ringing — consumer responded to a ${name} campaign and asked to speak with a provider.` },
    { stage: 1, amp: 0.55, text: `Consumer engaged — our agent confirms the details that matter for ${name}: ${(sv.qualificationCriteria || []).slice(0, 2).map((c) => c.toLowerCase()).join(', ')}.` },
    { stage: 2, amp: 0.78, text: 'Qualified — criteria met, consumer wants to proceed now and consents to the connection.' },
    { stage: 3, amp: 0.95, text: 'Bridged — warm handover to your line. Your agent takes over with the consumer already on the call.' },
  ]).replace(/"/g, '&quot;');
  return `<section class="section ${alt ? 'alt' : ''}"><div class="container">
  <div class="section-head"><div data-reveal><p class="eyebrow">What a transfer sounds like</p><h2 class="section-title">From first contact to your agent</h2><p class="section-sub">Every ${name} transfer passes the same four stages before your team is connected.</p></div></div>
  <div class="transfer" data-script="${script}" data-reveal>
    <div class="transfer-head">
      <div class="transfer-states"><span>Ringing</span><span>Consumer engaged</span><span>Qualified</span><span>Bridged to you</span></div>
      <button class="btn btn-ghost transfer-replay" type="button">Replay</button>
    </div>
    <canvas height="100" aria-label="Illustration of call audio during a live transfer"></canvas>
    <p class="transfer-log">Waiting for the next qualified ${esc(name)} consumer…</p>
  </div>
</div></section>`;
}

/* ---------- D8 · article contents ---------- */
export function articleToc(body) {
  const heads = [];
  const re = /^##\s+(.+)$/gm;
  let m;
  while ((m = re.exec(body))) heads.push(m[1].trim());
  if (heads.length < 2) return '';
  const slug = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `<div class="side-card"><h3>On this page</h3><nav class="article-toc" aria-label="Article contents">${heads.map((h) => `<a href="#${slug(h)}">${esc(h)}</a>`).join('')}</nav></div>`;
}

/* ---------- D9 · sparkline ---------- */
export function sparkline(seed) {
  const pts = [];
  let v = 22;
  for (let i = 0; i < 8; i++) {
    v = Math.max(4, Math.min(28, v - 1.4 - ((seed * (i + 3)) % 5) * 0.6 + (i % 2 ? 1.2 : -0.6)));
    pts.push(`${(i * 100) / 7},${v.toFixed(1)}`);
  }
  const last = pts[pts.length - 1].split(',');
  return `<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.join(' ')}"/><circle cx="${last[0]}" cy="${last[1]}" r="2.4"/></svg>`;
}

/* ---------- FAQ composition ----------
   A record carries three vertical-specific questions, which is too few to be worth
   searching. Product and sub-vertical pages compose those with the questions every
   buyer asks about running a program, so the searchable FAQ has something to search. */
const PROGRAM_FAQ = [
  { q: 'How quickly can a program go live?', a: 'Most programs are scoped in a single call and live within five business days. The work in between is agreeing qualification criteria, confirming geography and testing delivery into your phone system or CRM.' },
  { q: 'Can we cap daily volume?', a: 'Yes. Daily and hourly caps are set to your capacity and can be changed at any time. Programs can also be paused entirely without losing your campaign history.' },
  { q: 'What hours is delivery active?', a: 'Delivery runs only during the hours your team is available to answer, in your time zone, and follows your holiday schedule. Nothing is routed to a desk that is closed.' },
  { q: 'How is quality handled?', a: 'Every call is tracked to its source with duration and outcome recorded. Calls that fall below the agreed billable duration or fail qualification are reviewed, and there is a defined dispute window.' },
  { q: 'Can records post directly into our CRM?', a: 'Yes. Web leads post in real time to your CRM, dialer or lead management platform, and calls can carry the same metadata so a record exists before your agent picks up.' },
];

/** Compose a record's own FAQ with the standard program questions. */
export function faqSet(...records) {
  const seen = new Set();
  const out = [];
  for (const r of records) {
    for (const f of r?.faq || []) {
      if (f?.q && !seen.has(f.q)) { seen.add(f.q); out.push(f); }
    }
  }
  for (const f of PROGRAM_FAQ) if (!seen.has(f.q)) { seen.add(f.q); out.push(f); }
  return out;
}
