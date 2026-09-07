/* ============================================================
   Altarious Global — component set A (C1–C10)
   Server-side renderers. Each returns a complete HTML string that
   is readable and usable with JavaScript disabled; comp-a.js
   progressively enhances the same markup in the browser.
   Styles: public/assets/css/comp-a.css
   Behaviour: public/assets/js/comp-a.js
   ============================================================ */

import { esc } from './util.mjs';

/* ---------- shared reference data ---------- */

const PRODUCTS = {
  'web-leads': { name: 'Web Leads', unit: 'Per lead', short: 'lead' },
  'inbound-calls': { name: 'Inbound Calls', unit: 'Per call', short: 'call' },
  'live-transfers': { name: 'Live Transfers', unit: 'Per transfer', short: 'transfer' }
};

const PRODUCT_ORDER = ['web-leads', 'inbound-calls', 'live-transfers'];

const STATES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
};

const LEVEL_LABELS = ['Not live', 'Limited', 'Active', 'High volume'];
const BIG_STATES = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI'];

/* Deterministic coverage level — the identical function lives in comp-a.js
   so a client-side product switch produces exactly the same grid. */
const LEVEL_FROM_NAME = { high: 3, active: 2, limited: 1, none: 0 };

/**
 * Coverage is a claim about where the business can actually deliver, so it is
 * read from CMS settings only. A state that has not been set is "not live" —
 * the component never guesses, and renders nothing at all until configured.
 */
function coverageLevel(ab, product, states) {
  const map = (states && states[product]) || {};
  const v = map[ab];
  if (typeof v === 'number') return v >= 0 && v <= 3 ? v : 0;
  return LEVEL_FROM_NAME[String(v || '').toLowerCase()] || 0;
}

/** True when at least one state has been marked live for either product. */
export function hasCoverage(states) {
  if (!states) return false;
  return Object.keys(states).some((prod) => {
    const m = states[prod];
    return m && typeof m === 'object' && Object.keys(m).some((k) => coverageLevel(k, prod, states) > 0);
  });
}

function productName(p) {
  return PRODUCTS[p] ? PRODUCTS[p].name : 'All products';
}

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

function money(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function attr(v) {
  return esc(v == null ? '' : String(v));
}

/* ============================================================
   C1 · anchorRail(items)  items: [{ id, label }]
   ============================================================ */
export function anchorRail(items) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return '';

  const links = list.map((it, i) => {
    const id = attr(it && it.id ? it.id : 'section-' + (i + 1));
    const label = esc(it && it.label ? it.label : 'Section ' + (i + 1));
    const on = i === 0;
    return (
      '<li class="ag-anchor__item">' +
        '<a class="ag-anchor__link' + (on ? ' is-active' : '') + '" href="#' + id + '"' +
          ' data-ag-target="' + id + '"' + (on ? ' aria-current="true"' : '') + '>' +
          '<span class="ag-anchor__num">' + pad2(i + 1) + '</span>' +
          '<span class="ag-anchor__label">' + label + '</span>' +
        '</a>' +
      '</li>'
    );
  }).join('');

  return (
    '<nav class="ag-anchor" data-ag-anchor aria-label="On this page">' +
      '<span class="ag-anchor__eyebrow">On this page</span>' +
      '<ul class="ag-anchor__list" role="list">' + links + '</ul>' +
      '<span class="ag-anchor__indicator" aria-hidden="true"></span>' +
    '</nav>'
  );
}

/* ============================================================
   C2 · coverageGrid(opts)  opts: { product }
   ============================================================ */
