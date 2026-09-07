/**
 * Altarious icon set — two-layer illustrative marks on a 48×48 grid.
 *
 * Every icon is built from two layers:
 *   1. a BACKING silhouette, filled with a per-key linear gradient derived from the
 *      site's brand tokens (--teal-400 → --blue-500, at low alpha). Each icon gets a
 *      deliberately different outer shape (squircle, hex, shield, blob, arch, leaf,
 *      pentagon, diamond, badge…) so a row of four cards reads as four objects.
 *   2. a FOREGROUND drawing stroked in `currentColor`, so icons inherit text colour
 *      and stay legible on both the light and dark theme.
 *
 * Gradient ids are namespaced per key (`ag-ico-<key>-g`). Two renders of the same key
 * share one identical definition (harmless); two *different* keys can never collide.
 *
 * The SVG carries its own presentation attributes, so it is correct with no stylesheet
 * at all; `public/assets/css/icons.css` is sizing/polish on top.
 */

/* ---------------------------------------------------------------- backings */
/* Distinct outer silhouettes. Designed edge-to-edge on the 48 grid. */
const BG = {
  squircle: 'M24 2.5c15.6 0 21.5 5.9 21.5 21.5S39.6 45.5 24 45.5 2.5 39.6 2.5 24 8.4 2.5 24 2.5z',
  hex: 'M24 2.6l18.6 10.7v21.4L24 45.4 5.4 34.7V13.3z',
  shield: 'M24 2.8l17.6 6.2v14.7c0 10.6-7.2 18.6-17.6 21.5C13.6 42.3 6.4 34.3 6.4 23.7V9z',
  blob: 'M10.4 11.8C16 3.2 32.4.4 40.2 7.6s7.4 22.4.6 30.2-23.6 9.6-31 1.4-4.8-19 .6-27.4z',
  circle: 'M24 3a21 21 0 1 1 0 42 21 21 0 0 1 0-42z',
  diamond: 'M24 2.4l21.6 21.6L24 45.6 2.4 24z',
  arch: 'M24 3.2c11.7 0 21.2 9.5 21.2 21.2v20.2H2.8V24.4C2.8 12.7 12.3 3.2 24 3.2z',
  leaf: 'M6.6 41.4C1.4 25.6 11.4 5.8 41.4 6.6c1.6 30-18.2 40-34.8 34.8z',
  pentagon: 'M24 2.6l20.4 14.8-7.8 24H11.4l-7.8-24z',
  badge: 'M8.6 4.6h30.8v28.2L24 44.6 8.6 32.8z',
  bar: 'M6 8.4h36a5.6 5.6 0 0 1 5.6 5.6v20a5.6 5.6 0 0 1-5.6 5.6H6A5.6 5.6 0 0 1 .4 34V14A5.6 5.6 0 0 1 6 8.4z',
  drop: 'M24 2.6c9 10.6 17.4 16.4 17.4 26A17.4 17.4 0 0 1 6.6 28.6c0-9.6 8.4-15.4 17.4-26z',
  tag: 'M22.6 3.4h18.2A4.4 4.4 0 0 1 45.2 7.8V26c0 1.2-.5 2.3-1.3 3.1L27.6 45.4a4.4 4.4 0 0 1-6.2 0L3.4 27.4a4.4 4.4 0 0 1 0-6.2L19.5 4.7a4.4 4.4 0 0 1 3.1-1.3z',
  cross: 'M18 3.2h12v14.6h14.6v12H30v14.6H18V29.8H3.4v-12H18z',
  wave: 'M3.6 15.4c8-9.4 14.8 4 22-1.4S40 3.6 44.4 10.4v23.2c0 6.6-4 10.4-10.4 10.4H14c-6.4 0-10.4-3.8-10.4-10.4z',
};

