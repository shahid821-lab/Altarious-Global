/* ============================================================
   Altarious Global — component batch B (C11–C20)
   Server-side renderers. Each returns an HTML string.
   Pairs with public/assets/css/comp-b.css and
   public/assets/js/comp-b.js.
   ============================================================ */

import { esc } from './util.mjs';

const PRODUCTS = [
  'PPC / Performance Marketing',
  'Web Lead Generation',
  'Inbound Calls',
  'Live Transfers',
  'Multiple / Not sure',
];

const TYPE_LABEL = {
  'inbound-calls': 'Inbound Calls',
  'live-transfers': 'Live Transfers',
  'web-leads': 'Web Lead Generation',
  'ppc': 'PPC / Performance Marketing',
};

function attr(v) {
  return esc(v == null ? '' : String(v));
}

/* ------------------------------------------------------------
   C11 — multi-step enquiry
   Posts the SAME payload to the SAME endpoint as inquiryForm().
   Renders as a complete, ordinary form: with JS disabled every
   step is visible and the native submit still posts the form.
   ------------------------------------------------------------ */
export function multiStepEnquiry(ctx, meta = {}, opts = {}) {
  const { site, verticals = [], subVerticals = [] } = ctx || {};
  const vOpts = verticals
    .filter((v) => v.active !== false)
    .map((v) => `<option value="${attr(v.name)}"${meta.verticalName === v.name ? ' selected' : ''}>${esc(v.name)}</option>`)
    .join('');
  const svOpts = subVerticals
    .filter((s) => s.active !== false)
    .map((s) => {
      const vName = (verticals.find((v) => v.slug === s.vertical) || {}).name || '';
      return `<option value="${attr(s.name)}" data-vertical="${attr(vName)}"${meta.subVerticalName === s.name ? ' selected' : ''}>${esc(s.name)}</option>`;
    })
    .join('');
  const selectedProduct = meta.productName ? TYPE_LABEL[meta.productName] || meta.productName : '';
  const svcOpts = PRODUCTS.map((p) => `<option${selectedProduct === p ? ' selected' : ''}>${esc(p)}</option>`).join('');

  const steps = ['About you', 'What you need', 'Your brief'];
  const stepList = steps
    .map((s, i) => `<li class="ag-steps-step${i === 0 ? ' is-on' : ''}" data-ag-step="${i}"><span class="ag-steps-dot">${i + 1}</span><span class="ag-steps-lbl">${esc(s)}</span></li>`)
    .join('');

  const consent = site && site.name
    ? `By submitting, you agree to be contacted by ${esc(site.name)} about your enquiry. We do not sell your information.`
    : 'By submitting, you agree to be contacted about your enquiry. We do not sell your information.';

  return `<div class="ag-steps" data-ag-steps>
  <form class="ag-steps-form" method="post" action="/api/inquiries" novalidate>
    <div class="ag-steps-head">
      <p class="ag-steps-eyebrow">${esc(opts.eyebrow || 'Enquiry')}</p>
      <ol class="ag-steps-list" aria-label="Progress">${stepList}</ol>
      <div class="ag-steps-bar" aria-hidden="true"><i style="width:33.3333%"></i></div>
    </div>

    <input type="hidden" name="source_page" value="${attr(meta.sourcePage)}">
    <input type="hidden" name="source_url" value="${attr(meta.sourceUrl)}">
    <input type="hidden" name="vertical" value="${attr(meta.vertical)}">
    <input type="hidden" name="sub_vertical" value="${attr(meta.subVertical)}">
    <input type="hidden" name="product" value="${attr(meta.product)}">
    <input type="hidden" name="page_title" value="${attr(meta.pageTitle)}">
    <input type="hidden" name="started_at" value="">
    <div class="ag-steps-hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>

    <div class="ag-steps-panes">
      <fieldset class="ag-steps-pane is-on" data-ag-pane="0">
        <legend class="ag-steps-sr">About you</legend>
        <div class="ag-steps-grid">
          <label class="ag-steps-f">Full name <span aria-hidden="true">*</span>
            <input name="full_name" required autocomplete="name" maxlength="120" placeholder="Jane Cooper">
            <em class="ag-steps-err" aria-live="polite"></em></label>
          <label class="ag-steps-f">Company name <span aria-hidden="true">*</span>
            <input name="company" required autocomplete="organization" maxlength="160" placeholder="Acme Insurance Group">
            <em class="ag-steps-err" aria-live="polite"></em></label>
          <label class="ag-steps-f">Business email <span aria-hidden="true">*</span>
            <input type="email" name="email" required autocomplete="email" maxlength="200" placeholder="jane@company.com">
            <em class="ag-steps-err" aria-live="polite"></em></label>
          <label class="ag-steps-f">Phone number <span aria-hidden="true">*</span>
            <input type="tel" name="phone" required autocomplete="tel" maxlength="40" placeholder="(555) 000-0000">
            <em class="ag-steps-err" aria-live="polite"></em></label>
        </div>
      </fieldset>

      <fieldset class="ag-steps-pane" data-ag-pane="1">
        <legend class="ag-steps-sr">What you need</legend>
        <div class="ag-steps-grid">
          <label class="ag-steps-f ag-steps-full">Service / product of interest <span aria-hidden="true">*</span>
            <select name="service_interest" required><option value="">Select…</option>${svcOpts}</select>
            <em class="ag-steps-err" aria-live="polite"></em></label>
          <label class="ag-steps-f">Vertical of interest <span aria-hidden="true">*</span>
            <select name="vertical_interest" required><option value="">Select…</option>${vOpts}<option value="Other">Other / Multiple</option></select>
            <em class="ag-steps-err" aria-live="polite"></em></label>
          <label class="ag-steps-f">Sub-vertical (optional)
            <select name="sub_vertical_interest"><option value="">Select…</option>${svOpts}</select>
            <em class="ag-steps-err" aria-live="polite"></em></label>
        </div>
      </fieldset>

      <fieldset class="ag-steps-pane" data-ag-pane="2">
        <legend class="ag-steps-sr">Your brief</legend>
        <div class="ag-steps-grid">
          <label class="ag-steps-f ag-steps-full">Message <span aria-hidden="true">*</span>
            <textarea name="message" rows="5" required maxlength="4000" placeholder="Tell us about your business, geography, qualification criteria and volume targets."></textarea>
            <em class="ag-steps-err" aria-live="polite"></em></label>
        </div>
        <p class="ag-steps-consent">${consent}</p>
      </fieldset>
    </div>

    <div class="ag-steps-foot">
      <button type="button" class="ag-steps-btn ag-steps-ghost" data-ag-back disabled>Back</button>
      <button type="button" class="ag-steps-btn" data-ag-next>Next</button>
      <button type="submit" class="ag-steps-btn ag-steps-submit">${esc(opts.button || (site && site.ctas && site.ctas.primary) || 'Send enquiry')}</button>
    </div>
    <p class="ag-steps-status" role="status" aria-live="polite"></p>
  </form>

  <div class="ag-steps-done" data-ag-done hidden>
    <span class="ag-steps-tick" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M4 12.5 9.5 18 20 6.5"/></svg>
    </span>
    <h3>Enquiry received</h3>
    <p class="ag-steps-sum"></p>
  </div>
</div>`;
}

