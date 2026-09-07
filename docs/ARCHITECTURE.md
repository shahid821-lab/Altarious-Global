# Architecture

```
altarious-global/
├── content/                 # CMS data (JSON). Source of truth for the public site.
│   ├── site.json            # brand, contact, nav, CTAs
│   ├── verticals/*.json     # insurance.json, home-services.json, web-leads.json
│   ├── sub-verticals/*.json # auto-insurance.json ... (35 at launch)
│   ├── products/*.json      # <sub>--inbound-calls.json, <sub>--live-transfers.json
│   ├── articles/*.json      # one per article, references vertical/sub/product
│   └── pages/*.json         # home, about, services, case-studies, contact
├── scripts/
│   ├── scaffold.mjs         # generate missing product + article JSON from sub-vertical data
│   ├── build.mjs            # JSON → static HTML in dist/ (+ sitemap.xml, robots.txt)
│   └── lib/                 # templates, markdown-lite, helpers
├── public/                  # copied verbatim into dist/ (css, js, images, admin app)
├── functions/               # Cloudflare Pages Functions (edge, tiny)
│   ├── api/inquiries.js             # POST public form
│   ├── api/admin/login.js           # POST password → signed cookie
│   ├── api/admin/inquiries.js       # GET list/search/filter, PATCH status
│   ├── api/admin/content.js         # CRUD content entities in D1
│   ├── api/admin/media.js           # image library: upload / list / delete (D1)
│   ├── api/admin/publish.js         # trigger Pages deploy hook
│   ├── media/[id].js                # public image delivery from D1, immutable cache
│   └── _middleware.js               # security headers, admin auth guard
├── db/schema.sql            # D1 tables
├── wrangler.toml            # Pages config + D1 binding
└── dist/                    # build output (gitignored)
```

## Request flow
- Public page: Cloudflare CDN serves static HTML. No function invoked.
- Form submit: browser `fetch('/api/inquiries')` → validate → Turnstile (if configured) → insert into D1 `inquiries` → notify (Resend / webhook, optional) → JSON result.
- Admin: `/admin/` static app → `/api/admin/*` functions guarded by HMAC-signed cookie (`ADMIN_PASSWORD`, `SESSION_SECRET`).
- Content edit in admin (UI CMS for writers, no GitHub involved): saves go to D1 table `content` (one row per entity: kind, slug, json). "Publish" calls `/api/admin/publish`, which hits the Cloudflare Pages **Deploy Hook** (`DEPLOY_HOOK_URL`). The build (`scripts/build.mjs`) first tries to pull content from D1 through the Cloudflare D1 HTTP API (`CF_ACCOUNT_ID`, `CF_D1_DATABASE_ID`, `CF_API_TOKEN` set as build env vars); if those are absent it builds from the JSON in `content/`. "Import seed" in admin loads `content/` JSON into D1 the first time.

## URL scheme
```
/                                   home
/about/  /services/  /services/ppc-performance-marketing/  /services/web-lead-generation/
/services/inbound-calls/  /services/live-transfers/  /case-studies/  /contact/
/verticals/                         all verticals
/insurance/                         vertical overview
/insurance/auto-insurance/          sub-vertical
/insurance/auto-insurance/inbound-calls/     product page
/insurance/auto-insurance/live-transfers/    product page
/resources/                                  article index
/resources/insurance/auto-insurance/inbound-calls/<article-slug>/   article page
/sitemap.xml  /robots.txt
/admin/                             admin app
```

## Environment variables (Cloudflare Pages → Settings → Variables)
| Name | Required | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | yes | admin login |
| `SESSION_SECRET` | yes | HMAC key for admin cookie |
| `TURNSTILE_SECRET_KEY` | optional | server-side Turnstile check (site key goes in `content/site.json`) |
| `RESEND_API_KEY`, `NOTIFY_EMAIL_TO`, `NOTIFY_EMAIL_FROM` | optional | email notification |
| `NOTIFY_WEBHOOK_URL` | optional | Slack/Discord/Zapier webhook notification |
| `DEPLOY_HOOK_URL` | yes for CMS publish | Pages deploy hook that rebuilds the site |
| `CF_ACCOUNT_ID`, `CF_D1_DATABASE_ID`, `CF_API_TOKEN` | yes for CMS content (build-time) | lets the build read CMS content from D1 |
| D1 binding `DB` | yes | inquiries storage |

## Local development
- `npm run db:local` (once) creates the tables in the local D1 emulator; `npm run dev` serves `dist/` with Functions on http://localhost:8788. Dev secrets live in `.dev.vars` (gitignored; admin password `admin123`).
- To test a build from CMS content locally: export rows with `npx wrangler d1 execute altarious --local --persist-to .wrangler/state --command "SELECT kind, slug, json FROM content" --json > .wrangler/rows.json` then `CONTENT_ROWS_FILE=.wrangler/rows.json node scripts/build.mjs`.
- Product slugs are `<sub-vertical>--<type>` (double hyphen) and are never passed through slugify.

## Future login areas (PRD §24)
Client/agent dashboards can be added as `/portal/*` static app + `/api/portal/*` functions with a `users` table in D1; nothing in the public build depends on them.

## Front-end
- `public/assets/css/site.css` — one design-system file: theme tokens (light + dark), layout, components, scroll-reveal states.
- `public/assets/js/site.js` — theme toggle, mobile nav, scroll reveals, parallax, sticky process rail, counters, 3D tilt, progress bars, form submission. One rAF scroll loop; everything respects `prefers-reduced-motion`.
- Photos: 54 curated keys × 2 widths in `public/assets/img/photos/`, mapped by `photos.json`, emitted with `srcset`/`sizes` and explicit dimensions.
- CSS and JS URLs carry a content hash (`?v=…`) so immutable caching never serves a stale build.