/* ------------------------------------------------------------------ glyphs */
/* Each entry: [backing key, foreground markup]. Foreground is stroked currentColor. */
const ICONS = {
  /* ===== products ===== */
  /* rising bid ladder with a cursor-click on the winning bid */
  ppc: ['pentagon', '<path d="M11 35h26"/><path d="M15 35v-6"/><path d="M22 35V22"/><path d="M29 35V15"/><path d="M36 35v-9"/><path d="M13 24l9-9 7 5 8-9"/><circle cx="37" cy="11" r="3.1"/>'],
  /* a form record sliding into a stack */
  webleads: ['bar', '<rect x="9" y="11" width="17" height="22" rx="3"/><path d="M13.5 18h8M13.5 23h8M13.5 28h5"/><path d="M28 22h10"/><path d="M34 18l4.5 4-4.5 4"/><path d="M41 30v6a2 2 0 0 1-2 2H24"/>'],
  /* handset with an incoming arc */
  inbound: ['drop', '<path d="M12 13c0 13 10 23 23 23l3.4-4.6-6.4-4.6-3.2 3.2a21 21 0 0 1-7.8-7.8l3.2-3.2-4.6-6.4z"/><path d="M28 11a13 13 0 0 1 11 11" stroke-dasharray="0.1 5.2"/><path d="M23 8a19 19 0 0 1 17 17" stroke-dasharray="0.1 5.2"/>'],
  /* two endpoints bridged by a span */
  transfer: ['wave', '<circle cx="11" cy="31" r="4.2"/><circle cx="37" cy="31" r="4.2"/><path d="M11 26.8C11 17 17 12 24 12s13 5 13 14.8"/><path d="M20 22.5h8"/><path d="M25.5 19.5l3 3-3 3"/>'],

  /* ===== qualities ===== */
  intent: ['circle', '<circle cx="24" cy="24" r="13"/><circle cx="24" cy="24" r="6"/><circle cx="24" cy="24" r="1.6" fill="currentColor" stroke="none"/><path d="M24 5v5M24 38v5M5 24h5M38 24h5"/>'],
  realtime: ['blob', '<circle cx="24" cy="25" r="13"/><path d="M24 17v8.4l5.6 3.4"/><path d="M18 8h12"/><path d="M38 13l3.4-3.4"/>'],
  targeting: ['diamond', '<path d="M24 42s12-10.4 12-19.6A12 12 0 1 0 12 22.4C12 31.6 24 42 24 42z"/><circle cx="24" cy="21.6" r="4.6"/>'],
  speed: ['arch', '<path d="M9 32a15 15 0 1 1 30 0"/><path d="M24 32l9-9"/><circle cx="24" cy="32" r="2.6" fill="currentColor" stroke="none"/><path d="M9 38h30"/>'],
  qualified: ['shield', '<path d="M24 8.5l12 4.2v10.4c0 7.4-5 13-12 15.3-7-2.3-12-7.9-12-15.3V12.7z"/><path d="M18.5 23.5l4.2 4.2 7.6-8.4"/>'],
  visibility: ['leaf', '<path d="M6 24s7.4-11 18-11 18 11 18 11-7.4 11-18 11S6 24 6 24z"/><circle cx="24" cy="24" r="5.4"/><path d="M24 6v4M38 12l-2.6 2.8M10 12l2.6 2.8"/>'],
  compliance: ['badge', '<path d="M14 8h13l8 8v24H14z"/><path d="M27 8v8h8"/><path d="M18.5 25.5l3.4 3.4 7.4-8"/><path d="M18.5 34h11"/>'],
  scale: ['pentagon', '<path d="M9 37h30"/><rect x="11" y="27" width="6" height="10" rx="1.6"/><rect x="21" y="20" width="6" height="17" rx="1.6"/><rect x="31" y="11" width="6" height="26" rx="1.6"/>'],
  routing: ['hex', '<circle cx="11" cy="12" r="3.6"/><circle cx="11" cy="36" r="3.6"/><circle cx="37" cy="24" r="4.2"/><path d="M14.6 12h8A10.4 10.4 0 0 1 33 22.4"/><path d="M14.6 36h8A10.4 10.4 0 0 0 33 25.6"/>'],
  coverage: ['circle', '<circle cx="24" cy="24" r="16"/><path d="M8 24h32"/><path d="M24 8c5 4.8 7.6 10 7.6 16S29 35.2 24 40c-5-4.8-7.6-10-7.6-16S19 12.8 24 8z"/>'],
  people: ['wave', '<circle cx="18" cy="17" r="6"/><path d="M6 38c0-6.6 5.4-11 12-11s12 4.4 12 11"/><path d="M31 12.4a6 6 0 0 1 0 11.2"/><path d="M34 28c5 1.2 8 4.8 8 10"/>'],
  handshake: ['bar', '<path d="M6 23l6-6 7 6.4 4.6-3.8 7.4 6.6 5.4-5.2"/><path d="M6 23v5.6l9.6 8 8.4-5.6 8.4 5.6L42 28.6V23"/><path d="M14 15l6-3.4 6 2.4 6-2.4 6 3.4"/>'],
  clock: ['circle', '<circle cx="24" cy="25" r="14"/><path d="M24 15.5V25l6.6 4"/><path d="M18.5 7.5h11"/><path d="M24 7.5v4"/>'],
  shield: ['shield', '<path d="M24 8l12.4 4.4v10.2c0 7.6-5.2 13.4-12.4 15.8-7.2-2.4-12.4-8.2-12.4-15.8V12.4z"/><path d="M24 16.5v13"/><path d="M18 22.5h12"/>'],
  funnel: ['diamond', '<path d="M9 11h30l-11.4 13v13.4L20.4 42V24z"/><path d="M14 17h20"/>'],
  filter: ['squircle', '<path d="M9 15h30"/><path d="M13 24h22"/><path d="M18 33h12"/><circle cx="30" cy="15" r="3.4" fill="currentColor" stroke="none"/><circle cx="19" cy="24" r="3.4" fill="currentColor" stroke="none"/><circle cx="27" cy="33" r="3.4" fill="currentColor" stroke="none"/>'],
  'phone-desk': ['bar', '<rect x="8" y="24" width="32" height="13" rx="3.4"/><path d="M13 24v-4a11 11 0 0 1 22 0v4"/><rect x="8" y="14" width="7" height="10" rx="2.6"/><rect x="33" y="14" width="7" height="10" rx="2.6"/><path d="M17 31h10"/>'],
  document: ['badge', '<path d="M13 7h15l8 8v26H13z"/><path d="M28 7v8h8"/><path d="M18 23h13M18 29h13M18 35h8"/>'],
  'map-pin': ['drop', '<path d="M24 42s13-11.4 13-21.4A13 13 0 1 0 11 20.6C11 30.6 24 42 24 42z"/><circle cx="24" cy="20" r="5"/>'],
  chart: ['bar', '<path d="M8 38V16M8 38h32"/><path d="M14 32l8-9 7 5 11-14"/><circle cx="40" cy="24" r="3" fill="currentColor" stroke="none"/><path d="M34 10h8v8"/>'],
  spark: ['blob', '<path d="M22 6l3.6 9.8L36 19.4l-10.4 3.6L22 33l-3.6-10-10.4-3.6L18.4 15.8z"/><path d="M36 30l1.6 4.4 4.4 1.6-4.4 1.6L36 42l-1.6-4.4-4.4-1.6 4.4-1.6z"/>'],

  /* ===== verticals ===== */
  insurance: ['shield', '<path d="M24 7.5l13 4.6v10.7c0 8-5.4 14-13 16.6-7.6-2.6-13-8.6-13-16.6V12.1z"/><path d="M17.5 21h13M17.5 26.5h13M17.5 32h8"/>'],
  'home-services': ['arch', '<path d="M8 24L24 10l16 14"/><path d="M12 22v18h24V22"/><path d="M30 33.5l6-6a4.6 4.6 0 0 0-6-6l-1.6 1.6"/><path d="M26 29.5l4 4"/>'],
  'web-leads-vertical': ['bar', '<rect x="7" y="10" width="34" height="27" rx="3.4"/><path d="M7 18h34"/><circle cx="12.5" cy="14" r="1.3" fill="currentColor" stroke="none"/><circle cx="17" cy="14" r="1.3" fill="currentColor" stroke="none"/><path d="M22 24l11 4.6-4.6 1.6L26.6 35z"/>'],
};

