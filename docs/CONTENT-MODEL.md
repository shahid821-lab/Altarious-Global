# Content Model

Hierarchy: Vertical → Sub-Vertical → Product (inbound-calls | live-transfers) → Articles.

## vertical (content/verticals/<slug>.json)
```json
{ "slug": "insurance", "name": "Insurance", "tagline": "...",
  "description": "...", "intro": ["para", "para"], "featuredImage": "/assets/img/insurance.svg",
  "highlights": ["...","..."], "order": 1, "active": true,
  "seo": { "title": "...", "description": "...", "keywords": ["..."] } }
```

## sub-vertical (content/sub-verticals/<slug>.json)
```json
{ "slug": "auto-insurance", "vertical": "insurance", "name": "Auto Insurance", "active": true, "order": 1,
  "shortDescription": "one sentence",
  "description": ["para", "para"],
  "consumerProfile": "who the consumer is",
  "intentSignals": ["...", "..."],
  "qualificationCriteria": ["...", "..."],
  "keywords": ["...", "..."],
  "marketContext": "paragraph on the market / buyer",
  "inboundCallsAngle": "paragraph: why inbound calls fit this vertical",
  "liveTransfersAngle": "paragraph: why live transfers fit this vertical",
  "faq": [{ "q": "...", "a": "..." }],
  "seo": { "title": "...", "description": "..." } }
```

## product (content/products/<sub>--<type>.json)
```json
{ "slug": "inbound-calls", "type": "inbound-calls", "vertical": "insurance", "subVertical": "auto-insurance",
  "name": "Auto Insurance Inbound Calls", "active": true,
  "hero": { "headline": "...", "subheadline": "...", "cta": "Request More Information" },
  "overview": ["para","para"], "targetConsumer": "...", "consumerIntent": "...",
  "howGenerated": "...", "qualification": "...", "delivery": "...",
  "process": [{ "title": "PPC / Traffic Acquisition", "text": "..." }],
  "benefits": [{ "title": "...", "text": "..." }],
  "whyUs": ["...","..."], "cta": { "headline": "...", "text": "...", "button": "..." },
  "seo": { "title": "...", "description": "..." } }
```

## article (content/articles/<slug>.json)
```json
{ "slug": "understanding-auto-insurance-call-intent", "title": "...",
  "vertical": "insurance", "subVertical": "auto-insurance", "product": "inbound-calls",
  "excerpt": "...", "featuredImage": "/assets/img/...", "author": "Altarious Global Research",
  "publishedAt": "2026-09-05", "body": "markdown (## H2, ### H3, lists, **bold**, [links](/...))",
  "seo": { "title": "...", "description": "...", "keywords": [] } }
```
Articles relate to a product by (vertical, subVertical, product). The build resolves this relationship
dynamically; cards are never hard-coded. Build fails if an active product has fewer than 2 articles.

## inquiry (D1 table `inquiries`)
id, created_at, full_name, company, email, phone, service_interest, vertical_interest, message,
source_page, source_url, vertical, sub_vertical, product, status (new|contacted|qualified|closed), ip, user_agent, notes.

## media (D1 table `media`)
id, filename, mime, bytes, width, height, alt, data (base64), created_at, created_by.
Uploaded through the admin; referenced from content as `/media/<id>` in `featuredImage` or in article Markdown
(`![alt](/media/<id> "caption")`). Served by `functions/media/[id].js` with immutable cache headers.

## Images on content records
Any record may set `featuredImage`. Resolution order used by the build (`photo()` in `scripts/lib/templates.mjs`):
1. an explicit `featuredImage` (a `/media/...` upload or an `/assets/...` path)
2. the record's own key in `photos.json` (e.g. `auto-insurance`)
3. the parent vertical key (`vertical-insurance`)
4. the built-in SVG fallback