/* ------------------------------------------------------------
   C12 — call widget
   ------------------------------------------------------------ */
export function callWidget(site = {}, opts = {}) {
  const contact = site.contact || {};
  const phone = contact.phone || '';
  const email = contact.email || '';
  const telHref = 'tel:' + String(phone).replace(/[^\d+]/g, '');
  const compact = opts.compact ? ' is-compact' : '';

  const hours = [
    ['Mon–Fri', '08:00 – 20:00', '1 2 3 4 5'],
    ['Saturday', '09:00 – 15:00', '6'],
    ['Sunday', 'Closed', '0'],
  ]
    .map(([d, h, k]) => `<tr data-ag-day="${attr(k)}"><th scope="row">${esc(d)}</th><td${h === 'Closed' ? ' class="is-off"' : ''}>${esc(h)}</td></tr>`)
    .join('');

  return `<div class="ag-call${compact}" data-ag-call>
  <div class="ag-call-main">
    <p class="ag-call-eyebrow">Talk to the buyer desk</p>
    ${phone ? `<a class="ag-call-tel" href="${attr(telHref)}">
      <span class="ag-call-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5L16 12l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 5.2 2 2 0 0 1 5.5 3z"/></svg></span>
      <span class="ag-call-num">${esc(phone)}</span>
    </a>` : ''}
    <p class="ag-call-note">Inbound calls &amp; live transfers · US &amp; CA coverage</p>
    <p class="ag-call-row">
      <span class="ag-call-pill" data-ag-pill><i aria-hidden="true"></i><b>Operating hours below</b></span>
      ${email ? `<a class="ag-call-mail" href="mailto:${attr(email)}">${esc(email)}</a>` : ''}
    </p>
  </div>
  <div class="ag-call-side">
    <div class="ag-call-clocks">
      <div class="ag-call-clk"><span class="ag-call-k">Your time</span><b class="ag-call-t" data-ag-you>--:--</b><span class="ag-call-z" data-ag-youz>Local time</span></div>
      <div class="ag-call-clk"><span class="ag-call-k">Our desk</span><b class="ag-call-t" data-ag-us>--:--</b><span class="ag-call-z">America/New_York</span></div>
    </div>
    <table class="ag-call-hours">
      <caption class="ag-call-sr">Operating hours, Eastern Time</caption>
      <tbody>${hours}</tbody>
    </table>
  </div>
</div>`;
}