export function coverageGrid(opts) {
  const o = opts || {};
  /* Nothing configured means nothing claimed: the section is omitted entirely. */
  if (!hasCoverage(o.states)) return '';
  const initial = PRODUCTS[o.product] ? o.product : 'inbound-calls';
  const abbrs = Object.keys(STATES);

  function cellsFor(product) {
    let live = 0;
    const cells = abbrs.map((ab) => {
      const lv = coverageLevel(ab, product, o.states);
      if (lv > 0) live++;
      return (
        '<button type="button" class="ag-coverage__cell is-l' + lv + '"' +
          ' role="gridcell" data-ab="' + ab + '" data-level="' + lv + '"' +
          ' aria-label="' + esc(STATES[ab] + ': ' + LEVEL_LABELS[lv] + ', ' + productName(product)) + '">' +
          ab +
        '</button>'
      );
    }).join('');
    return { cells, live };
  }

  const built = cellsFor(initial);

  const tabs = ['inbound-calls', 'live-transfers'].map((p) => {
    const on = p === initial;
    return (
      '<button type="button" class="ag-coverage__tab' + (on ? ' is-on" aria-selected="true"' : '" aria-selected="false"') +
        ' role="tab" data-product="' + p + '">' + esc(PRODUCTS[p].name) + '</button>'
    );
  }).join('');

  const legend = [3, 2, 1, 0].map((lv) =>
    '<li><i class="ag-coverage__swatch is-l' + lv + '" aria-hidden="true"></i>' + esc(LEVEL_LABELS[lv]) + '</li>'
  ).join('');

  return (
    '<section class="ag-coverage" data-ag-coverage data-product="' + initial + '" aria-labelledby="ag-coverage-title">' +
      '<header class="ag-coverage__head">' +
        '<div>' +
          '<span class="ag-coverage__eyebrow">Coverage map</span>' +
          '<h3 class="ag-coverage__title" id="ag-coverage-title">Where we deliver</h3>' +
        '</div>' +
        '<div class="ag-coverage__toggle" role="tablist" aria-label="Product">' + tabs + '</div>' +
      '</header>' +
      '<div class="ag-coverage__grid" role="grid" aria-label="US state coverage">' + built.cells + '</div>' +
      '<footer class="ag-coverage__foot">' +
        '<ul class="ag-coverage__legend" role="list">' + legend + '</ul>' +
        '<span class="ag-coverage__count" aria-live="polite">' +
          built.live + ' / 50 states live &middot; ' + esc(productName(initial)) +
        '</span>' +
      '</footer>' +
      '<div class="ag-coverage__tip" role="status" hidden></div>' +
    '</section>'
  );
}

/* ============================================================
   C3 · productComparison(opts)  opts: { highlight }
   ============================================================ */
const COMPARE_ROWS = [
  { label: 'Cost model', cells: { 'web-leads': 'Per lead', 'inbound-calls': 'Per billable call', 'live-transfers': 'Per qualified transfer' } },
  { label: 'Consumer intent', meter: { 'web-leads': 50, 'inbound-calls': 78, 'live-transfers': 100 }, cells: { 'web-leads': 'Moderate', 'inbound-calls': 'High', 'live-transfers': 'Highest' } },
  { label: 'Speed to contact', cells: { 'web-leads': 'Minutes to hours', 'inbound-calls': 'Immediate', 'live-transfers': 'Already on the line' } },
  { label: 'Agent effort', cells: { 'web-leads': 'Outbound dialling', 'inbound-calls': 'Answer and qualify', 'live-transfers': 'Pre-screened, close' } },
  { label: 'Best-fit buyer', cells: { 'web-leads': 'Volume dialler teams', 'inbound-calls': 'Agencies & contractors', 'live-transfers': 'Carriers & law firms' } }
];

/* Map a CMS comparison row {attribute, webLeads, inboundCalls, liveTransfers}
   onto the internal shape. Rows missing an attribute label are dropped. */
function normaliseCompareRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((r) => {
      if (!r || typeof r !== 'object') return null;
      const label = String(r.attribute == null ? '' : r.attribute).trim();
      if (!label) return null;
      return {
        label,
        cells: {
          'web-leads': String(r.webLeads == null ? '' : r.webLeads),
          'inbound-calls': String(r.inboundCalls == null ? '' : r.inboundCalls),
          'live-transfers': String(r.liveTransfers == null ? '' : r.liveTransfers)
        }
      };
    })
    .filter(Boolean);
}