/* ---------------------------------------------------------------- aliasing */
const ALIASES = [
  [/ppc|pay.?per.?click|performance marketing|paid|bid|auction|campaign|ad spend|traffic|search/i, 'ppc'],
  [/web lead|form lead|lead gen|lead generation|real.?time lead/i, 'webleads'],
  [/inbound|incoming call|call\b|calls\b|dial|ivr/i, 'inbound'],
  [/transfer|bridge|warm hand|handover|connect/i, 'transfer'],
  [/insurance|policy|carrier|underwrit/i, 'insurance'],
  [/home service|roof|hvac|solar|remodel|contractor|plumb/i, 'home-services'],
  [/browser|website|landing page|web propert/i, 'web-leads-vertical'],
  [/intent|high.?intent|consumer intent|motivat/i, 'intent'],
  [/real.?time|instant|live\b|latency/i, 'realtime'],
  [/target|geograph|state|zip|footprint|vertical-specific|industry|niche/i, 'targeting'],
  [/speed|faster|accelerat|shorten|velocity|cycle/i, 'speed'],
  [/qualif|pre.?screen|criteria|verified|vetted/i, 'qualified'],
  [/visib|report|dashboard|track|attribution|transparen|insight/i, 'visibility'],
  [/complian|consent|tcpa|licen|regulat|legal/i, 'compliance'],
  [/scale|volume|capacity|grow|throughput/i, 'scale'],
  [/rout|deliver|dispatch|queue|distribut/i, 'routing'],
  [/coverage|nationwide|national|global|footprint/i, 'coverage'],
  [/team|agent|expert|people|staff|partner|client|customer/i, 'people'],
  [/trust|relationship|account|partnership|handshake/i, 'handshake'],
  [/hour|schedule|availab|24\/7|uptime|time\b/i, 'clock'],
  [/secur|protect|shield|safe|fraud|risk/i, 'shield'],
  [/funnel|pipeline|journey|stage/i, 'funnel'],
  [/filter|screen|rule|exclusion|suppress/i, 'filter'],
  [/call cent|contact cent|desk|agent floor|switchboard/i, 'phone-desk'],
  [/doc|guide|article|whitepaper|case stud|resource|paper/i, 'document'],
  [/map|location|local|near|region|territor/i, 'map-pin'],
  [/chart|metric|analytic|roi|performance data|measur|convers|revenue/i, 'chart'],
  [/quality|premium|spark|innovat|smart|ai\b/i, 'spark'],
];

