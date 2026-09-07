/**
 * Icon set. Every glyph is drawn for a specific idea in this business —
 * a repeated checkmark on every card is the fastest way to look generic.
 * 24×24 grid, 1.6 stroke, round caps, no fills, so they sit evenly beside text.
 */
const P = (d) => `<path d="${d}"/>`;

const GLYPHS = {
  /* products and services */
  ppc: P('M3 20h18') + P('M6 20V11') + P('M11 20V5') + P('M16 20v-6') + '<circle cx="11" cy="5" r="2"/>',
  webleads: P('M4 5h16v13H4z') + P('M4 9h16') + P('M8 13h6') + P('M8 16h3') + '<circle cx="17.5" cy="15.5" r="2"/>',
  inbound: P('M4 5c0 8 7 15 15 15l2-3-4-3-2 2a14 14 0 0 1-5-5l2-2-3-4z') + P('M15 3h6v6') + P('M21 3l-6 6'),
  transfer: P('M3 8h11') + P('M11 5l3 3-3 3') + P('M21 16H10') + P('M13 13l-3 3 3 3') + '<circle cx="18" cy="8" r="2"/><circle cx="6" cy="16" r="2"/>',

  /* qualities */
  intent: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/>' + P('M12 2v3') + P('M12 19v3') + P('M2 12h3') + P('M19 12h3'),
  realtime: '<circle cx="12" cy="12" r="8.5"/>' + P('M12 7.5V12l3 2'),
  targeting: P('M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z') + '<circle cx="12" cy="10" r="2.6"/>',
  speed: P('M4 15a8 8 0 1 1 16 0') + P('M12 15l4.5-4.5') + P('M4 19h16'),
  qualified: P('M12 3l7 3v5.5c0 4.3-2.9 7.9-7 9.5-4.1-1.6-7-5.2-7-9.5V6z') + P('M9 12l2.2 2.2L15.5 10'),
  visibility: P('M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z') + '<circle cx="12" cy="12" r="2.8"/>',
  compliance: P('M7 4h7l4 4v12H7z') + P('M14 4v4h4') + P('M10 13h5') + P('M10 16h3'),
  scale: P('M4 20V9') + P('M10 20V5') + P('M16 20v-8') + P('M22 20V3') + P('M2 20h20'),
  routing: '<circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="12" r="2"/>' + P('M7 6h5a5 5 0 0 1 5 5v.5') + P('M7 18h5a5 5 0 0 0 5-5v-.5'),
  coverage: '<circle cx="12" cy="12" r="9"/>' + P('M3 12h18') + P('M12 3c2.6 2.7 4 5.7 4 9s-1.4 6.3-4 9c-2.6-2.7-4-5.7-4-9s1.4-6.3 4-9z'),
  people: '<circle cx="9" cy="8" r="3.2"/>' + P('M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5') + P('M16 5.6a3.2 3.2 0 0 1 0 5.8') + P('M17.5 14.8c2.1.6 3.5 2.3 3.5 4.6'),
  handshake: P('M3 12l3-3 4 4 2-2 4 4 3-3') + P('M3 12v3l5 4 4-3 4 3 5-4v-3'),
  clock: '<circle cx="12" cy="12" r="8.5"/>' + P('M12 7v5.2l3.4 2'),
  spark: P('M12 3l2.1 5.6L20 10l-5.2 2.6L13 19l-2.4-5.4L5 12l5.4-2z'),
};

const ALIASES = [
  [/ppc|performance marketing|paid|campaign|traffic|search/i, 'ppc'],
  [/web lead|form lead|lead generation|real-time lead/i, 'webleads'],
  [/inbound|call|phone|dial|ivr/i, 'inbound'],
  [/transfer|bridge|warm|connect/i, 'transfer'],
  [/intent|high-intent|consumer intent/i, 'intent'],
  [/real.?time|instant|speed|fast/i, 'realtime'],
  [/target|geograph|state|zip|footprint|vertical-specific|industry/i, 'targeting'],
  [/faster|accelerat|shorten|cycle/i, 'speed'],
  [/qualif|screen|filter|criteria|verified/i, 'qualified'],
  [/visib|report|track|attribution|measur|transparen/i, 'visibility'],
  [/complian|consent|tcpa|licen|regulat/i, 'compliance'],
  [/scale|volume|capacity|grow/i, 'scale'],
  [/rout|deliver|dispatch|queue/i, 'routing'],
  [/coverage|nationwide|national|map/i, 'coverage'],
  [/team|agent|expert|people|partner|client/i, 'people'],
  [/trust|relationship|account/i, 'handshake'],
  [/hour|schedule|time|availab/i, 'clock'],
];

/** Pick the glyph that fits a label, falling back to a neutral mark. */
export function iconFor(label = '') {
  for (const [re, key] of ALIASES) if (re.test(label)) return key;
  return 'spark';
}

/** Render one icon by key or by matching a label. */
export function icon(nameOrLabel, { size = 20, cls = '' } = {}) {
  const key = GLYPHS[nameOrLabel] ? nameOrLabel : iconFor(nameOrLabel);
  return `<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPHS[key]}</svg>`;
}

export const SERVICE_ICON = {
  'ppc-performance-marketing': 'ppc',
  'web-lead-generation': 'webleads',
  'inbound-calls': 'inbound',
  'live-transfers': 'transfer',
};
