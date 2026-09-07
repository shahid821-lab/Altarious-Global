/**
 * build-review.mjs — assemble the design-review deck from the fragments in design-review/.
 * Output: design-review/deck.html (published as an Artifact).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WORLDS = path.join(ROOT, 'design-review', 'worlds');
const COMPONENTS = path.join(ROOT, 'design-review', 'components');
const OUT = path.join(ROOT, 'design-review', 'deck.html');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const worlds = [
  { id: 'W1', name: 'The Switchboard', blurb: 'The site as a telephone exchange. Patch cables hang with real slack physics between vertical jacks and the content panel, light pulses travel the cable, and hovering a jack re-patches it and swaps the content beneath.', chips: ['Signature', 'Canvas + physics', 'High build'] },
  { id: 'W2', name: 'Signal Terrain', blurb: 'Demand drawn as landscape. A wireframe heightfield where the peaks are search volume, a camera gliding forward, fog at the horizon, and vertical labels riding the ridges as the terrain morphs between your three vertical groups.', chips: ['Signature', 'Canvas', 'High build'] },
  { id: 'W3', name: 'The Departure Board', blurb: 'Solari split-flap hardware. Headlines clatter through glyphs and settle; rows of live delivery events flip between RINGING, QUALIFIED and TRANSFERRED. A real flap engine with mechanical easing, not a crossfade.', chips: ['Distinctive', 'CSS + JS', 'Medium build'] },
  { id: 'W4', name: 'Latency', blurb: 'Time as the whole design system. A millisecond rail ticks down the side, content connects rather than appears, and a timeline sweeps the real path: 0ms click, 340ms landing page, 12s call initiated, 41s qualified, 43s delivered.', chips: ['Typographic', 'Light build', 'Fast'] },
  { id: 'W5', name: 'Intent Field', blurb: 'Thousands of particles are consumers. They drift on a flow field, then get captured and funnelled through three routing channels into a delivery tray that counts up. Your cursor is a force in the field.', chips: ['Signature', 'Canvas', 'High build'] },
  { id: 'W6', name: 'Cartographic', blurb: 'The site lives on a chart drawn in code. Coverage arcs sweep between hub and city nodes with travelling pulses; panning and zooming the map is the navigation. Paper-navy with copper linework.', chips: ['Navigation-led', 'Canvas', 'High build'] },
  { id: 'W7', name: 'The Ledger', blurb: 'An annual report from a firm that publishes its numbers. Serif display against mono tabular figures, hairline rules, hover-revealed footnotes, and a giant percentage that recomputes as the vertical filter changes.', chips: ['Credibility', 'Light build', 'Fast'] },
  { id: 'W8', name: 'Duotone Documentary', blurb: 'Cinema. Duotone scenes — a plumber under a sink at 06:14, a kitchen table at dawn — with moving film grain, a timecode caption strip and stories that cross-dissolve. Human-first, the opposite of stock corporate.', chips: ['Emotive', 'Canvas', 'Needs a photo shoot'] },
  { id: 'W9', name: 'Modular Machine', blurb: 'A Swiss grid that visibly reassembles. Real content tiles travel actual paths between Overview, By vertical and By product layouts with FLIP animation, grid rules staying visible so you watch the system work.', chips: ['Precision', 'CSS + JS', 'Medium build'] },
  { id: 'W10', name: 'Night Ops', blurb: 'Mission control at 2am. Glass panels at four depths in a 3D scene that parallaxes to your pointer, a drifting light shaft, and one illuminated Connect button whose halo bleeds onto the surfaces behind it.', chips: ['Premium', 'CSS 3D + canvas', 'Medium build'] },
];

const components = [
  { id: 'C1', name: 'Anchor rail', blurb: 'Sticky in-page nav for product pages with a scroll-spy indicator.' },
  { id: 'C2', name: 'Coverage grid', blurb: 'All 50 states shaded by coverage, filterable by product.' },
  { id: 'C3', name: 'Product comparison', blurb: 'Web Leads vs Inbound Calls vs Live Transfers, side by side.' },
  { id: 'C4', name: 'Volume calculator', blurb: 'Calls, close rate and policy value in; customers and CPA out.' },
  { id: 'C5', name: 'Criteria builder', blurb: 'Toggle qualification chips and watch your filter assemble in plain English.' },
  { id: 'C6', name: 'Onboarding timeline', blurb: 'Day 1 to Day 5, scoping call to first live call.' },
  { id: 'C7', name: 'Buyer marquee', blurb: 'Seamless infinite strip of the buyer types you serve.' },
  { id: 'C8', name: 'Searchable FAQ', blurb: 'Type-to-filter across every question with match highlighting.' },
  { id: 'C9', name: 'Commercial models', blurb: 'Per call, per lead, per transfer — how each works and who it suits.' },
  { id: 'C10', name: 'Sticky enquiry bar', blurb: 'Slides in past 40% scroll, pre-tagged with the page product.' },
  { id: 'C11', name: 'Multi-step enquiry', blurb: 'The contact form as three short steps with validation.' },
  { id: 'C12', name: 'Call-us widget', blurb: 'Click-to-call with live open/closed status and both timezones.' },
  { id: 'C13', name: 'Key takeaways', blurb: 'Three-bullet article summary with copy to clipboard.' },
  { id: 'C14', name: 'Related rail', blurb: 'Snap-scrolling article rail with arrows and drag.' },
  { id: 'C15', name: 'Term tooltips', blurb: 'IVR, TCPA, warm bridge and ASR defined inline on hover or focus.' },
  { id: 'C16', name: 'Vertical fact strip', blurb: 'Seasonality, ticket size, buyer type and peak hours per sub-vertical.' },
  { id: 'C17', name: 'Before / after slider', blurb: 'Drag between a raw lead list and one qualified transfer.' },
  { id: 'C18', name: 'Metric ribbon', blurb: 'Case-study figures that count up with bars drawing in.' },
  { id: 'C19', name: 'Command palette', blurb: 'Ctrl+K search across every vertical, product and article.' },
  { id: 'C20', name: 'Consent bar', blurb: 'Granular cookie and consent control, styled to the brand.' },
];

function readFragment(dir, file) {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) return null;
  const html = fs.readFileSync(p, 'utf8').trim();
  return html.length > 200 ? html : null;
}

const missing = [];

const worldSections = worlds
  .map((w, i) => {
    const frag = readFragment(WORLDS, w.id.toLowerCase() + '.html');
    if (!frag) { missing.push(w.id); return ''; }
    return `<article class="row" id="${w.id}">
  <div class="spec">
    <div class="idrow"><span class="id">${w.id}</span><span class="mono dim">World ${i + 1} of ${worlds.length}</span></div>
    <h2>${esc(w.name)}</h2>
    <p class="why">${esc(w.blurb)}</p>
    <div class="chips">${w.chips.map((c, n) => `<span class="chip${n === 0 ? ' hi' : ''}">${esc(c)}</span>`).join('')}</div>
    <label class="approve"><input type="checkbox" data-id="${w.id}" data-name="${esc(w.name)}"> Approve ${w.id}</label>
  </div>
  <div class="preview">${frag}</div>
</article>`;
  })
  .join('\n');

const componentSections = components
  .map((c) => {
    const frag = readFragment(COMPONENTS, c.id.toLowerCase() + '.html');
    if (!frag) { missing.push(c.id); return ''; }
    return `<article class="crow" id="${c.id}">
  <div class="chead">
    <div><span class="id small">${c.id}</span><h3>${esc(c.name)}</h3><p class="why">${esc(c.blurb)}</p></div>
    <label class="approve"><input type="checkbox" data-id="${c.id}" data-name="${esc(c.name)}"> Approve</label>
  </div>
  <div class="cdemo">${frag}</div>
</article>`;
  })
  .join('\n');

const shell = `<title>Altarious Design Worlds</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;450;500;600&family=Instrument+Serif:ital@0;1&display=swap">
<style>
:root{
  --bg:#F6F7F9; --panel:#FFFFFF; --panel-2:#EEF1F5; --sunk:#E7EBF1;
  --fg:#12161F; --fg-2:#3D4757; --fg-3:#69738A;
  --line:#DFE4EC; --line-2:#C9D1DE;
  --signal:#B26A00; --signal-solid:#FFB020; --live:#0E7C6B; --live-solid:#2ED3B7;
  --shadow:0 1px 2px rgba(14,17,22,.05), 0 14px 36px rgba(14,17,22,.08);
  --mono:"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --sans:"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --display:"Archivo", "IBM Plex Sans", system-ui, sans-serif;
  color-scheme:light;
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --bg:#0E1116; --panel:#151A22; --panel-2:#1B212B; --sunk:#0A0D12;
    --fg:#EEF1F6; --fg-2:#B3BCCB; --fg-3:#7C8698;
    --line:#232A36; --line-2:#2E3745; --signal:#FFB020; --live:#2ED3B7;
    --shadow:0 1px 2px rgba(0,0,0,.5), 0 20px 48px rgba(0,0,0,.5);
    color-scheme:dark;
  }
}
:root[data-theme="dark"]{
  --bg:#0E1116; --panel:#151A22; --panel-2:#1B212B; --sunk:#0A0D12;
  --fg:#EEF1F6; --fg-2:#B3BCCB; --fg-3:#7C8698;
  --line:#232A36; --line-2:#2E3745; --signal:#FFB020; --live:#2ED3B7;
  --shadow:0 1px 2px rgba(0,0,0,.5), 0 20px 48px rgba(0,0,0,.5);
  color-scheme:dark;
}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg-2);font-family:var(--sans);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:var(--display);color:var(--fg);margin:0;line-height:1.06;letter-spacing:-.03em;text-wrap:balance}
p{margin:0}
a{color:var(--fg)}
::selection{background:var(--signal-solid);color:#191100}
html{scrollbar-width:thin;scrollbar-color:var(--line-2) transparent}
::-webkit-scrollbar{width:11px;height:11px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--line-2);border-radius:99px;border:3px solid var(--bg);background-clip:padding-box}
.wrap{max-width:1220px;margin:0 auto;padding:0 28px}
.mono{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase}
.dim{color:var(--fg-3)}
.mast{border-bottom:1px solid var(--line);padding:46px 0 34px}
.mast-top{display:flex;justify-content:space-between;align-items:baseline;gap:20px;flex-wrap:wrap;margin-bottom:26px}
.mast .mono.eyebrow{color:var(--signal)}
h1{font-size:clamp(34px,5vw,60px);font-weight:700;max-width:18ch}
.sub{margin-top:18px;max-width:66ch;font-size:17px}
.legend{display:flex;gap:28px;flex-wrap:wrap;margin-top:26px;padding-top:20px;border-top:1px solid var(--line)}
.legend div{display:flex;flex-direction:column;gap:2px}
.legend b{font-family:var(--display);color:var(--fg);font-size:20px;font-weight:600;font-variant-numeric:tabular-nums}
.legend span{font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-3)}
.themebtn{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;background:transparent;border:1px solid var(--line-2);color:var(--fg-2);padding:7px 13px;border-radius:99px;cursor:pointer}
.themebtn:hover{border-color:var(--signal);color:var(--fg)}
.secthead{padding:54px 0 8px;border-bottom:1px solid var(--line);margin-bottom:8px}
.secthead h2{font-size:clamp(22px,3vw,32px)}
.secthead p{max-width:62ch;margin-top:10px}
.row{display:grid;grid-template-columns:minmax(0,330px) minmax(0,1fr);gap:40px;padding:46px 0;border-bottom:1px solid var(--line);align-items:start}
.spec{position:sticky;top:24px;display:flex;flex-direction:column;gap:13px}
.idrow{display:flex;align-items:center;gap:10px}
.id{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.1em;color:var(--signal);border:1px solid var(--signal);border-radius:4px;padding:3px 8px}
.id.small{display:inline-block;margin-bottom:8px}
.row h2{font-size:27px;font-weight:600}
.why{font-size:14.5px;color:var(--fg-2)}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--fg-3);border:1px solid var(--line);border-radius:4px;padding:4px 8px;background:var(--panel-2)}
.chip.hi{color:var(--live);border-color:color-mix(in srgb,var(--live) 40%,var(--line))}
.approve{display:flex;align-items:center;gap:9px;cursor:pointer;user-select:none;font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--fg-3)}
.approve input{appearance:none;width:17px;height:17px;border:1px solid var(--line-2);border-radius:3px;background:var(--panel);cursor:pointer;display:grid;place-content:center;flex:none}
.approve input:checked{background:var(--signal-solid);border-color:var(--signal-solid)}
.approve input:checked::after{content:"";width:9px;height:5px;border-left:2px solid #191100;border-bottom:2px solid #191100;transform:rotate(-45deg) translate(1px,-1px)}
.approve input:focus-visible{outline:2px solid var(--signal);outline-offset:2px}
.approve:has(input:checked){color:var(--fg)}
.preview{border:1px solid var(--line);border-radius:12px;overflow:hidden;box-shadow:var(--shadow);background:var(--panel)}
.cgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;padding:26px 0 10px}
.crow{border:1px solid var(--line);border-radius:12px;background:var(--panel);box-shadow:var(--shadow);overflow:hidden;display:flex;flex-direction:column}
.chead{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:18px 20px;border-bottom:1px solid var(--line);background:var(--panel-2)}
.chead h3{font-size:17px;font-weight:600}
.chead .why{margin-top:4px;font-size:13.5px}
.cdemo{padding:20px;flex:1;background:var(--panel)}
@media (max-width:1000px){.row{grid-template-columns:1fr;gap:22px;padding:34px 0}.spec{position:static}.cgrid{grid-template-columns:1fr}}
.tally{position:sticky;bottom:0;z-index:60;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(14px);border-top:1px solid var(--line)}
.tally-in{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 28px;max-width:1220px;margin:0 auto;flex-wrap:wrap}
.tally b{color:var(--fg);font-family:var(--display);font-size:16px}
.btn{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;background:var(--fg);color:var(--bg);border:0;border-radius:99px;padding:8px 15px;cursor:pointer}
.btn:hover{background:var(--signal-solid);color:#191100}
.btn.ghost{background:transparent;color:var(--fg-2);border:1px solid var(--line-2)}
.closing{padding:44px 0 70px}
.closing p{max-width:64ch;margin-bottom:12px}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
</style>

<header class="mast"><div class="wrap">
  <div class="mast-top">
    <p class="mono eyebrow">Design review · round two · Altarious Global</p>
    <button class="themebtn" id="theme">Theme</button>
  </div>
  <h1>Ten worlds and twenty components, all running code.</h1>
  <p class="sub">Each world takes one real property of the business — signal, routing, latency, intent, coverage — and makes it the whole visual system, rather than dressing content in a style. Every panel below is live: hover it, drag it, click it. Nothing here is a mockup, and nothing uses a framework, so whatever you approve ships onto the same free Cloudflare plan.</p>
  <div class="legend">
    <div><b>10</b><span>Whole-site worlds</span></div>
    <div><b>20</b><span>Components</span></div>
    <div><b>0</b><span>Libraries used</span></div>
    <div><b>60 fps</b><span>Target on mid-range mobile</span></div>
  </div>
</div></header>

<main class="wrap">
  <section class="secthead"><h2>Part one — whole-site worlds</h2><p>Pick one. This decides the art direction of all 370 pages: type, colour, motion and the central idea a visitor remembers.</p></section>
  ${worldSections}

  <section class="secthead"><h2>Part two — components</h2><p>Pick as many as you like. These drop into whichever world you choose.</p></section>
  <div class="cgrid">
  ${componentSections}
  </div>

  <section class="closing">
    <h2 style="font-size:26px;margin-bottom:14px">How to respond</h2>
    <p>Tick what you want, press <b style="color:var(--fg)">Copy approvals</b> below and paste the list back — or just reply with the numbers, for example "W4, C3, C4, C19".</p>
    <p>Pick exactly one world. If you want my read: <b style="color:var(--fg)">W4 Latency</b> or <b style="color:var(--fg)">W7 The Ledger</b> are the safest expensive-looking choices for insurance and finance buyers and the fastest to build; <b style="color:var(--fg)">W1 The Switchboard</b> and <b style="color:var(--fg)">W5 Intent Field</b> are the ones nobody in your industry will have.</p>
  </section>
</main>

<div class="tally"><div class="tally-in">
  <p class="mono dim">Approved: <b id="tally-n">0</b></p>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn ghost" id="clear">Clear</button>
    <button class="btn" id="copy">Copy approvals</button>
  </div>
</div></div>

<script>
(function(){
  var root=document.documentElement;
  document.getElementById('theme').addEventListener('click',function(){
    var cur=root.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
    root.setAttribute('data-theme',cur==='dark'?'light':'dark');
  });
  var boxes=Array.prototype.slice.call(document.querySelectorAll('input[data-id]'));
  function tally(){
    var picked=boxes.filter(function(b){return b.checked;});
    document.getElementById('tally-n').textContent=picked.length;
    try{localStorage.setItem('ag-round2',JSON.stringify(picked.map(function(b){return b.dataset.id;})));}catch(e){}
    return picked;
  }
  try{
    var saved=JSON.parse(localStorage.getItem('ag-round2')||'[]');
    boxes.forEach(function(b){ if(saved.indexOf(b.dataset.id)>-1) b.checked=true; });
  }catch(e){}
  boxes.forEach(function(b){ b.addEventListener('change',tally); });
  document.getElementById('clear').addEventListener('click',function(){ boxes.forEach(function(b){b.checked=false;}); tally(); });
  document.getElementById('copy').addEventListener('click',function(){
    var picked=tally().map(function(b){ return b.dataset.id+' — '+b.dataset.name; });
    var text=picked.length?'Approved:\\n'+picked.join('\\n'):'Nothing approved yet.';
    var btn=document.getElementById('copy');
    navigator.clipboard.writeText(text).then(function(){ btn.textContent='Copied'; setTimeout(function(){btn.textContent='Copy approvals';},1600); },
      function(){ btn.textContent='Press Ctrl+C'; });
  });
  tally();
})();
</script>`;

fs.writeFileSync(OUT, shell);
console.log(`deck written: ${path.relative(ROOT, OUT)} (${(shell.length / 1024).toFixed(0)} KB)`);
if (missing.length) console.log(`missing fragments: ${missing.join(', ')}`);