export function productComparison(opts) {
  const o = opts || {};
  const hot = PRODUCTS[o.highlight] ? o.highlight : null;

  /* CMS rows are the source of truth when the option is present. A present but
     empty source renders nothing rather than falling back to invented rows. */
  let rows = COMPARE_ROWS;
  if (o.rows != null) {
    rows = normaliseCompareRows(o.rows);
    if (!rows.length) return '';
  }

  const heads = PRODUCT_ORDER.map((p) =>
    '<th scope="col" data-col="' + p + '"' + (p === hot ? ' class="is-hot"' : '') + '>' + esc(PRODUCTS[p].name) + '</th>'
  ).join('');

  const body = rows.map((row) => {
    const tds = PRODUCT_ORDER.map((p) => {
      const meter = row.meter
        ? '<i class="ag-compare__meter" style="--ag-meter:' + row.meter[p] + '%" aria-hidden="true"></i>'
        : '';
      return (
        '<td data-col="' + p + '" data-label="' + attr(PRODUCTS[p].name) + '"' +
          (p === hot ? ' class="is-hot"' : '') + '>' + meter + esc(row.cells[p]) + '</td>'
      );
    }).join('');
    return '<tr><th scope="row">' + esc(row.label) + '</th>' + tds + '</tr>';
  }).join('');

  return (
    '<section class="ag-compare" data-ag-compare>' +
      '<header class="ag-compare__head">' +
        '<span class="ag-compare__eyebrow">Products compared</span>' +
        '<h3 class="ag-compare__title">Which delivery model fits</h3>' +
      '</header>' +
      '<div class="ag-compare__scroll">' +
        '<table class="ag-compare__table">' +
          '<caption class="ag-compare__sr">Web Leads, Inbound Calls and Live Transfers compared across ' +
            rows.length + ' attributes</caption>' +
          '<thead><tr><th scope="col" class="ag-compare__rowhead"><span class="ag-compare__sr">Attribute</span></th>' + heads + '</tr></thead>' +
          '<tbody>' + body + '</tbody>' +
        '</table>' +
      '</div>' +
    '</section>'
  );
}

/* ============================================================
   C4 · volumeCalculator(opts)
   opts: { vertical, subVertical, product, avgValue }
   ============================================================ */
const UNIT_PRICE = { 'web-leads': 9, 'inbound-calls': 38, 'live-transfers': 62 };

/* Slider bounds. CMS values win; anything missing or non-numeric falls back to
   the built-in range so the control always renders a usable slider. */
function rangeOf(src, fb) {
  const s = (src && typeof src === 'object') ? src : {};
  const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  let min = num(s.min, fb.min);
  let max = num(s.max, fb.max);
  if (max <= min) { min = fb.min; max = fb.max; }
  const def = Math.min(max, Math.max(min, num(s.default, fb.default)));
  return { min, max, default: def, step: fb.step };
}

const CALC_FALLBACK = {
  callsPerDay: { min: 5, max: 200, default: 40, step: 5 },
  closeRate: { min: 2, max: 40, default: 12, step: 1 },
  avgValue: { min: 200, max: 3000, default: 780, step: 20 }
};

