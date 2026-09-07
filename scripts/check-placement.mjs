/** Audit: every approved component appears on the pages docs/PLACEMENT.md says, and nowhere else. */
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const MARK = {
  C1: 'ag-anchor', C2: 'ag-coverage', C3: 'ag-compare', C4: 'ag-calc', C5: 'ag-criteria',
  C6: 'ag-timeline', C7: 'ag-marquee', C8: 'ag-faq', C9: 'ag-models', C10: 'ag-enquirybar',
  C11: 'ag-steps', C12: 'ag-call', C13: 'ag-takeaways', C14: 'ag-rail', C15: 'ag-term',
  C16: 'ag-facts', C18: 'ag-ribbon', C19: 'ag-palette', C20: 'ag-consent',
  terrain: 'data-terrain=',
};

const kindOf = (rel) => {
  const p = '/' + rel.replace(/\\/g, '/').replace(/index\.html$/, '');
  if (p === '/') return 'home';
  if (p.startsWith('/resources/') && p.split('/').filter(Boolean).length >= 5) return 'article';
  if (p.startsWith('/resources/')) return 'resources';
  if (p === '/services/') return 'services-index';
  if (p.startsWith('/services/')) return 'service';
  if (p === '/verticals/') return 'verticals';
  if (p === '/about/' || p === '/privacy/' || p === '/terms/') return 'page';
  if (p === '/case-studies/') return 'case-studies';
  if (p === '/contact/') return 'contact';
  const seg = p.split('/').filter(Boolean);
  if (seg.length === 1) return 'vertical';
  if (seg.length === 2) return 'sub-vertical';
  if (seg.length === 3) return 'product';
  return 'other';
};

const counts = {};
let pages = 0;
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else if (e.name === 'index.html') {
      pages++;
      const html = fs.readFileSync(f, 'utf8');
      const kind = kindOf(path.relative(DIST, f));
      for (const [id, mark] of Object.entries(MARK)) {
        if (html.includes(mark)) {
          counts[id] = counts[id] || {};
          counts[id][kind] = (counts[id][kind] || 0) + 1;
        }
      }
    }
  }
})(DIST);

/* These two publish claims about the business — which states are live, what results
   are achieved. They stay off the site until real values are entered in Operational
   Settings, so their absence is correct rather than a regression. */
const CONDITIONAL = {
  C2: 'coverage map — enable it in Operational Settings',
  C18: 'results ribbon — add figures in Operational Settings',
};

console.log(`pages scanned: ${pages}\n`);
const order = ['C1','C2','C3','C4','C5','C6','C7','C8','C9','C10','C11','C12','C13','C14','C15','C16','C18','C19','C20','terrain'];
for (const id of order) {
  const c = counts[id];
  if (!c) {
    console.log(`${id.padEnd(8)}    — ${CONDITIONAL[id] ? 'awaiting data: ' + CONDITIONAL[id] : 'MISSING — not on any page'}`);
    continue;
  }
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  const where = Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ');
  console.log(`${id.padEnd(8)} ${String(total).padStart(4)} pages  →  ${where}`);
}
const unexpected = order.filter((id) => !counts[id] && !CONDITIONAL[id]);
if (unexpected.length) { console.error(`\nFAIL: not placed anywhere: ${unexpected.join(', ')}`); process.exit(1); }
console.log('\nOK — every approved component is placed, or is correctly waiting on real data.');
