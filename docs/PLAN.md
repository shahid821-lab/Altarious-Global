# Altarious Global — Build Plan

Source: `docs/PRD-source.txt` (PPC, Lead Generation & Call Acquisition Website PRD).

## Constraints (from client)
- Cloudflare Pages **free plan** only. Domain on Spaceship, DNS moves to Cloudflare later.
- Lightweight: no framework, no runtime Node server, no npm dependencies.
- Database: **Cloudflare D1** (free SQLite) for inquiries and admin data.

## Approach
| Layer | Choice | Why |
|---|---|---|
| Public site | Static HTML/CSS generated at build by `scripts/build.mjs` (Node built-ins only) | Fastest possible load, zero runtime cost, perfect SEO |
| Content | **D1 table `content`** is the live CMS store (edited via the admin UI). JSON files in `content/` are the seed + fallback. | Writers never touch GitHub; adding a vertical/article = a form in the admin |
| Forms | Pages Function `functions/api/inquiries.js` → D1 | Validation, honeypot + Turnstile spam protection, notification (Resend email or webhook) |
| Admin | Static app at `/admin` + Pages Functions under `/api/admin/*`, password login with signed cookie | UI CMS for writers: content stored in D1, Publish button triggers a Pages deploy hook; build reads D1. Inquiry management (search/filter/status) |
| SEO | Per-page title/description/canonical, OpenGraph, JSON-LD, `sitemap.xml`, `robots.txt`, breadcrumbs, internal linking | PRD §25 |

## Phases
1. Docs + content schema.
2. Content data: 3 verticals, 35 sub-verticals (authored by content agent).
3. `scripts/scaffold.mjs`: materialise product pages (Inbound Calls + Live Transfers per sub-vertical) and 2 articles per product into individual JSON files.
4. `scripts/build.mjs`: templates → `dist/`. Validates the "min 2 articles per product" rule.
5. Functions: inquiries API, admin auth, admin inquiries, admin content CRUD (D1), publish (deploy hook), seed import.
5b. Admin UI (`public/admin/`): login, dashboard, inquiries table, content editors for each entity with markdown editor + preview + link picker (interlinking), article↔product assignment, Publish button.
5c. Build reads content from D1 (Cloudflare D1 HTTP API) when build env vars exist, else from `content/` JSON.
6. D1 schema `db/schema.sql`, `wrangler.toml`, `DEPLOY.md`.
7. Local verification: build, serve with `wrangler pages dev`, smoke test.

## Acceptance mapping (PRD §31)
- Navigation Vertical → Sub-Vertical → Product: generated hierarchy + breadcrumbs + mega menu.
- ≥2 article cards per product: build fails if violated.
- Article pages: dedicated URLs under `/resources/<vertical>/<sub>/<product>/<slug>/`, link back to product, sub-vertical, vertical.
- Forms: stored in D1 with source page, vertical, sub-vertical, product, timestamp; spam protection active.
- Admin: create verticals/sub-verticals/products/articles; assign articles to products; inquiry statuses New/Contacted/Qualified/Closed.
- Responsive: mobile nav, card grids, forms tested at 375px.

## CMS decisions (confirmed with client 2026-09-05)
- A **UI CMS is mandatory** for content writers: login, write/update articles, add verticals/sub-verticals/products, interlink easily.
- GitHub is for code only. Content is stored in D1 and published with a Publish button (Pages deploy hook rebuilds the static site).
- Interlinking: article assigned to Vertical → Sub-Vertical → Product via dropdowns (auto-appears on product page); editor has a link picker for any product/sub-vertical/article; build validates internal links and the ≥2 articles rule.
- Free tier only: Cloudflare Pages + D1 + Pages Functions. No paid services required (Turnstile, Resend free tiers optional).