export function volumeCalculator(opts) {
  const o = opts || {};
  const r = (o.ranges && typeof o.ranges === 'object') ? o.ranges : {};
  const volRange = rangeOf(r.callsPerDay, CALC_FALLBACK.callsPerDay);
  const closeRange = rangeOf(r.closeRate, CALC_FALLBACK.closeRate);
  const valueRange = rangeOf(r.avgValue, CALC_FALLBACK.avgValue);
  const disclaimer = o.disclaimer == null ? '' : String(o.disclaimer).trim();
  const product = PRODUCTS[o.product] ? o.product : 'inbound-calls';
  const price = UNIT_PRICE[product];
  const unit = PRODUCTS[product].short;
  const days = 22;

  const eyebrowParts = [];
  if (o.vertical) eyebrowParts.push(String(o.vertical));
  if (o.subVertical) eyebrowParts.push(String(o.subVertical));
  eyebrowParts.push(PRODUCTS[product].name);

  const avg = Math.min(valueRange.max, Math.max(valueRange.min,
    Math.round(Number(o.avgValue) || valueRange.default)));
  const volume = volRange.default;
  const close = closeRange.default;

  const monthly = volume * days;
  const cust = monthly * (close / 100);
  const spend = monthly * price;

  const unitPlural = unit === 'lead' ? 'leads' : unit === 'call' ? 'calls' : 'transfers';

  return (
    '<section class="ag-calc" data-ag-calc data-price="' + price + '" data-days="' + days + '"' +
      ' data-unit="' + attr(unitPlural) + '">' +
      '<header class="ag-calc__head">' +
        '<span class="ag-calc__eyebrow">' + esc(eyebrowParts.join(' · ')) + '</span>' +
        '<h3 class="ag-calc__title">Volume calculator</h3>' +
      '</header>' +
      '<div class="ag-calc__body">' +
        '<div class="ag-calc__controls">' +
          '<div class="ag-calc__field">' +
            '<label for="ag-calc-vol">' + esc(unitPlural.charAt(0).toUpperCase() + unitPlural.slice(1)) + ' per day ' +
              '<output id="ag-calc-vol-out" for="ag-calc-vol">' + volume + '</output></label>' +
            '<input id="ag-calc-vol" class="ag-calc__range" type="range" min="' + volRange.min + '" max="' + volRange.max +
              '" step="' + volRange.step + '" value="' + volume + '" data-ag-input="vol">' +
            '<div class="ag-calc__scale"><span>' + volRange.min + '</span><span>' + volRange.max + '</span></div>' +
          '</div>' +
          '<div class="ag-calc__field">' +
            '<label for="ag-calc-close">Close rate <output id="ag-calc-close-out" for="ag-calc-close">' + close + '%</output></label>' +
            '<input id="ag-calc-close" class="ag-calc__range" type="range" min="' + closeRange.min + '" max="' + closeRange.max +
              '" step="' + closeRange.step + '" value="' + close + '" data-ag-input="close">' +
            '<div class="ag-calc__scale"><span>' + closeRange.min + '%</span><span>' + closeRange.max + '%</span></div>' +
          '</div>' +
          '<div class="ag-calc__field">' +
            '<label for="ag-calc-value">Avg. policy value <output id="ag-calc-value-out" for="ag-calc-value">' + esc(money(avg)) + '</output></label>' +
            '<input id="ag-calc-value" class="ag-calc__range" type="range" min="' + valueRange.min + '" max="' + valueRange.max +
              '" step="' + valueRange.step + '" value="' + avg + '" data-ag-input="value">' +
            '<div class="ag-calc__scale"><span>' + esc(money(valueRange.min)) + '</span><span>' + esc(money(valueRange.max)) + '</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="ag-calc__out" aria-live="polite">' +
          '<div class="ag-calc__stat"><span class="ag-calc__k">Monthly customers</span>' +
            '<strong class="ag-calc__v" data-ag-out="cust">' + esc(Math.round(cust).toLocaleString('en-US')) + '</strong></div>' +
          '<div class="ag-calc__stat"><span class="ag-calc__k">Cost per acquisition</span>' +
            '<strong class="ag-calc__v is-accent" data-ag-out="cpa">' + esc(money(cust > 0 ? spend / cust : 0)) + '</strong></div>' +
          '<div class="ag-calc__stat"><span class="ag-calc__k">Monthly revenue</span>' +
            '<strong class="ag-calc__v" data-ag-out="rev">' + esc(money(cust * avg)) + '</strong></div>' +
          '<p class="ag-calc__note">Modelled at <span>' + esc(money(price)) + '</span> per billable ' + esc(unit) +
            ', ' + days + ' working days.</p>' +
          (disclaimer ? '<p class="ag-calc__note is-disclaimer">' + esc(disclaimer) + '</p>' : '') +
        '</div>' +
      '</div>' +
    '</section>'
  );
}

/* ============================================================
   C5 · criteriaBuilder(sv)  sv: { name, qualificationCriteria[] }
   ============================================================ */
const CRITERIA_FACTORS = [0.72, 0.55, 0.68, 0.63, 0.8, 0.75, 0.7];
const BASE_VOLUME = 1850;

