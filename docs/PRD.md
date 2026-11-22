# PRD: ListLift — Multi-Tool AI Ecommerce Listing Platform

**Working name:** ListLift (domain availability NOT verified — check before committing) **Version:** 1.0 · 22 Nov 2026 · **Owner:** Founder · **Build tool:** Google Antigravity (AI coding agent) **Language note:** Written in English so the coding agent gets unambiguous specs.

## 0. How to use this document

Put this file in the repo as `docs/PRD.md` and tell the agent: "Follow docs/PRD.md. Build milestone by milestone (Section 17). Do not add any paid service without asking." Items marked **\[VERIFY\]** are facts from third-party sources or memory that must be checked against official docs before building on them.

## 1. Vision, problem, positioning

**One line:** Give a product image, a name, a URL or a category, and get a complete, marketplace-ready listing (title, SKU, short/long description, bullets, tags, SEO meta, attributes) backed by visible competitor evidence, for any major marketplace, in one workflow.

**Problem (real, observable):**

- Writing one good listing by hand takes 20-40 minutes: research competitors, find keywords, fit each marketplace's character limits and required fields.
- Sellers on 2+ marketplaces repeat that work per marketplace because rules differ (title length, tag counts, required attributes).
- Existing AI writers mostly generate text from specs with no visible research and sometimes invent features. Third-party reviews flag generic or inaccurate output.
- Strong tools are Amazon-only, paywalled early, or priced at $29+/month. Marketplace-native AI (Amazon Seller Central, Shopify) is free but locked to its own platform.

**Positioning:** "The only listing tool that shows its homework." Multi-marketplace, evidence-based, claim-safe, generous free tier, public tools that work without signup.

**Non-goals (v1):** image editing/background generation, repricing, inventory sync, ad management, guaranteeing marketplace rank (nobody can; rank also depends on sales velocity, reviews, price, conversion).

## 2. Target users

| Persona | Situation | What they need |
| --- | --- | --- |
| Solo Etsy/Amazon/Shopify seller | 10-300 SKUs, does everything alone | Fast, correct listings; confidence the text fits rules |
| Resellers/dropshippers (incl. India: Flipkart, Meesho, Amazon.in) | Many similar products, thin margins | Bulk output, cheap, local-language |
| Small agency/VA | Writes listings for clients | Bulk CSV, brand voice, shareable client previews |
| Marketplace-curious beginner | Never listed before | Guidance: what is SKU, what are tags, what is required |

## 3. How customers actually profit

No buzzwords; each benefit has a mechanism, a number you can verify, and the feature that delivers it. Figures below are **illustrative assumptions to validate in beta**, not promises.

1. **Time saved = money saved.** Mechanism: research + writing + formatting collapsed into one run; user only reviews. Example: 100 listings × 25 min manual ≈ 42 h; with review-only at \~5 min ≈ 8 h; \~34 h saved. At even $5/h of seller time that is $170 vs a $9 Pro plan. Feature: Listing Studio + bulk CSV.
2. **More search surfaces used.** Mechanism: marketplaces give limited slots (e.g. Etsy allows up to 13 tags, titles have character caps **\[VERIFY\]**). Many sellers leave slots empty or repeat words. Tool fills every slot with distinct, relevant terms taken from competitor data. Feature: Tag/Keyword generator + keyword-gap table. Outcome claimed: *more chances to be found*, not guaranteed rank.
3. **Fewer rejected/suppressed listings.** Mechanism: a linter checks required attributes, length limits, banned/risky words, duplicate keywords before the seller uploads. Feature: Listing Score + validator. Outcome: fewer re-edits and delays.
4. **Sell on more channels with the same effort.** Mechanism: one product input → N marketplace-specific variants + the right CSV template. Feature: Marketplace tabs + export.
5. **Pricing context.** Mechanism: price band from the competitor set shown next to the listing (min/median/max). Feature: Competitor Compare. Outcome: avoids obvious under/over-pricing.
6. **Lower tool cost.** Competitors' entry paid plans are around $29/month; ListLift's free tier covers a hobby seller and Pro targets $9-12.
7. **Trust.** Every factual claim in the generated copy links to the user's input or to a cited source; ungrounded claims are flagged, protecting sellers from false advertising complaints.

