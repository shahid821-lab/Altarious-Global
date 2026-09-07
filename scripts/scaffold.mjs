/**
 * scaffold.mjs — materialise CMS entities from sub-vertical data.
 * For every active sub-vertical, ensures:
 *   - content/products/<sub>--inbound-calls.json
 *   - content/products/<sub>--live-transfers.json
 *   - at least 2 articles per product in content/articles/
 * Never overwrites an existing file. Safe to run repeatedly.
 * Usage: node scripts/scaffold.mjs [--force]  (--force rewrites generated products/articles)
 */
import fs from 'node:fs';
import path from 'node:path';
import { CONTENT, loadContent, writeFile } from './lib/util.mjs';
import { productFor, articlesFor } from './lib/generators.mjs';

const force = process.argv.includes('--force');
const { verticals, subVerticals, products, articles } = loadContent();
const vmap = Object.fromEntries(verticals.map((v) => [v.slug, v]));
let created = 0;

for (const sv of subVerticals) {
  const vertical = vmap[sv.vertical];
  if (!vertical) {
    console.warn(`! sub-vertical ${sv.slug} references unknown vertical ${sv.vertical}`);
    continue;
  }
  for (const type of ['inbound-calls', 'live-transfers']) {
    const pfile = path.join(CONTENT, 'products', `${sv.slug}--${type}.json`);
    if (force || !fs.existsSync(pfile)) {
      writeFile(pfile, JSON.stringify(productFor(vertical, sv, type), null, 2) + '\n');
      created++;
      console.log(`+ product ${sv.slug}/${type}`);
    }
    const existing = articles.filter((a) => a.vertical === sv.vertical && a.subVertical === sv.slug && a.product === type);
    if (force || existing.length < 2) {
      for (const art of articlesFor(vertical, sv, type)) {
        const afile = path.join(CONTENT, 'articles', `${art.slug}.json`);
        if (force || !fs.existsSync(afile)) {
          writeFile(afile, JSON.stringify(art, null, 2) + '\n');
          created++;
          console.log(`+ article ${art.slug}`);
        }
      }
    }
  }
}
console.log(`scaffold complete: ${created} file(s) created${force ? ' (force)' : ''}.`);
