# Altarious Global website
Static site + Cloudflare Pages Functions + D1. No npm deps. Node is a build tool only.

- `node scripts/scaffold.mjs` — generate missing product/article JSON from sub-vertical data (never overwrites).
- `node scripts/build.mjs` — build `dist/` (fails on validation errors).
- `npm run db:local` once, then `npm run dev` — local preview with Functions + local D1 (admin password admin123 from .dev.vars).
- Content lives in `content/`. Docs in `docs/`. Deployment in `DEPLOY.md`.
- Company name: Altarious Global. Tone: premium, corporate, data-driven; never call-center / affiliate style.

## Non-negotiables
- UI CMS at /admin for writers (D1-backed, Publish → deploy hook). Writers never use GitHub.
- Public site stays fully static. No frameworks, no npm deps, Cloudflare free tier only.
- Every active product page must show ≥2 related articles (build enforces).
- Read docs/PLAN.md and docs/ARCHITECTURE.md before changing structure.

## Design system (v2)
- Dual theme: light + dark. Tokens live at the top of `public/assets/css/site.css`; the theme follows the OS by default, the header toggle overrides it and persists to `localStorage` (`ag-theme`). An inline script in `<head>` applies it before paint (no flash).
- Scroll effects in `public/assets/js/site.js`: reveal-on-scroll, hero/photo parallax, sticky process rail, counters, 3D tilt cards, scroll + reading progress. All are driven by one rAF scroll loop and disabled under `prefers-reduced-motion`.
- Reveals only hide content when `html.js` is present, so a JS failure can never leave the page blank.
- Photography: curated Pexels images in `public/assets/img/photos/` (two sizes each: `<key>.jpg` 1500w and `<key>-sm.jpg` 760w, served with `srcset`). `photos.json` maps keys → paths, `CREDITS.json` records the source of each. Templates resolve images through `photo(ctx, ...keys)` with a fallback chain.
- Assets are cache-busted by content hash (`?v=…`) because `_headers` serves `/assets/*` as immutable.

## CMS images
- Writers upload images in the admin (Insert image button in the article editor, or "Choose image…" for a featured image). The browser resizes to 1600px and compresses before upload; the file is stored in D1 (`media` table) and served from `/media/<id>` with immutable caching.
- Markdown supports `![alt](/media/id "caption")` (renders as a `<figure>` with `<figcaption>`) and `---` horizontal rules.