function labelsOf(list) {
  return (Array.isArray(list) ? list : [])
    .map((c) => (c && typeof c === 'object' ? (c.label || c.name || c.text || '') : c))
    .map((c) => String(c == null ? '' : c).trim())
    .filter(Boolean);
}

export function criteriaBuilder(sv, opts) {
  const rec = sv || {};
  const o = opts || {};
  const name = rec.name ? String(rec.name) : 'This sub-vertical';
  const own = labelsOf(rec.qualificationCriteria);

  /* CMS chips lead, the record's own criteria are appended after them. */
  let criteria;
  if (o.chips != null) {
    const seen = new Set();
    criteria = labelsOf(o.chips).concat(own)
      .filter((c) => {
        const k = c.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 10);
  } else {
    criteria = own.slice(0, 7);
  }

  if (!criteria.length) return '';

  const chips = criteria.map((label, i) =>
    '<button type="button" class="ag-criteria__chip" data-ag-chip="' + i + '"' +
      ' data-factor="' + CRITERIA_FACTORS[i % CRITERIA_FACTORS.length] + '"' +
      ' data-phrase="' + attr(label.charAt(0).toLowerCase() + label.slice(1)) + '"' +
      ' aria-pressed="false">' + esc(label) + '</button>'
  ).join('');

  return (
    '<section class="ag-criteria" data-ag-criteria data-base="' + BASE_VOLUME + '">' +
      '<header class="ag-criteria__head">' +
        '<span class="ag-criteria__eyebrow">' + esc(name) + '</span>' +
        '<h3 class="ag-criteria__title">Build your qualification filter</h3>' +
      '</header>' +
      '<div class="ag-criteria__chips" role="group" aria-label="Qualification criteria">' + chips + '</div>' +
      '<div class="ag-criteria__panel">' +
        '<span class="ag-criteria__k">Your filter</span>' +
        '<p class="ag-criteria__sentence" aria-live="polite">Send us <b>every consumer</b> in your licensed states.</p>' +
        '<div class="ag-criteria__meter">' +
          '<div class="ag-criteria__bar"><span class="ag-criteria__fill" style="width:100%"></span></div>' +
          '<div class="ag-criteria__nums">' +
            '<strong class="ag-criteria__vol">' + BASE_VOLUME.toLocaleString('en-US') + '</strong>' +
            '<span class="ag-criteria__unit">est. delivered / month</span>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="ag-criteria__reset">Clear all</button>' +
      '</div>' +
    '</section>'
  );
}

/* ============================================================
   C6 · onboardingTimeline()
   ============================================================ */
const TIMELINE = [
  { day: 'Day 1', label: 'Scoping', title: 'Scoping call', owner: 'Account lead',
    body: 'Thirty minutes on your vertical, licensed states, daily capacity and buying hours. We agree the sub-vertical — Auto Insurance, Medicare, HVAC — and the product mix.' },
  { day: 'Day 2', label: 'Criteria', title: 'Criteria & compliance', owner: 'Compliance',
    body: 'We lock qualification rules, disclosure language and TCPA posture, then set the buffer and billable duration thresholds in writing.' },
  { day: 'Day 3', label: 'Routing', title: 'Routing build', owner: 'Delivery engineering',
    body: 'Tracking numbers provisioned per state and per campaign, IVR screening scripted, and your CRM or dialler wired up for post-call delivery.' },
  { day: 'Day 4', label: 'Test calls', title: 'Test calls', owner: 'Both teams',
    body: 'Live end-to-end tests through your queue during real buying hours. We check audio, hold time, transfer handoff and billing records together.' },
  { day: 'Day 5', label: 'Go live', title: 'First live call', owner: 'Account lead',
    body: 'Campaigns switch on at a capped daily volume. Daily reporting from call one, with pacing reviewed at the end of week one.' }
];

/* CMS step: { day, title, text }. The short tab label is the title itself and
   the owner line is only shown when the source supplies one. */
function normaliseSteps(steps) {
  return (Array.isArray(steps) ? steps : [])
    .map((s) => {
      if (!s || typeof s !== 'object') return null;
      const title = String(s.title == null ? '' : s.title).trim();
      const body = String(s.text == null ? '' : s.text).trim();
      if (!title && !body) return null;
      return {
        day: String(s.day == null ? '' : s.day).trim(),
        label: String(s.label == null ? title : s.label).trim(),
        title: title || String(s.day || ''),
        body,
        owner: String(s.owner == null ? '' : s.owner).trim()
      };
    })
    .filter(Boolean);
}

export function onboardingTimeline(opts) {
  const o = opts || {};

  let TIMELINE_ROWS = TIMELINE;
  if (o.steps != null) {
    TIMELINE_ROWS = normaliseSteps(o.steps);
    if (!TIMELINE_ROWS.length) return '';
  }

  const tabs = TIMELINE_ROWS.map((s, i) => {
    const on = i === 0;
    return (
      '<button type="button" class="ag-timeline__day' + (on ? ' is-on' : '') + '" role="tab"' +
        ' id="ag-timeline-t' + i + '" aria-controls="ag-timeline-p' + i + '"' +
        ' aria-selected="' + (on ? 'true' : 'false') + '"' + (on ? '' : ' tabindex="-1"') + ' data-i="' + i + '">' +
        '<span class="ag-timeline__dot" aria-hidden="true"></span>' +
        '<span class="ag-timeline__d">' + esc(s.day) + '</span>' +
        '<span class="ag-timeline__l">' + esc(s.label) + '</span>' +
      '</button>'
    );
  }).join('');

  const panels = TIMELINE_ROWS.map((s, i) =>
    '<div class="ag-timeline__panel' + (i === 0 ? ' is-on' : '') + '" id="ag-timeline-p' + i + '"' +
      ' role="tabpanel" aria-labelledby="ag-timeline-t' + i + '"' + (i === 0 ? '' : ' hidden') + '>' +
      '<h4>' + esc(s.title) + '</h4>' +
      '<p>' + esc(s.body) + '</p>' +
      (s.owner ? '<span class="ag-timeline__owner">Owner: ' + esc(s.owner) + '</span>' : '') +
    '</div>'
  ).join('');

  return (
    '<section class="ag-timeline" data-ag-timeline>' +
      '<header class="ag-timeline__head">' +
        '<span class="ag-timeline__eyebrow">Onboarding</span>' +
        '<h3 class="ag-timeline__title">Scoping call to first live call in five days</h3>' +
      '</header>' +
      '<div class="ag-timeline__track" role="tablist" aria-label="Onboarding days">' +
        '<div class="ag-timeline__line" aria-hidden="true"><span class="ag-timeline__line-fill"></span></div>' +
        tabs +
      '</div>' +
      '<div class="ag-timeline__panels">' + panels + '</div>' +
    '</section>'
  );
}

/* ============================================================
   C7 · buyerMarquee(items)  items: string[]
   ============================================================ */
export function buyerMarquee(items) {
  const list = (Array.isArray(items) ? items : [])
    .map((s) => String(s == null ? '' : s).trim())
    .filter(Boolean);
  if (!list.length) return '';

  const set = (hidden) =>
    '<ul class="ag-marquee__set" ' + (hidden ? 'aria-hidden="true"' : 'role="list"') + '>' +
      list.map((s) => '<li><i aria-hidden="true"></i><b>' + esc(s) + '</b></li>').join('') +
    '</ul>';

  return (
    '<section class="ag-marquee" data-ag-marquee>' +
      '<header class="ag-marquee__head">' +
        '<span class="ag-marquee__eyebrow">Who we deliver to</span>' +
        '<h3 class="ag-marquee__title">Buyers on the network</h3>' +
      '</header>' +
      '<div class="ag-marquee__viewport" tabindex="0" role="group"' +
        ' aria-label="Buyer types, scrolling. Hover or focus to pause.">' +
        '<div class="ag-marquee__belt">' + set(false) + set(true) + '</div>' +
        '<span class="ag-marquee__fade is-l" aria-hidden="true"></span>' +
        '<span class="ag-marquee__fade is-r" aria-hidden="true"></span>' +
      '</div>' +
      '<p class="ag-marquee__note">Paused on hover or keyboard focus.</p>' +
    '</section>'
  );
}

/* ============================================================
   C8 · faqSearch(faq)  faq: [{ q, a }]
   ============================================================ */
export function faqSearch(faq) {
  const list = (Array.isArray(faq) ? faq : [])
    .filter((f) => f && (f.q || f.question))
    .map((f) => ({ q: String(f.q || f.question), a: String(f.a || f.answer || '') }));
  if (!list.length) return '';

  const items = list.map((f, i) =>
    '<div class="ag-faq__item" role="listitem" data-q="' + attr(f.q.toLowerCase()) + '"' +
      ' data-a="' + attr(f.a.toLowerCase()) + '">' +
      '<h3 class="ag-faq__qwrap">' +
        '<button type="button" class="ag-faq__q" aria-expanded="false" aria-controls="ag-faq-a' + i + '">' +
          '<span class="ag-faq__chev" aria-hidden="true"></span>' +
          '<span class="ag-faq__qt">' + esc(f.q) + '</span>' +
        '</button>' +
      '</h3>' +
      '<div class="ag-faq__a" id="ag-faq-a' + i + '" hidden><p>' + esc(f.a) + '</p></div>' +
    '</div>'
  ).join('');

  return (
    '<section class="ag-faq" data-ag-faq>' +
      '<header class="ag-faq__head">' +
        '<div>' +
          '<span class="ag-faq__eyebrow">Knowledge</span>' +
          '<h2 class="ag-faq__title">Frequently asked</h2>' +
        '</div>' +
        '<div class="ag-faq__search" hidden data-ag-faq-search>' +
          '<svg class="ag-faq__ico" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
            '<circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.5"></circle>' +
            '<path d="M10.4 10.4 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>' +
          '</svg>' +
          '<label class="ag-faq__sr" for="ag-faq-q">Search questions</label>' +
          '<input id="ag-faq-q" class="ag-faq__input" type="search" autocomplete="off"' +
            ' placeholder="Search: transfers, TCPA, billing&hellip;">' +
        '</div>' +
      '</header>' +
      '<div class="ag-faq__list" role="list">' + items + '</div>' +
      '<p class="ag-faq__empty" hidden>No questions match <b></b>. Try ' +
        '<button type="button" class="ag-faq__sugg">live transfer</button> or ' +
        '<button type="button" class="ag-faq__sugg">billing</button>.</p>' +
      '<p class="ag-faq__count" aria-live="polite" hidden></p>' +
    '</section>'
  );
}

/* ============================================================
   C9 · commercialModels(opts)  opts: { recommend }
   ============================================================ */
const MODELS = [
  {
    key: 'web-leads', price: 'from $9 / lead',
    how: 'Consumers complete a form on a compliant landing page. The record posts to your CRM in real time with consent, timestamp and source.',
    best: 'Dialler teams with spare outbound capacity who want the lowest entry cost per record and can work volume quickly.',
    meta: 'Personal Loans · Debt Relief · Legal'
  },
  {
    key: 'inbound-calls', price: 'from $28 / call',
    how: 'Paid search sends the consumer straight to your queue after an IVR screen. Billing starts once the call passes the agreed buffer.',
    best: 'Independent agencies and contractors with agents on the phones during set hours who want intent without the dial time.',
    meta: 'Auto Insurance · HVAC · Pest Control'
  },
  {
    key: 'live-transfers', price: 'from $62 / transfer',
    how: 'Our agent screens against your criteria, then warm-transfers the consumer and introduces them before dropping off the line.',
    best: 'Carriers, law firms and lenders where agent time is expensive and only fully qualified conversations are worth taking.',
    meta: 'Medicare · Final Expense · Legal'
  }
];

/* CMS model: { id, name, how, bestFor }. Price and meta lines only appear when
   the source actually carries them — the component never invents a price. */
function normaliseModels(models) {
  return (Array.isArray(models) ? models : [])
    .map((m) => {
      if (!m || typeof m !== 'object') return null;
      const key = String(m.id == null ? '' : m.id).trim();
      const name = String(m.name == null ? '' : m.name).trim() ||
        (PRODUCTS[key] ? PRODUCTS[key].name : '');
      if (!name) return null;
      return {
        key,
        name,
        unit: String(m.unit == null ? (PRODUCTS[key] ? PRODUCTS[key].unit : '') : m.unit).trim(),
        price: String(m.price == null ? '' : m.price).trim(),
        how: String(m.how == null ? '' : m.how).trim(),
        best: String(m.bestFor == null ? (m.best == null ? '' : m.best) : m.bestFor).trim(),
        meta: String(m.meta == null ? '' : m.meta).trim()
      };
    })
    .filter(Boolean);
}

export function commercialModels(opts) {
  const o = opts || {};

  let list = MODELS.map((m) => ({
    key: m.key, name: PRODUCTS[m.key].name, unit: PRODUCTS[m.key].unit,
    price: m.price, how: m.how, best: m.best, meta: m.meta
  }));
  if (o.models != null) {
    list = normaliseModels(o.models);
    if (!list.length) return '';
  }

  /* `recommended` (CMS) takes precedence over the legacy `recommend` option. */
  const wanted = String((o.recommended != null ? o.recommended : o.recommend) || '').trim();
  const rec = list.some((m) => m.key === wanted) ? wanted : null;

  const cards = list.map((m) => {
    const on = !!rec && m.key === rec;
    return (
      '<article class="ag-models__card' + (on ? ' is-rec' : '') + '">' +
        (on ? '<span class="ag-models__badge">Recommended</span>' : '') +
        (m.unit ? '<span class="ag-models__unit">' + esc(m.unit) + '</span>' : '') +
        '<h4 class="ag-models__name">' + esc(m.name) + '</h4>' +
        (m.price ? '<span class="ag-models__price">' + esc(m.price) + '</span>' : '') +
        '<p class="ag-models__body" data-how="' + attr(m.how) + '" data-best="' + attr(m.best) + '">' +
          esc(m.how) + '</p>' +
        (m.meta ? '<span class="ag-models__meta">' + esc(m.meta) + '</span>' : '') +
      '</article>'
    );
  }).join('');

  return (
    '<section class="ag-models" data-ag-models>' +
      '<header class="ag-models__head">' +
        '<div>' +
          '<span class="ag-models__eyebrow">Commercial models</span>' +
          '<h3 class="ag-models__title">Pay for what you actually get</h3>' +
        '</div>' +
        '<div class="ag-models__toggle" role="tablist" aria-label="Card detail mode" hidden data-ag-models-toggle>' +
          '<button type="button" class="ag-models__tab is-on" role="tab" aria-selected="true" data-mode="how">How it works</button>' +
          '<button type="button" class="ag-models__tab" role="tab" aria-selected="false" data-mode="best">Best for</button>' +
        '</div>' +
      '</header>' +
      '<div class="ag-models__cards">' + cards + '</div>' +
    '</section>'
  );
}

/* ============================================================
   C10 · stickyEnquiryBar(opts)  opts: { label, href, product }
   ============================================================ */
export function stickyEnquiryBar(opts) {
  const o = opts || {};
  const label = esc(o.label ? String(o.label) : 'Enquire');
  const href = o.href ? attr(o.href) : '#inquiry';
  const product = o.product && PRODUCTS[o.product] ? PRODUCTS[o.product].name : (o.product ? String(o.product) : '');

  const tag = product
    ? '<span class="ag-enquirybar__tag">' + esc(product) + '</span>'
    : '';

  return (
    '<div class="ag-enquirybar" data-ag-enquirybar data-threshold="0.4">' +
      '<div class="ag-enquirybar__inner">' +
        tag +
        '<span class="ag-enquirybar__copy">Ready for volume in your states?</span>' +
        '<span class="ag-enquirybar__actions">' +
          '<a class="ag-enquirybar__cta" href="' + href + '">' + label + '</a>' +
          '<button type="button" class="ag-enquirybar__x" aria-label="Dismiss enquiry bar" hidden data-ag-dismiss>' +
            '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">' +
              '<path d="M2 2 10 10M10 2 2 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path>' +
            '</svg>' +
          '</button>' +
        '</span>' +
      '</div>' +
    '</div>'
  );
}
