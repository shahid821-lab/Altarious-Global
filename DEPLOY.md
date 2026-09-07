# Deploying Altarious Global to Cloudflare Pages (free plan)

Everything runs on the Cloudflare free tier: Pages (static hosting + Functions), D1 (SQLite database).
Node is only used at build time on Cloudflare's build servers. No npm packages.

## 0. Prerequisites
- A GitHub account with this project pushed to a repository (code only; content is edited in the admin UI).
- A Cloudflare account (free). Install Wrangler locally once: `npm i -g wrangler` then `wrangler login`.

## 1. Create the D1 database
```bash
npx wrangler d1 create altarious
```
Copy the `database_id` it prints into `wrangler.toml` (replace the placeholder `00000000-0000-0000-0000-000000000000`). Then create the tables:
```bash
npx wrangler d1 execute altarious --remote --file=db/schema.sql
```

## 2. Create the Pages project
Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
- Framework preset: **None**
- Build command: `node scripts/build.mjs`
- Build output directory: `dist`
- Root directory: `/`

Click **Save and Deploy**. The first deploy builds from the JSON seed content in `content/`.

## 3. Bind D1 and set variables
Pages project → **Settings → Bindings** → Add → **D1 database** → variable name `DB` → select `altarious`.
(If `wrangler.toml` has the correct `database_id`, Pages picks the binding up automatically.)

Pages project → **Settings → Variables and Secrets** (Production, and Preview if you use it):

| Name | Type | Value |
|---|---|---|
| `ADMIN_PASSWORD` | Secret | a strong password for `/admin` |
| `SESSION_SECRET` | Secret | a long random string (e.g. `openssl rand -hex 32`) |
| `DEPLOY_HOOK_URL` | Secret | see step 4 |
| `CF_ACCOUNT_ID` | Text | Account ID (dashboard → Workers & Pages → right sidebar) |
| `CF_D1_DATABASE_ID` | Text | the D1 `database_id` |
| `CF_API_TOKEN` | Secret | API token with **D1: Read** permission (My Profile → API Tokens → Create → Custom → Account → D1 → Read) |
| `TURNSTILE_SECRET_KEY` | Secret | optional, spam protection (Turnstile → Add site → get site key + secret; put the *site key* in Admin → Site Settings) |
| `RESEND_API_KEY` | Secret | optional, email notifications (free tier at resend.com) |
| `NOTIFY_EMAIL_TO` | Text | optional, comma-separated recipients |
| `NOTIFY_EMAIL_FROM` | Text | optional, e.g. `Altarious Global <inquiries@yourdomain.com>` (domain must be verified in Resend) |
| `NOTIFY_WEBHOOK_URL` | Secret | optional, Slack/Discord/Zapier incoming webhook |

`CF_*` variables are read **during the build** so the site is generated from the CMS content in D1. Without them the build uses the repo JSON.

## 4. Deploy hook (one-click Publish from the admin)
Pages project → **Settings → Builds & deployments → Deploy hooks → Add deploy hook** (name: `admin-publish`, branch: `main`). Copy the URL into the `DEPLOY_HOOK_URL` secret. Redeploy once so the new variables take effect (Deployments → Retry deployment).

## 5. First login and seed import
1. Open `https://<project>.pages.dev/admin/` and sign in with `ADMIN_PASSWORD`.
2. The dashboard shows "The CMS database is empty" → click **Import seed content**. This loads 3 verticals, 35 sub-verticals, 70 product pages and 140 articles into D1.
3. Click **Publish site**. From now on all content edits happen in the admin and go live with Publish.

## 6. Custom domain (domain is at Spaceship)
1. Pages project → **Custom domains → Set up a custom domain** → enter `altariousglobal.com` (and `www`).
2. Recommended: move DNS to Cloudflare. In Cloudflare add the site (free plan), note the two nameservers, and at Spaceship → Domain → Nameservers set them to Cloudflare's. Cloudflare then creates the CNAME records for Pages automatically.
   Alternative without moving DNS: at Spaceship add `CNAME www → <project>.pages.dev` and follow the dashboard instructions for the apex record.
3. Update `domain` in Admin → Site Settings (used for canonical URLs and the sitemap), then Publish.
4. Submit `https://altariousglobal.com/sitemap.xml` in Google Search Console.

## Local development
See also docs/ARCHITECTURE.md → Local development.
```bash
node scripts/build.mjs                      # build dist/ from content/
npx wrangler d1 execute altarious --local --persist-to .wrangler/state --file=db/schema.sql   # once
npm run dev                                 # http://localhost:8788 with Functions + local D1 (admin password: admin123)
```
Local admin: open http://localhost:8788/admin/ → Import seed → edit. Note that in local dev the Publish button is disabled unless you set `DEPLOY_HOOK_URL`; rebuild with `node scripts/build.mjs` instead.

## Content workflow for writers
Admin → Articles → **+ New Article** → choose Vertical → Sub-Vertical → Product, write in Markdown (use **Insert internal link** to link any product, sub-vertical or article), Save, then **Publish site**.
Adding a new vertical: Verticals → New → Save; Sub-Verticals → New (pick the vertical) → Save; on the sub-vertical page use "Create Inbound Calls page" and "Create Live Transfers page"; write two articles per product; Publish.
The build refuses to publish a product page with fewer than 2 articles, and the dashboard warns about them.

## Images
- **Site photography** ships in the repo under `public/assets/img/photos/` (Pexels License — free for commercial use, no attribution required; sources recorded in `CREDITS.json`). Replace any file with your own shot of the same name and rebuild; no code changes needed.
- **Article images** are uploaded by writers in the admin and stored in the D1 `media` table, served from `/media/<id>`. The browser resizes them to 1600px before upload and the API rejects anything over 1.5 MB. At roughly 250 KB per image, D1's 5 GB free tier holds tens of thousands of images.
- Run the media table migration if you created the database before this feature: `npx wrangler d1 execute altarious --remote --file=db/schema.sql` (the script is idempotent).

## Free-tier limits (as of 2026)
- Pages: 500 builds/month, unlimited requests and bandwidth for static assets.
- Pages Functions: 100,000 requests/day (only form submissions and admin use functions; public pages do not).
- D1: 5 GB storage, 5 million rows read/day, 100,000 rows written/day.