/** Every available key, in a stable order (used by the admin icon picker). */
export const ICON_KEYS = Object.keys(ICONS);

/** Pick the glyph that best fits a free-text label, falling back to a neutral mark. */
export function iconFor(label = '') {
  const s = String(label == null ? '' : label);
  if (Object.prototype.hasOwnProperty.call(ICONS, s)) return s;
  for (const [re, key] of ALIASES) if (re.test(s)) return key;
  return 'spark';
}

/**
 * Render one icon by exact key or by matching a label. Never throws.
 * @param {string} nameOrLabel exact key (e.g. 'ppc') or free text (e.g. 'Real-time delivery')
 * @param {{size?:number, cls?:string}} opts
 * @returns {string} an inline <svg> string
 */
export function icon(nameOrLabel, { size = 44, cls = '' } = {}) {
  const key = iconFor(nameOrLabel);
  const entry = ICONS[key] || ICONS.spark;
  const [bgKey, fg] = entry;
  const bg = BG[bgKey] || BG.squircle;
  const px = Number.isFinite(Number(size)) && Number(size) > 0 ? Number(size) : 44;
  const gid = `ag-ico-${key}-g`;
  const cls2 = ('ico ico-' + key + (cls ? ' ' + cls : '')).trim();

  return (
    `<svg class="${cls2}" width="${px}" height="${px}" viewBox="0 0 48 48" ` +
    `role="img" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="var(--teal-400, #2dd4bf)" stop-opacity=".34"/>` +
    `<stop offset="1" stop-color="var(--blue-500, #3b82f6)" stop-opacity=".18"/>` +
    `</linearGradient></defs>` +
    `<path class="ico-bg" d="${bg}" fill="url(#${gid})" stroke="none"/>` +
    `<g class="ico-fg" fill="none" stroke="currentColor" stroke-width="2.1" ` +
    `stroke-linecap="round" stroke-linejoin="round">${fg}</g>` +
    `</svg>`
  );
}

export const SERVICE_ICON = {
  'ppc-performance-marketing': 'ppc',
  'web-lead-generation': 'webleads',
  'inbound-calls': 'inbound',
  'live-transfers': 'transfer',
};