**Where the value comes from (honest):** ListLift saves labour and reduces errors. It does not create demand. Marketing copy must say "improves your chances" never "guaranteed #1".

## 4. Product scope: the multi-tool suite

Every tool is (a) a standalone public page that works without signup (SEO + acquisition), and (b) a module inside the logged-in app sharing the same engine.

### 4.1 Launch tools (MVP)

| Tool | Input | Output | Why it exists |
| --- | --- | --- | --- |
| **Listing Studio** (flagship) | Image and/or name, URL, category, target marketplaces, language | Full listing per marketplace, score, evidence, exports | Core promise |
| Title Generator + Checker | Product facts or existing title, marketplace | 5 title options, live char/limit meter, keyword coverage | Highest-volume search intent |
| Description + Bullets Generator | Facts, tone | Short/long description, bullet points | Common need |
| Tags/Keywords Generator | Product, marketplace | Tag set that fits slot and length rules | Etsy/eBay-style sellers |
| SKU Generator | Brand, category, attributes, pattern | Consistent SKUs, duplicate check in batch | Under-served, easy win |
| Listing Score (Linter) | Paste existing listing | 0-100 score, fix list, one-click rewrite | Hooks users who already have listings |
| Competitor Compare | 2-10 product URLs or pasted listings | Matrix: titles, keywords, attributes, price band, gaps | Evidence engine, standalone value |
| Character Counter / Limit Checker | Text, marketplace | Pass/fail per field | Pure SEO + utility |

### 4.2 Phase 2 tools

Bulk CSV (50-500 rows), image alt-text + filename generator, schema.org Product JSON-LD generator, localizer/translator, meta title/description generator, FAQ generator for product pages, price band analyzer, brand voice profiles.

### 4.3 Phase 3

Chrome extension (read a live listing, score it), Shopify app, Etsy/eBay draft push via OAuth, public API, MCP server.

## 5. Flagship flow: Listing Studio (detailed spec)

**Inputs (any combination, at least one):**

- Image (camera, gallery, drag-drop, clipboard paste; client resizes to max 1024 px WebP before upload).
- Product name or free text.
- URL(s): product pages the user likes (own or competitor).
- Category (searchable list).
- Target marketplaces (multi-select chips), language/locale, tone (neutral, premium, playful), optional brand name and hard facts (material, size, quantity) that the AI must not alter.

**Pipeline (each step visible to the user as a progress timeline):**