/* ------------------------------------------------------------
   C13 — key takeaways
   ------------------------------------------------------------ */
export function keyTakeaways(points = [], why = '') {
  const items = (points || [])
    .slice(0, 3)
    .map((p, i) => `<li><span class="ag-takeaways-n">${String(i + 1).padStart(2, '0')}</span><p>${esc(p)}</p></li>`)
    .join('');
  if (!items) return '';
  return `<aside class="ag-takeaways" data-ag-takeaways aria-labelledby="ag-takeaways-h">
  <div class="ag-takeaways-top">
    <div class="ag-takeaways-ttl">
      <span class="ag-takeaways-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 5h14M5 10h9M5 15h12M5 20h7"/></svg></span>
      <h3 id="ag-takeaways-h">Key takeaways</h3>
    </div>
    <button type="button" class="ag-takeaways-copy" data-ag-copy>
      <span class="ag-takeaways-ci" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 5.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 5.5 16"/></svg></span>
      <span class="ag-takeaways-ct">Copy summary</span>
    </button>
  </div>
  <ul class="ag-takeaways-pts">${items}</ul>
  ${why ? `<p class="ag-takeaways-why"><span class="ag-takeaways-wl">Why this matters</span>${esc(why)}</p>` : ''}
</aside>`;
}

/* ------------------------------------------------------------
   C14 — related rail
   ------------------------------------------------------------ */
export function relatedRail(cardsHtml = [], opts = {}) {
  const cards = (cardsHtml || []).filter(Boolean);
  if (!cards.length) return '';
  const items = cards.map((c) => `<li class="ag-rail-item">${c}</li>`).join('');
  return `<section class="ag-rail" data-ag-rail>
  <div class="ag-rail-hd">
    <div>
      <p class="ag-rail-eyebrow">Keep reading</p>
      <h2 class="ag-rail-title">${esc(opts.title || 'Related from the desk')}</h2>
    </div>
    <div class="ag-rail-nav">
      ${opts.moreHref ? `<a class="ag-rail-more" href="${attr(opts.moreHref)}">View all</a>` : ''}
      <button type="button" class="ag-rail-ar" data-ag-prev aria-label="Scroll to previous items"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg></button>
      <button type="button" class="ag-rail-ar" data-ag-next aria-label="Scroll to next items"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>
    </div>
  </div>
  <ul class="ag-rail-track" tabindex="0" role="list" aria-label="${attr(opts.title || 'Related items')}">${items}</ul>
  <p class="ag-rail-prog"><span class="ag-rail-line"><i></i></span><span class="ag-rail-cnt"><b>1</b> / ${cards.length}</span></p>
</section>`;
}

/* ------------------------------------------------------------
   C15 — glossary payload for in-prose term tooltips
   The browser module scans .prose for these terms.
   ------------------------------------------------------------ */
