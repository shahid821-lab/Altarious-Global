/** Audit: report any built page that shows the same photograph more than once. */
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
let pages = 0;
const offenders = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else if (e.name === 'index.html') {
      const html = fs.readFileSync(f, 'utf8');
      pages++;
      const srcs = [...html.matchAll(/src="(\/assets\/img\/photos\/[^"]+\.jpg)"/g)].map((m) => m[1]);
      const counts = {};
      for (const s of srcs) counts[s] = (counts[s] || 0) + 1;
      const dups = Object.entries(counts).filter(([, n]) => n > 1);
      if (dups.length) {
        offenders.push({
          page: path.relative(DIST, f).split(path.sep).join('/'),
          detail: dups.map(([u, n]) => `${u.split('/').pop()} ×${n}`).join(', '),
          worst: Math.max(...dups.map(([, n]) => n)),
        });
      }
    }
  }
}
walk(DIST);

offenders.sort((a, b) => b.worst - a.worst);
console.log(`pages scanned: ${pages}`);
console.log(`pages repeating a photo: ${offenders.length}${offenders.length ? ` (worst: ${offenders[0].worst}×)` : ''}`);
for (const o of offenders.slice(0, 8)) console.log(`  ${o.page} → ${o.detail}`);
/* Index pages that list every article legitimately reuse imagery far apart on the page.
   The same photo four or more times on one page is a bug. */
if (offenders.some((o) => o.worst > 3)) {
  console.error('\nFAIL: a photo appears four or more times on one page.');
  process.exit(1);
}
console.log('OK — no page repeats a photo more than three times.');