1. **Identify:** vision model returns structured attributes (type, material, colour, use case, probable category, confidence). Low confidence → ask the user to confirm (max 2 chips questions).
2. **Plan queries:** 3-5 search queries + marketplace-specific query forms.
3. **Collect:** (a) URLs the user gave, (b) search API results, (c) official marketplace APIs where available (Phase 2). Prefer structured data (schema.org JSON-LD, OpenGraph) over HTML scraping. Respect robots.txt and site terms.
4. **Normalise + cluster:** dedupe near-identical listings, keep top N (default 8, Pro 15).
5. **Analyse:** keyword frequency, title patterns, attribute coverage, price band, gaps (terms competitors use that the user's input lacks).
6. **Generate:** per marketplace using that marketplace's **skill** (Section 6), JSON-schema output.
7. **Validate + score:** hard rules (limits, required fields) and soft rules (keyword coverage, readability, duplicates, ungrounded claims).
8. **Present + export.**

**Outputs per marketplace:** title (+2 alternates), SKU, short description, long description, bullets, search terms/tags, category suggestion, attributes table, SEO meta (for own store), alt-text suggestions, score with checklist, evidence panel (sources, keyword gap, price band).

**Edge cases:** blurry/non-product image → friendly retry message; image of branded item → warn about trademark/authenticity claims; restricted categories (weapons, supplements, adult, medical) → show a compliance notice and avoid prohibited claims; no competitors found → generate from input only and say so; provider outage → fallback model, then queue with ETA.

## 6. Marketplace "skills" (rules engine)

Each marketplace is a versioned file in `packages/skills/<marketplace>.json` (+ a short markdown prompt file). Rules are data, not hidden in prompts.

```json
{
  "marketplace": "etsy",
  "version": "2026-11-22",
  "last_verified": "2026-11-22",
  "source_docs": ["<official URL>"],
  "fields": {
    "title": {"max": 140, "required": true},
    "tags": {"count_max": 13, "each_max": 20},
    "description": {"required": true}
  },
  "banned_patterns": [],
  "style_notes": "front-load the main keyword; no keyword repetition",
  "export_template": "etsy_csv_v1"
}
```

Starting values from third-party sources, **\[VERIFY\] against official docs before shipping**: Etsy title ≤140 and 13 tags of ≤20 characters; Amazon title \~200 characters (varies by category); Shopify SEO title ≤60 and meta description ≤160 (best-practice guidance, not a hard limit); TikTok Shop title ≤255; Lazada/Shopee title ≤120.

**Launch marketplaces (8):** Amazon, Etsy, eBay, Shopify, Walmart, Flipkart, Meesho, Shopee/Lazada. **Next:** Noon, Mercado Libre, Trendyol, TikTok Shop, WooCommerce.

**Maintenance:** a scheduled Worker (cron) fetches each source doc URL weekly, hashes content and, on change, opens an admin notice with a diff. A human updates the skill; rules are never auto-edited by an LLM.

## 7. UX and navigation

**Principles:** mobile-first (design at 360 px, scale up), one primary action per screen, no dead ends, results shareable in two taps, fast first interaction (try before sign-up).

**Information architecture:**

- Marketing site: Home, Tools (grouped by function and marketplace), Pricing, Guides (blog), Sign in.
- App (after sign-in): bottom tab bar on mobile (Studio · Tools · History · Account), left sidebar on desktop.
- Global **command palette** (Ctrl/Cmd+K, and a search icon on mobile) to jump to any tool.
- Breadcrumbs on every public page (also helps SEO).

**Home page structure (conversion + SEO):** hero with an embedded working demo (upload or type, get a real result without account), 3-step "how it works", tool grid, "what you see that others don't" (evidence panel screenshot), pricing teaser, FAQ (with FAQ schema), disclaimer footer ("Not affiliated with Amazon, Etsy, etc."; use text names, no logos).

**Result screen (Listing Studio):**

- Sticky top: marketplace chips (swipe on mobile) + overall score gauge.
- Stacked field cards (Title, SKU, Short description, Long description, Bullets, Tags, Attributes, SEO meta). Each card: live character meter (ring), copy button (one tap, haptic/toast feedback), inline edit, regenerate, "Why?" popover showing the evidence behind the wording.
- Collapsible **Evidence** section: sources list, keyword gap table, price band, title patterns.
- Sticky bottom action bar (thumb zone): **Copy all · Export · Share**.

**Sharing (important to the brief):**

1. Per-field copy and "Copy all (formatted for \<marketplace>)".
2. Export: marketplace CSV template, JSON, PDF, plain text.
3. **Share link** `/l/{slug}`: read-only public page, `noindex` by default, with copy buttons so a client/teammate can paste into their marketplace. Expiry options (24 h, 7 d, never).
4. Web Share API on mobile (WhatsApp, email, etc.) and QR code on desktop.
5. Phase 3: push as draft to Shopify/Etsy/eBay through OAuth. Until then, each export screen shows a short "how to upload this on \<marketplace>" guide.

**Accessibility:** WCAG 2.2 AA contrast, 44×44 px touch targets, full keyboard support, focus rings, `prefers-reduced-motion` respected, labelled form fields, screen-reader announcements for progress.

## 8. Design system ("calm premium")

**Feel:** quiet, confident, spacious. Ink-dark backgrounds with an indigo glow for the brand moment; clean white surfaces for work screens; emerald for "proof/score" so green always means "verified".

**Colour tokens (CSS variables; light / dark):**

| Token | Light | Dark |
| --- | --- | --- |
| bg | #F7F8FB | #0B0D12 |
| surface | #FFFFFF | #12151C |
| elevated | #FFFFFF + shadow | #181C25 |
| text | #0F172A | #E8EAF0 |
| muted | #64748B | #98A2B3 |
| border | #E5E7EB | #232834 |
| primary | #5B5BF7 | #7C7CFF |
| primary-gradient | #5B5BF7 → #8B5CF6 | same |
| success (proof) | #12B981 | #34D399 |
| warning | #F59E0B | #FBBF24 |
| danger | #EF4444 | #F87171 |

Default follows system theme; manual toggle stored in a cookie.

**Typography:** headings Sora or Plus Jakarta Sans, UI Inter (variable), mono JetBrains Mono for SKUs/counters. All fonts self-hosted (OFL licences), `font-display: swap`, subset to Latin + Devanagari; limit to 2 weights per family loaded.

**Shape and depth:** 4 px spacing scale; radii 12 / 16 / 24; soft layered shadows; borders over heavy shadows in dark mode; glass blur only on the sticky header.

**Motion and smooth scrolling:**

- Base: CSS `scroll-behavior: smooth`, anchor offsets via `scroll-margin-top`.
- Marketing pages only: optional Lenis (MIT) for inertia scrolling, lazy-loaded; **never** on app screens, never scroll-jacking, disabled for `prefers-reduced-motion`.
- Page transitions via the browser View Transitions API (Astro client router), 150-250 ms.
- Reveal-on-scroll with IntersectionObserver (translateY 12 px + opacity, 300 ms, `cubic-bezier(.2,.8,.2,1)`), once per element.
- Progress timeline animation during generation; skeleton loaders (no spinners longer than 400 ms).
- Animate only `transform` and `opacity`.

**Core components:** Button (primary/secondary/ghost), Chip, Card, Field card with meter, Score gauge, Tab bar, Bottom sheet, Toast, Dialog, Table (scrolls inside its own container on mobile), Command palette, Empty/Error states, Upload dropzone with camera shortcut.

**Performance budget (hard):** LCP < 2.0 s on mid-range phone over 4G, CLS < 0.05, INP < 200 ms, JS on public pages < 60 KB gzip (Astro islands), images AVIF/WebP with explicit dimensions, no render-blocking third-party scripts (ads load after interaction/idle). Lighthouse targets: Performance ≥ 90, SEO/Accessibility/Best Practices ≥ 95.

## 9. Tech stack (all free-tier; only unavoidable cost is the domain)

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | **Astro** (static pages + React/Preact islands for interactive tools) | Best-in-class SEO and speed; static output needs no adapter and is served from Workers static assets |
| Hosting | **Cloudflare Workers with static assets** | Astro's official guide supports it; static files served from the edge; Worker runs only for dynamic routes (`run_worker_first: ["/api/*"]`) |
| API | **Hono** (TypeScript) in the same Worker | Small, fast, Workers-native |
| Database | **D1** (SQLite) | Relational data, free tier |
| Files | **R2** | Uploaded product images, exports (no egress fees) |
| Orchestration | **Workflows** or **Queues** | The free plan allows few subrequests per invocation, so each pipeline step runs as its own invocation |
| Bot protection | **Turnstile** | Free CAPTCHA alternative |
| Analytics | Cloudflare Web Analytics + own event table | Privacy-friendly, no cookie banner needed for analytics itself |
| AI | **Model router**: Workers AI + external free-tier LLM APIs | See Section 11 |
| Auth | Google OAuth first (free), email link later; use Auth.js or Better Auth with D1 adapter | Avoid paid email at start **\[VERIFY Workers compatibility\]** |
| Validation | Zod; Vitest for tests; Playwright for e2e/a11y | Quality gates |
| Payments | Razorpay / Paddle / Lemon Squeezy / Dodo Payments — pick one that supports an India-based seller **\[VERIFY\]** | Subscriptions + webhooks |

**Free-tier limits that shape the design (verified in Cloudflare docs, Nov 2026):** Workers free = 100,000 requests/day, 10 ms CPU per invocation, 50 subrequests per invocation; Workers AI = 10,000 neurons/day and some models now require the paid plan; D1 free = 5 GB, 5 M rows read/day, 100 K rows written/day, and since 1 Sep 2026 queries **fail** once the daily limit is hit; KV free = only 1,000 writes/day (do **not** use KV for counters or caching writes); R2 free = 10 GB. Headless browser rendering has historically had no free tier **\[VERIFY\]**, so do not depend on it.

**Honest capacity statement:** the free LLM allowance, not the Worker request limit, is the bottleneck. Expect a few hundred to low thousands of generations per day before degradation. Plan for it (Section 11) and upgrade to Workers Paid ($5/month) once revenue covers it.

## 10. Architecture and data

**Routing:** static pages for all public SEO pages; `/api/v1/*` for the Worker; app screens as client-rendered islands behind auth.

**API (all JSON, Zod-validated, rate-limited):**

- `POST /api/v1/identify` (image/text → attributes)
- `POST /api/v1/research` (attributes/URLs → research pack)
- `POST /api/v1/generate` (pack + marketplace → listing)
- `POST /api/v1/score` (listing → score + fixes)
- `POST /api/v1/export` (listing → csv/json/pdf)
- `POST /api/v1/share`, `GET /api/v1/listings/:id`
- `POST /api/webhooks/payments`
- Progress via Server-Sent Events or polling a job id.

**D1 tables (minimum):**

- `users(id, email, plan, locale, created_at)`
- `subscriptions(user_id, provider, status, period_end)`
- `listings(id, user_id?, anon_id?, input_json, marketplace, output_json, score, share_slug?, is_public, created_at)`
- `research_packs(id, key_hash, category, marketplace, locale, data_json, sources_json, created_at, expires_at)`
- `usage_counters(subject, day, tool, count)` (subject = user id or hashed anon id)
- `events(id, name, props_json, created_at)` (keep small; prune after 90 days)

**Images:** stored in R2 under random keys, auto-deleted after 24 h for free/anonymous users via lifecycle rule; saved only if the user saves the listing. Never used for model training; state this in the privacy policy.

**Free-tier write budget:** at \~4 row writes per generation, D1's 100 K writes/day is not the first limit, but batch writes and skip analytics writes under load.

## 11. AI layer and cost control

- **Two-stage models:** cheap model for extraction/identification, stronger model for final copy.
- **Router with fallback:** Workers AI first (choose models available on the free plan), then 1-2 external free-tier APIs. Before using any external free tier, read its current quotas and whether free-tier data may be used for training; if it may, show a notice or avoid sending user-uploaded images **\[VERIFY\]**.
- **Structured output:** JSON schema per tool; auto-repair once, then fail gracefully.
- **Grounding rule:** every factual claim in generated copy must map to an input attribute or a cited source id; unmapped claims are flagged amber in the UI and excluded from "Copy all" unless the user accepts them.
- **Caching:** research packs keyed by (category, marketplace, locale) with 7-14 day TTL in D1; identical requests return cached results. Cached packs double as SEO content ("Etsy keywords for candles").
- **Tiering:** Free = one light research pass using cached packs; Pro = deep research (more sources, official APIs) and bulk.
- **BYOK (bring your own key):** Pro users may plug in their own LLM key so heavy users cost you nothing.
- **Abuse control:** Turnstile on anonymous generation, signed anon cookie + hashed IP counters in D1, daily caps, prompt-injection hygiene (treat fetched pages as untrusted data, strip instructions, never let page text change system rules).
- **Degradation order when quota is low:** serve cache → smaller model → queue with ETA → show "daily free capacity reached, resets at 00:00 UTC" with upgrade/waitlist option.
- **Target unit cost:** ≤ $0.01-0.02 per paid-tier listing so margins hold at $9/month.

## 12. SEO architecture (designed to outrank, not just exist)

**URL map (clean, lowercase, hyphenated):**

- `/tools/` (hub) → `/tools/etsy-title-generator`, `/tools/amazon-bullet-point-generator`, `/tools/sku-generator`, `/tools/listing-score`, `/tools/competitor-compare`
- `/marketplaces/etsy/` (hub per marketplace: rules, limits, guides, tools)
- `/keywords/<category>-<marketplace>` (research packs rendered as public pages, only where real data exists)
- `/guides/<topic>` (long-form how-tos), `/pricing`, `/about`, `/privacy`, `/terms`, `/contact`
- Language folders `/hi/`, `/es/`, `/pt/`, `/id/`… with `hreflang`, added gradually.

**On-page rules:** one H1 per page, tool above the fold, 600-1,200 words of genuinely useful explanation below (rules, examples, mistakes), FAQ with FAQPage schema, `SoftwareApplication` schema on tool pages, `BreadcrumbList`, canonical URLs, XML sitemap split by section, `robots.txt`, internal links between a tool, its marketplace hub and related guides.

**Anti-spam guard:** programmatic pages are generated only when they hold unique, useful data (real research pack, real rules). No thin templated pages; Google's scaled-content-abuse policy applies. Shared listing pages are `noindex`.

**Link and distribution plan:** free embeddable character-counter widget (with attribution link), Product Hunt, value-first posts in seller communities (r/etsysellers, r/FulfillmentByAmazon, r/shopify, Indian seller groups), marketplace rule cheat-sheets people link to, a public "listing teardown" series.

**Technical SEO:** static HTML first, Core Web Vitals budget (Section 8), no layout shift from ad slots (reserve height), image `width/height`, preconnect only to needed origins.

## 13. Monetization

### 13.1 Plans (starting hypotheses; validate with a waitlist before locking)

|  | Free | Pro ($9-12/mo, regional pricing e.g. India ₹) | Business ($24-29/mo) |
| --- | --- | --- | --- |
| Generations | 3/day without signup (1 marketplace), 10/day with account | \~300 listings/month | \~1,500 listings/month |
| Marketplaces per run | 1 (signup: all) | All | All |
| Research depth | Cached packs, light | Deep (more sources, official APIs) | Deep + priority queue |
| Bulk CSV | – | 50 rows | 500 rows |
| History + share links | 7 days | Unlimited | Unlimited |
| Brand voice, BYOK | – | Yes | Yes |
| Seats / API | – | – | 3 seats, API access |
| Ads | Yes (public tool pages only) | No | No |

Annual plans at \~2 months free. Cancel anytime, self-serve.

### 13.2 Google AdSense rules (to avoid account bans and bad UX)

- Apply **after** the site has substantial original content (guide library plus working tools) and required pages: About, Contact, Privacy, Terms. Tool-only sites commonly get "low value content" rejections.
- Ads only on public tool pages and guides, below the primary tool and result area. **Never** in the app dashboard, never next to Copy/Export buttons (accidental clicks violate policy), never inside the results card.
- Manual ad units with reserved heights; load after idle/first interaction; start with auto ads OFF.
- Consent: use a Google-certified consent management platform for EEA/UK/Switzerland traffic **\[VERIFY current requirement\]**; publish `ads.txt`.
- Paid users see no ads.
- Expect low RPM from India-heavy traffic and modest earnings in year one; treat ads as a supplement.

### 13.3 Other revenue

Affiliate links (seller tools, Shopify, design tools) in guides and a "recommended tools" block, clearly labelled; later: agency white-label, API credits.

### 13.4 Break-even and honesty

Fixed cost ≈ domain (\~$10/year). First paid cost trigger: Workers Paid at $5/month. One Pro subscriber covers it. Income from SEO usually takes months; plan for 3-9 months before meaningful organic traffic. No income guarantees in any marketing.

## 14. Legal, privacy, compliance

- **Scraping/ToS:** prefer official APIs, user-supplied URLs, schema.org data and search APIs; obey robots.txt; rate-limit fetches; identify the user agent; do not bypass logins or bot protections. Get legal review before adding bulk marketplace crawling.
- **Trademarks:** disclaimer of non-affiliation; no marketplace logos; warn users against using other brands' names in titles.
- **Privacy:** privacy policy, data retention (images 24 h unless saved), delete-my-data button, GDPR and India DPDP-ready language, no sale of data, no training on user content.
- **AI disclosure:** output is a draft; user must verify facts (the UI states this near Copy all).
- **Prohibited claims:** block medical/health claims, "guaranteed", counterfeit-adjacent wording.
- **Payments:** use a Merchant-of-Record provider if possible to simplify global tax **\[VERIFY\]**.

## 15. Analytics and success metrics

- **Activation:** user completes first listing in session ≥ 60% of tool-page visitors who start.
- **Quality:** thumbs up/down on each output; target ≥ 75% positive; track edit distance of copied text.
- **Retention:** 4-week return rate of signed-in users.
- **Conversion hypothesis:** 2-4% of active free users to paid (benchmark assumption, validate).
- **SEO:** indexed pages, impressions/clicks per tool page, Core Web Vitals pass rate, referring domains.
- **Cost:** AI cost per generation, % requests served from cache, daily capacity utilisation.
- **Reliability:** p95 generation time < 25 s (free), error rate < 2%.

## 16. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Marketplace-native AI (Amazon, Shopify) is free | Multi-marketplace, evidence panel, linter, cross-listing exports |
| Free LLM quota runs out | Cache, tiering, router fallback, BYOK, queue, early Workers Paid upgrade |
| Reverse image search needs paid APIs | v1 uses vision description + text search; exact image matching only as Pro/Phase 2 |
| Hallucinated product claims | Grounding rule, amber flags, user-confirmed facts |
| Scraping blocks/legal issues | Official APIs, user URLs, structured data |
| AdSense rejection | Content-first launch, required pages, policy-safe placement |
| Thin programmatic SEO pages | Publish only pages with unique data; noindex the rest |
| Marketplace rule changes | Versioned skills, weekly doc diff alerts, `last_verified` shown in UI |

## 17. Roadmap, milestones, acceptance criteria

**M0 — Foundation (days 1-3):** monorepo (pnpm), Astro + Hono Worker + D1 + R2 configured with `wrangler.jsonc`, CI deploy, design tokens, base layout, header/footer, dark/light, command palette shell, Lighthouse CI. *Accept:* deploys to `*.workers.dev`; Lighthouse Performance ≥ 90 on home; theme toggle persists.

**M1 — First public tools (week 1):** Character Counter, Title Generator + Checker (Etsy, Amazon, eBay), SKU Generator, skills loader + validator, Turnstile + anon rate limits. *Accept:* all work without login; limits enforced; unit tests for validators; each page passes a11y checks.

**M2 — Listing Studio v1 (weeks 2-3):** text/name input, tags, descriptions, bullets, marketplace tabs, score, exports (copy, CSV, JSON), share link, history, Google login. *Accept:* generate for 4 marketplaces in < 25 s p95; every field respects limits (automated tests); share link opens read-only on mobile.

**M3 — Evidence + image (week 4):** image upload with client resize, identify step, URL ingest with JSON-LD parsing, Competitor Compare, keyword-gap table, research pack cache. *Accept:* evidence panel shows sources; same request twice hits cache; ungrounded claims flagged.

**M4 — Monetization + content (weeks 5-6):** pricing page, payments + webhooks, plan gating, usage counters, 20+ guides, About/Contact/Privacy/Terms, sitemap, schema, consent banner, AdSense slots (OFF until approved). *Accept:* paid flow works end-to-end in test mode; ads absent for paid users; no CLS from slots.

**M5 — Launch (week 7):** waitlist/beta, Product Hunt, community posts, feedback loop.

**Later:** Bulk CSV, more marketplaces/languages, Chrome extension, Shopify app, API.

## 18. Instructions for the Antigravity agent

1. TypeScript strict mode everywhere; Zod for all external input; no `any` without comment.
2. Never commit secrets; use Wrangler secrets/`.dev.vars`; provide `.env.example`.
3. Marketplace rules live only in `packages/skills`; generation code reads them, never hard-codes limits.
4. Every feature ships with tests (Vitest for logic, Playwright for key flows and axe accessibility checks).
5. Enforce the performance budget in CI; fail the build if exceeded.
6. Ask before adding any dependency that is paid, has no free tier, or adds > 30 KB to public pages.
7. Public pages are static; add islands only where interaction is needed.
8. Commit per milestone with a short changelog and a checklist of acceptance criteria met.
9. When a **\[VERIFY\]** item is hit, open the official docs, record the finding and date in `docs/decisions.md`, then continue.

**Suggested repo layout:**

```
/apps/web        Astro site + islands + /api Worker (Hono)
/packages/core   types, zod schemas, validators, scoring
/packages/skills marketplace rule files + prompts
/packages/ui     design tokens + components
/docs            PRD.md, decisions.md
```

## 19. Open decisions (founder to confirm)

1. Final product name and domain (verify availability and trademarks first).
2. Payment provider supporting India-based seller and global buyers.
3. Which 8 marketplaces go first (default list in Section 6).
4. Free vs Pro limits after beta data.
5. Whether to launch the Hindi/Hinglish interface in v1 or v1.1.