const GLOSSARY = [
  { term: 'IVR', kind: 'Routing', title: 'IVR — Interactive Voice Response', def: 'The automated menu that greets a caller and routes them by state, product and eligibility before a human is engaged. Good IVR design is the difference between a 20-second and a 90-second handling cost.' },
  { term: 'TCPA', kind: 'Compliance', title: 'TCPA', def: 'The US Telephone Consumer Protection Act. It governs how a consumer must consent to be contacted. One-to-one written consent, captured and stored, is what makes a lead legally sellable.' },
  { term: 'warm bridge', kind: 'Live Transfers', title: 'Warm bridge', def: 'The screener stays on the line and introduces the qualified caller to the buying agent before dropping off, instead of blind-transferring. It lifts acceptance rates and cuts billbacks.' },
  { term: 'ASR', kind: 'Quality', title: 'ASR — Automatic Speech Recognition', def: 'Machine transcription of the call, used to score qualification criteria, verify consent language and flag disputed transfers without anyone re-listening to the audio.' },
  { term: 'ping tree', kind: 'Distribution', title: 'Ping tree', def: 'A bid waterfall that offers a web lead to buyers in priority order in real time, selling it to the first buyer whose filters match and whose bid clears the floor.' },
  { term: 'speed to lead', kind: 'Operations', title: 'Speed to lead', def: 'Elapsed time between a consumer submitting a form and a human making contact. Contact rates decay sharply minute by minute, so speed to lead is usually the single largest conversion lever.' },
  { term: 'billback', kind: 'Quality', title: 'Billback', def: 'A credit issued to the buyer when a delivered call or transfer fails the agreed qualification criteria. Billback rate is the cleanest single measure of programme quality.' },
  { term: 'CPA', kind: 'Economics', title: 'CPA — Cost per acquisition', def: 'The blended media and delivery cost of one acquired customer, as distinct from cost per call or cost per lead, which measure only the top of the funnel.' },
  { term: 'AEP', kind: 'Insurance', title: 'AEP — Annual Enrolment Period', def: 'The 15 October to 7 December window in which Medicare beneficiaries may change plans. It concentrates the majority of annual Medicare acquisition volume into eight weeks.' },
  { term: 'DNC', kind: 'Compliance', title: 'DNC — Do Not Call', def: 'The federal and state registries of consumers who have opted out of telemarketing. Scrubbing against DNC before outbound contact is a legal requirement, not a courtesy.' },
];

export function termTooltips(opts = {}) {
  const o = opts || {};

  /* CMS terms are { term, definition }. When the option is supplied it is the
     only source: an empty list emits no payload rather than the built-in one. */
  let payload;
  if (o.terms != null) {
    const terms = (Array.isArray(o.terms) ? o.terms : [])
      .map((g) => {
        if (!g || typeof g !== 'object') return null;
        const term = String(g.term == null ? '' : g.term).trim();
        const def = String(g.definition == null ? (g.def == null ? '' : g.def) : g.definition).trim();
        if (!term || !def) return null;
        return { t: term, k: String(g.kind == null ? '' : g.kind).trim(), h: String(g.title || term).trim(), d: def };
      })
      .filter(Boolean);
    if (!terms.length) return '';
    payload = terms;
  } else {
    payload = GLOSSARY.map((g) => ({ t: g.term, k: g.kind, h: g.title, d: g.def }));
  }

  const json = JSON.stringify(payload).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return `<script type="application/json" class="ag-term-data" data-ag-term-data>${json}</script>`;
}

/* ------------------------------------------------------------
   C16 — sub-vertical fact strip
   ------------------------------------------------------------ */
export function factStrip(sv = {}, opts = {}) {
  const signals = Array.isArray(sv.intentSignals) ? sv.intentSignals.length : 0;
  const checks = Array.isArray(sv.qualificationCriteria) ? sv.qualificationCriteria.length : 0;
  const keywords = Array.isArray(sv.keywords) ? sv.keywords.length : 0;
  const products = [];
  if (sv.inboundCallsAngle) products.push('Inbound Calls');
  if (sv.liveTransfersAngle) products.push('Live Transfers');
  if (!products.length) products.push('Web Leads');

  const facts = [
    { k: 'Vertical', v: opts.vertical || sv.vertical || '—', s: 'Programme family' },
    { k: 'Delivery', v: products.join(' · '), s: 'Available products' },
    { k: 'Qualification', v: checks ? String(checks) + ' checks' : 'Custom', s: 'Screened before delivery' },
    { k: 'Intent signals', v: signals ? String(signals) : '—', s: keywords ? keywords + ' tracked keywords' : 'Tracked in campaign' },
  ]
    .map((f) => `<div class="ag-facts-item"><dt>${esc(f.k)}</dt><dd class="ag-facts-v">${esc(f.v)}</dd><dd class="ag-facts-sub">${esc(f.s)}</dd></div>`)
    .join('');

  return `<div class="ag-facts" data-ag-facts>
  <div class="ag-facts-hd">
    <p class="ag-facts-eyebrow">Vertical intelligence</p>
    <h3 class="ag-facts-name">${esc(sv.name || '')}</h3>
  </div>
  <dl class="ag-facts-strip">${facts}</dl>
  <p class="ag-facts-ft"><span class="ag-facts-dot" aria-hidden="true"></span>${esc(sv.shortDescription || '')}</p>
</div>`;
}

/* ------------------------------------------------------------
   C18 — metric ribbon
   ------------------------------------------------------------ */
