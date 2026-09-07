# Component placement

Approved: **W2 Signal Terrain** as the site-wide art direction, plus 19 components.
The rule is *earned placement* — a component appears only where it answers a question the visitor
is actually asking on that page. No page carries more than it can justify.

## Art direction — W2 Signal Terrain

The terrain is a system with a preset per page type, not one hero effect:

| Preset | Pages | Character |
|---|---|---|
| `home` | 1 | Tallest, morphs between the three vertical demand shapes |
| `vertical` | 3 | One dominant massif for that vertical |
| `sub` | 35 | Single focused peak, shallow depth |
| `product` | 70 | Ridges organised into routing channels |
| `article` | 140 | Very low amplitude — must never fight body copy |
| `page` | ~10 | Neutral mid amplitude |

## Placement matrix

| Component | Home | Services index | Service page | Verticals | Vertical | Sub-vertical | Product | Article | Case studies | Contact | Resources |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| C1 Anchor rail | | | | | | ● | ● | | | | |
| C2 Coverage grid | | ● | | | ● | | | | | | |
| C3 Product comparison | ● | ● | | | | | ● | | | | |
| C4 Volume calculator | | | ●¹ | | | | ● | | | | |
| C5 Criteria builder | | | | | | ● | ● | | | | |
| C6 Onboarding timeline | | ● | | | | | | | | ● | |
| C7 Buyer marquee | ● | | | | | | | | | | |
| C8 Searchable FAQ | | | | | | ●² | ●² | | | | |
| C9 Commercial models | | ● | ● | | | | | | | ● | |
| C10 Sticky enquiry bar | | | | | | ● | ● | | | | |
| C11 Multi-step enquiry | | | | | | | | | | ● | |
| C12 Call-us widget | | | | | | | ● | | | ● | |
| C13 Key takeaways | | | | | | | | ● | | | |
| C14 Related rail | | | | | | | | ● | | | |
| C15 Term tooltips | | | | | ● | ● | ● | ● | | | |
| C16 Vertical fact strip | | | | | | ● | | | | | |
| C18 Metric ribbon | | | | | | | | | ● | | |
| C19 Command palette | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| C20 Consent bar | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |

¹ Inbound Calls and Live Transfers service pages only — the two products where volume maths applies.
² Only where the record carries 4+ FAQ entries; fewer than that renders the plain accordion.

## Sync with the already-shipped directions

These were built earlier and must not be duplicated by a new component:

| Existing | Interaction with new components |
|---|---|
| D1 instrumented scroll | Unchanged, site-wide |
| D2 hero sequence | Now runs **over** the terrain rather than a photograph |
| D3 signal path diagram | Stays the process section on product pages; C4 and C5 sit below it, never beside it |
| D4 operations board | Home only. C3 comparison sits after it, so the page goes *what we run* → *which product* |
| D5 vertical explorer | Vertical pages. C2 coverage grid follows it, answering "do you cover me?" |
| D6 transfer visualiser | Live-transfer product pages only |
| D7 spotlight CTA | Unchanged, every CTA band |
| D8 editorial reading mode | Article pages. C13 takeaways go above the body, C14 rail replaces the related grid |
| D9 metrics that build | Home stats band. C18 ribbon is **case studies only**, so the two never appear together |
| D10 page transitions | Unchanged, site-wide |
| Ticker | **Replaced** by C7 buyer marquee on the home page |
| Related article grid (articles) | **Replaced** by C14 rail |
| Contact form | **Replaced** by C11 multi-step; product pages keep the single-step form |

## Deliberately not used

- **C17 before/after slider** — not approved.
- C4 on 140 article pages, C2 on every page, C18 alongside D9: all rejected as repetition.


## CMS-controlled data (nothing on the site is invented)

Every figure, row and label a widget displays comes from `content/settings.json`, editable at
**Admin → Widgets** (a card per widget) or **Admin → Operational Settings** (the raw record).
Both views write the same single `settings` record.

| Widget | What the admin controls | If left empty |
|---|---|---|
| Coverage map | Per-state status per product (high / active / limited / none) | Section is omitted entirely |
| Results ribbon | The published figures and bar lengths | Section is omitted entirely |
| Operating hours | Timezone, weekday and weekend hours | Widget hides its hours block |
| Delivery activity | Panel label and the rows it cycles | Panel hidden; always labelled illustrative |
| Operations board | Tile labels and values (`auto:verticals` resolves to the real count) | Tile omitted |
| Volume calculator | Slider ranges, defaults and disclaimer | Falls back to shipped defaults |
| Product comparison | Every row of the three-product table | Table omitted |
| Qualification chips | The shared chip list, merged with each sub-vertical's own criteria | Only sub-vertical criteria show |
| Onboarding timeline | Day, title and text per step | Section omitted |
| Commercial models | The three pricing cards and which is recommended | Section omitted |
| Glossary | Term and definition pairs used by the inline tooltips | No tooltips are attached |

Two rules hold everywhere:

1. **A claim about the business only appears once it is entered.** Coverage and results start
   switched off, so the site says nothing about where it delivers or what it achieves until
   someone fills that in.
2. **Derived counts cannot be faked.** Tiles marked `auto:` read the live content — the number of
   verticals or sub-verticals is counted at build time, not typed in.