export function metricRibbon(items = []) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return '';
  const cells = list
    .map((m) => {
      const value = m.value == null ? '' : String(m.value);
      const suffix = m.suffix == null ? '' : String(m.suffix);
      const bar = Math.max(0, Math.min(1, Number(m.bar) || 0));
      return `<li class="ag-ribbon-m" data-ag-to="${attr(value)}" data-ag-suffix="${attr(suffix)}" data-ag-bar="${(bar * 100).toFixed(2)}">
      <span class="ag-ribbon-lab">${esc(m.label || '')}</span>
      <b class="ag-ribbon-num">${esc(value)}${esc(suffix)}</b>
      <span class="ag-ribbon-bar" aria-hidden="true"><i style="width:${(bar * 100).toFixed(2)}%"></i></span>
    </li>`;
    })
    .join('');
  return `<ul class="ag-ribbon" data-ag-ribbon role="list">${cells}</ul>`;
}

/* ------------------------------------------------------------
   C19 — command palette
   ------------------------------------------------------------ */
export function commandPalette() {
  return `<div class="ag-palette" data-ag-palette>
  <button type="button" class="ag-palette-trigger" data-ag-palette-open aria-haspopup="dialog">
    <span class="ag-palette-ti" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg></span>
    <span class="ag-palette-tt">Search</span>
    <kbd class="ag-palette-kb"><span data-ag-palette-mod>Ctrl</span> K</kbd>
  </button>

  <div class="ag-palette-scrim" data-ag-palette-scrim hidden></div>

  <div class="ag-palette-dialog" role="dialog" aria-modal="true" aria-label="Search this site" data-ag-palette-dialog hidden>
    <div class="ag-palette-pin">
      <span class="ag-palette-ti" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg></span>
      <input type="text" class="ag-palette-q" data-ag-palette-input placeholder="Search verticals, products, articles…"
             autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true"
             aria-controls="ag-palette-list" aria-autocomplete="list">
      <button type="button" class="ag-palette-esc" data-ag-palette-close>Esc</button>
    </div>
    <div class="ag-palette-results" id="ag-palette-list" role="listbox" aria-label="Results" data-ag-palette-results></div>
    <div class="ag-palette-foot">
      <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
      <span><kbd>↵</kbd> open</span>
      <span class="ag-palette-cc" data-ag-palette-count></span>
    </div>
  </div>
</div>`;
}

/* ------------------------------------------------------------
   C20 — consent bar
   ------------------------------------------------------------ */
export function consentBar(site = {}) {
  const name = site.name || 'this site';
  return `<div class="ag-consent" data-ag-consent hidden>
  <div class="ag-consent-bar" role="region" aria-label="Cookie and consent preferences" data-ag-consent-bar>
    <div class="ag-consent-top">
      <span class="ag-consent-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9 4 4 0 0 1-5-5 3 3 0 0 1-4-4z"/><circle cx="9.5" cy="10" r="1"/><circle cx="14" cy="14.5" r="1"/><circle cx="9" cy="15" r="1"/></svg></span>
      <div class="ag-consent-txt">
        <h2>We use cookies</h2>
        <p>Necessary cookies keep forms and call routing working. Analytics and marketing cookies help ${esc(name)} measure which campaigns produce qualified enquiries. You choose.</p>
      </div>
      <button type="button" class="ag-consent-x" data-ag-consent-act="reject" aria-label="Close and keep necessary cookies only">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
      </button>
    </div>
    <div class="ag-consent-opts">
      <label class="ag-consent-opt is-locked">
        <input type="checkbox" checked disabled data-ag-consent-k="necessary">
        <span class="ag-consent-sw" aria-hidden="true"><i></i></span>
        <span class="ag-consent-ol"><b>Necessary</b><em>Always on</em></span>
      </label>
      <label class="ag-consent-opt">
        <input type="checkbox" data-ag-consent-k="analytics">
        <span class="ag-consent-sw" aria-hidden="true"><i></i></span>
        <span class="ag-consent-ol"><b>Analytics</b><em>Traffic &amp; quality</em></span>
      </label>
      <label class="ag-consent-opt">
        <input type="checkbox" data-ag-consent-k="marketing">
        <span class="ag-consent-sw" aria-hidden="true"><i></i></span>
        <span class="ag-consent-ol"><b>Marketing</b><em>Campaign attribution</em></span>
      </label>
    </div>
    <div class="ag-consent-acts">
      <button type="button" class="ag-consent-btn" data-ag-consent-act="reject">Necessary only</button>
      <button type="button" class="ag-consent-btn" data-ag-consent-act="save">Save choices</button>
      <button type="button" class="ag-consent-btn is-solid" data-ag-consent-act="all">Accept all</button>
    </div>
  </div>
  <span class="ag-consent-sr" aria-live="polite" data-ag-consent-live></span>
</div>`;
}
